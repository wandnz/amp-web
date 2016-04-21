from pyramid.security import authenticated_userid
from ampweb.views.common import stripASName, DEFAULT_EVENT_FILTER
from ampweb.views.eventparser import EventParser
import time
import json

AS_PAGE_SIZE=30
EP_PAGE_SIZE=20

def count_events(ampy, start, end):
    """ Count and bin at 1/2 hour intervals the number of events in a period """
    evparser = EventParser(ampy)
    return evparser.get_event_timeseries()

def count_sites(ampy, key, start, end, side):
    """ Count the number of events per site in a time period """
    evparser = EventParser(ampy)
    return evparser.get_event_sites()


def find_groups(ampy, evfilter, start, end, already):
    """ Get all the event groups within a time period """
    data = ampy.get_event_groups(start, end)
    if data is None:
        print "Error while fetching event groups"
        return None

    evparser = EventParser(ampy)
    groups,total,_,earliest = evparser.parse_event_groups(data, start, end,
            evfilter, False, already)

    return {'groups': groups, 'total': total, 'earliest': earliest}

def find_common_events(ampy, start, end, maxstreams=5):
    evparser = EventParser(ampy);
    return evparser.get_common_streams(maxstreams)

def event(ampy, request):
    """ Internal event fetching API """
    start = None
    end = None
    result = []
    urlparts = request.matchdict['params']
    username = authenticated_userid(request)

    if urlparts[1] == "filters":
        fname = urlparts[2]

        if username is None:
            return DEFAULT_EVENT_FILTER

        evfilter = ampy.get_event_filter(username, fname)
        if evfilter is None:
            return DEFAULT_EVENT_FILTER

        return json.loads(evfilter[2])

    if urlparts[1] == "changefilter":
        newfilter = request.POST['filter']
        return ampy.modify_event_filter('update', username,
                request.POST['name'], newfilter)

    if urlparts[1] == "aslist":
        params = request.GET
        return ampy.get_matching_asns(params['page'], AS_PAGE_SIZE,
                params['term'])

    if urlparts[1] == "sourcelist":
        params = request.GET
        return ampy.get_matching_sources(params['page'], EP_PAGE_SIZE,
                params['term'])

    if urlparts[1] == "destlist":
        params = request.GET
        return ampy.get_matching_targets(params['page'], EP_PAGE_SIZE,
                params['term'])

    if urlparts[1] == "groups":
        fname = urlparts[2]
        evfilterrow = ampy.get_event_filter(username, fname)

        if evfilterrow is None:
            evfilter = DEFAULT_EVENT_FILTER
        else:
            evfilter = json.loads(evfilterrow[2])

        alreadyfetched = 0
        if len(urlparts) == 4:
            evfilter['starttime'] = int(urlparts[3])
            evfilter['endtime'] = time.time()

        elif len(urlparts) > 4:
            evfilter['endtime'] = int(urlparts[3])
            alreadyfetched = int(urlparts[4])

        elif 'endtime' not in evfilter:
                now = time.time()
                evfilter['endtime'] = now

        if 'starttime' not in evfilter:
            evfilter['starttime'] = evfilter['endtime'] - (2 * 60 * 60)

        return find_groups(ampy, evfilter, evfilter['starttime'],
                evfilter['endtime'], alreadyfetched)

    # if it's only 4 parts then assume it's a statistic, a start time and an
    # end time, and that we are only after high level statistics, not the
    # individual events
    if len(urlparts) == 4:
        start = int(urlparts[2])
        end = int(urlparts[3])

        # count of events over the time period, currently with fixed 30m bins
        if urlparts[1] == "count":
            return count_events(ampy, start, end)

        # per source/target event counts for the time period, for bar graphs
        if urlparts[1] == "asns" or urlparts[1] == "target":
            key = "%s_name" % urlparts[1]
            return count_sites(ampy, key, start, end, urlparts[1])


    # if it didn't match any of the short forms, then it has to be a longer
    # url with more information or it is invalid.
    if len(urlparts) < 4:
        return {}
    

    if urlparts[1] == "commons":
        start = int(urlparts[2])
        end = int(urlparts[3])
        if len(urlparts) == 4:
            return find_common_events(ampy, start, end)
        else:
            return find_common_events(ampy, start, end, int(urlparts[4]))



    try:
        datatype = urlparts[1]
        view_id = urlparts[2]
        start = int(urlparts[3])
        end = int(urlparts[4])
    except IndexError:
        return {}
    except ValueError:
        return {}

    if datatype == "amp-loss":
        datatype = "amp-latency"
        lossfilter = True
    else:
        lossfilter = False

    events = ampy.get_view_events(datatype, view_id, start, end)
    if events is None:
        print "Error while fetching events for view %s" % (view_id)
        return None

    leglabels = ampy.get_view_legend(datatype, view_id)
    if leglabels is None:
        print "Error while fetching legend labels for view %s" % (view_id)
        return None

    groups = {}

    for datapoint in events:

        if 'groupid' not in datapoint or datapoint['groupid'] is None:
            streamlabel = None
        else:
            streamlabel = None
            for ll in leglabels:
                if ll['group_id'] == datapoint['groupid']:
                    streamlabel = ll['label']
                    break
           
        if lossfilter and "Loss Event" not in datapoint["description"]:
            continue

        result.append({ "metric_name": datapoint['metric'],
                        "tooltip": datapoint["description"],
                        "severity": datapoint["magnitude"],
                        "ts": datapoint["ts_started"] * 1000.0,
                        "grouplabel": streamlabel,
                        "detectors": datapoint["detection_count"] 
        })
        
    keys = groups.keys()
    keys.sort()

    for k in keys:
        result.append(groups[k])

    return result

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
