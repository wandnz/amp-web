from ampweb.views.common import stripASName
import ampweb.views.eventlabels as eventlabels
import time

def count_events(ampy, start, end):
    """ Count and bin at 1/2 hour intervals the number of events in a period """
    return eventlabels.get_event_timeseries()

def count_sites(ampy, key, start, end, side):
    """ Count the number of events per site in a time period """
    return eventlabels.get_event_sites(ampy)


def find_groups(ampy, start, end):
    """ Get all the event groups within a time period """
    data = ampy.get_event_groups(start, end)
    if data is None:
        print "Error while fetching event groups"
        return None

    groups = []
    groups,_,_ = eventlabels.parse_event_groups(ampy, data)

    return groups

def event(ampy, request):
    """ Internal event fetching API """
    start = None
    end = None
    result = []
    urlparts = request.matchdict['params']

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

        if urlparts[1] == "groups":
            return find_groups(ampy, start, end)

    # if it didn't match any of the short forms, then it has to be a longer
    # url with more information or it is invalid.
    if len(urlparts) < 4:
        return {}

    try:
        datatype = urlparts[1]
        view_id = urlparts[2]
        start = int(urlparts[3])
        end = int(urlparts[4])
    except IndexError:
        return {}
    except ValueError:
        return {}

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
