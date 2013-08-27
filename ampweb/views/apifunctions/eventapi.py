from ampy import ampdb
import ampweb.views.eventlabels as eventlabels
import time

def count_events(conn, start, end):
    groups = conn.get_event_groups(start, end)

    # 30 minute bins, every bin must be present, even if empty
    binsize = 60 * 30
    bin_count = 0
    binstart = 0
    result = []

    # fetch all the data now - there shouldn't be a lot of it and
    # it makes it much easier to check it all.
    # TODO Could do something smarter that means we don't have to
    # check through the whole data list every time, but this works
    # for now
    events = []
    event_ids = []
    for group in groups:
        group_events = conn.get_events_in_group(group["group_id"])
        for group_event in group_events:
            # avoid counting events twice if they have multiple groups
            if group_event["event_id"] not in event_ids:
                events.append(group_event)
    # loop across the whole bin space, looking at every bin even if
    # it's possibly empty - we still need to put a zero there.
    while binstart < end:
        event_count = 0
        # figure out when the current bin starts and ends
        binstart = start + (bin_count * binsize)
        binend = binstart + binsize

        for event in events:
            # count each event that fits within this bin
            ts = time.mktime(event["event_time"].timetuple())
            if ts >= binstart and ts < binend:
                event_count += 1
        result.append([binstart * 1000, event_count])
        bin_count += 1
    return result

def count_sources(conn, key, start, end):
    groups = conn.get_event_groups(start, end)
    sites = {}
    for group in groups:
        events = conn.get_events_in_group(group["group_id"])
        # count this event for the source or target
        for event in events:
            if event[key] in sites:
                sites[event[key]] += 1
            else:
                sites[event[key]] = 1
    # massage the dict into a list of objects that we can then sort
    # by the number of events. This seems a bit convoluted.
    result = []
    for site,count in sites.items():
        result.append({"site": site, "count": count})
    result.sort(lambda x,y: y["count"] - x["count"])
    return result

def find_groups(conn, start, end):
    data = conn.get_event_groups(start, end)

    groups = []
    for group in data:
        # build the label describing the event group
        label = group["group_start_time"].strftime(
                "%H:%M:%S %A %B %d %Y")
        label += " (%s, %s)" % (
                eventlabels.get_site_count_label(
                    group["group_site_count"]),
                eventlabels.get_event_count_label(
                    group["group_event_count"])
                )

        # get all the events in the event group ready for display
        group_events = conn.get_events_in_group(group["group_id"])
        events = []
        for event in group_events:
            # insert most recent events at the front of the list
            events.insert(0, {
                "label": eventlabels.get_event_label(event),
                "description": event["event_description"],
                "href": eventlabels.get_event_href(event),
            })

        # add the most recent event groups at the front of the list
        groups.insert(0, {
                "id": group["group_id"],
                "label": label,
                "events": events,
        })

    return groups

def event(request):
    """ Internal event fetching API """
    start = None
    end = None
    result = []
    urlparts = request.matchdict['params']
    eventdb = request.registry.settings['ampweb.eventdb']
    if 'ampweb.eventhost' in request.registry.settings:
        eventhost = request.registry.settings['ampweb.eventhost']
    else:
        eventhost = None
    
    if 'ampweb.eventpwd' in request.registry.settings:
        eventpwd = request.registry.settings['ampweb.eventpwd']
    else:
        eventpwd = None

    if 'ampweb.eventuser' in request.registry.settings:
        eventuser = request.registry.settings['ampweb.eventuser']
    else:
        eventuser = None


    conn = ampdb.create_netevmon_engine(eventhost, eventdb, eventpwd, eventuser)

    # if it's only 4 parts then assume it's a statistic, a start time and an
    # end time, and that we are only after high level statistics, not the
    # individual events
    if len(urlparts) == 4:
        start = int(urlparts[2])
        end = int(urlparts[3])

        # count of events over the time period, currently with fixed 30m bins
        if urlparts[1] == "count":
            return count_events(conn, start, end)

        # per source/target event counts for the time period, for bar graphs
        if urlparts[1] == "source" or urlparts[1] == "target":
            key = "%s_name" % urlparts[1]
            return count_sources(conn, key, start, end)

        if urlparts[1] == "groups":
            return find_groups(conn, start, end)

    # if it didn't match any of the short forms, then it has to be a longer
    # url with more information or it is invalid.
    if len(urlparts) < 4:
        return {}

    try:
        datatype = urlparts[1]
        stream = int(urlparts[2])
        start = int(urlparts[3])
        end = int(urlparts[4])
    except IndexError:
        pass

    data = conn.get_stream_events(stream, start, end)

    for datapoint in data:
        result.append({
            "metric_name": datapoint["metric_name"],
            "description": datapoint["event_description"],
            "severity": datapoint["severity"],
            "ts": datapoint["timestamp"] * 1000,
        })
    return result

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :