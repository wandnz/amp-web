from ampweb.views.collections.rrdsmokeping import RRDSmokepingGraph
from ampweb.views.collections.rrdmuninbytes import RRDMuninbytesGraph
from ampweb.views.collections.amptraceroute import AmpTracerouteGraph
from ampweb.views.collections.amptraceroute import AmpAsTracerouteGraph
from ampweb.views.collections.amplatency import AmpIcmpGraph, AmpDnsGraph
from ampweb.views.collections.amplatency import AmpTcppingGraph
from ampweb.views.collections.amphttp import AmpHttpGraph
from ampweb.views.collections.lpi import LPIBytesGraph, LPIUsersGraph
from ampweb.views.collections.lpi import LPIFlowsGraph, LPIPacketsGraph

from ampweb.views.common import stripASName

import datetime, re, time

# Is it safe to have these as globals?
event_timeseries = {}
site_counts = {}

def get_site_count_label(site_count):
    """ Properly format the number of sites involved in events for a label """
    if site_count == 1:
        return "1 site"
    return "%d sites" % site_count

def get_event_count_label(event_count):
    """ Properly format the number of events for a label """
    if event_count == 1:
        return "1 event"
    return "%d events" % event_count

def pretty_print_asns(ampy, asns):

    ppasns = []

    asnames = ampy.get_asn_names(asns)

    if asnames is None:
        return ["AS" + x for x in asns]

    for a in asns:
        ppasns.append(stripASName(a, asnames, True))

    return ppasns

def get_event_collection(event):
    graphclass = None

    if event['collection'] == "amp-icmp":
        graphclass = AmpIcmpGraph()
    if event['collection'] == "amp-http":
        graphclass = AmpHttpGraph()
    if event['collection'] == "amp-dns":
        graphclass = AmpDnsGraph()
    if event['collection'] == "amp-tcpping":
        graphclass = AmpTcppingGraph()
    if event['collection'] == "amp-astraceroute":
        graphclass = AmpAsTracerouteGraph()
    if event['collection'] == "amp-traceroute":
        graphclass = AmpTracerouteGraph()

    if event['collection'] == "lpi-bytes":
        graphclass = LPIBytesGraph()
    if event['collection'] == "lpi-packets":
        graphclass = LPIPacketsGraph()
    if event['collection'] == "lpi-flows":
        graphclass = LPIFlowsGraph()
    if event['collection'] == "lpi-users":
        graphclass = LPIUsersGraph()
    
    if event['collection'] == "rrd-smokeping":
        graphclass = RRDSmokepingGraph()
    if event['collection'] == "rrd-muninbytes":
        graphclass = RRDMuninbytesGraph()
    
    if graphclass is None:
        print event

    return graphclass


def get_event_label(event, streamprops):
    """ Properly format the time and description of an event for a label """
    graphclass = get_event_collection(event)
    if graphclass == None:
        dt = datetime.datetime.fromtimestamp(event["ts_started"])
        label = dt.strftime("%H:%M:%S")
        label += "  Unknown collection %s" % (event['collection'])
        if 'source' in event:
            label +=", measured by %s" % (event["source"])
        return label

    return graphclass.get_event_label(event, streamprops)

def get_event_timeseries():
    result = []
    tsbins = event_timeseries.keys()
    tsbins.sort()
    for ts in tsbins:
        result.append([ts * 1000, event_timeseries[ts]])
    return result

def get_event_sites(ampy):
    result = []

    sites = site_counts.keys()
    tooltips = ampy.get_asn_names(sites)

    for s in sites:
        sitename = "AS" + s
        ttip = stripASName(s, tooltips, True)
        result.append({"site": sitename, "count": site_counts[s], \
                "tooltip":ttip})

    result.sort(lambda x, y: y["count"] - x["count"])
    return result
    
    

def parse_event_groups(ampy, data, maxgroups=None):
    global event_timeseries, site_counts
    groups = []

    lastts = 0
    lastgroups = []
    total_event_count = 0
    total_group_count = 0

    currentbin = 0
    binsize = 60 * 30

    event_timeseries = {}
    site_counts = {}

    for group in data:
        group_events = ampy.get_event_group_members(group["group_id"])
    
        # get all the events in the event group ready for display
        events = []
        checkevs = []

        for event in group_events:
            streamprops = ampy.get_stream_properties(event['collection'], event['stream'])
            # insert most recent events at the front of the list
            events.insert(0, {
                "label": get_event_label(event, streamprops),
                "description": event["description"],
                "href": get_event_href(event),
            })

            checkevs.append((event['stream'], event['ts_started']))

        if group['ts_started'] == lastts:
            ind = 0
            mergereq = False
            for lg in lastgroups:
                if checkevs == lg:
                    mergereq = True
                    break
                ind += 1

            if mergereq and group['grouped_by'] == 'asns':
                gval = group['group_val'].split('?')[0]
                asns = gval.split('-')
                
                newasns = list(set(asns) - set(groups[ind]['asns']))
                groups[ind]['asns'] += newasns

                for site in newasns:
                    if site in site_counts:
                        site_counts[site] += group['event_count']
                    else:
                        site_counts[site] = group['event_count']

                continue
            else:
                lastgroups.append(checkevs)
        else:
            lastts = group['ts_started']
            lastgroups = [checkevs]
   
        for ev in checkevs:
            tsbin = event['ts_started'] - (event['ts_started'] % (binsize))
            if tsbin in event_timeseries:
                event_timeseries[tsbin] += 1
            else:
                event_timeseries[tsbin] = 1

        dt = datetime.datetime.fromtimestamp(group["ts_started"])

        if group['grouped_by'] == 'asns':
            # Remove ? sub-division from group_val
            gval = group['group_val'].split('?')[0]
            gval = gval.split('-')
            #gval = pretty_print_asns(ampy, gval)

            for site in gval:
                if site in site_counts:
                    site_counts[site] += group['event_count']
                else:
                    site_counts[site] = group['event_count']
        else:
            gval = group['group_val']


        # add the most recent event groups at the front of the list
        groups.insert(0, {
                "id": group["group_id"],
                "date": dt.strftime("%H:%M:%S %A %B %d %Y"),
                "asns": gval,
                "by": group['grouped_by'],
                #"label": label,
                "events": events,
                "eventcount": len(events),
        })
        total_group_count += 1
        total_event_count += len(events)

    now = time.time()
    nextbin = (now - 86400 - (now % binsize))

    while nextbin <= now:
        if nextbin not in event_timeseries:
            event_timeseries[nextbin] = 0
        nextbin += binsize

    if maxgroups is not None:
        groups = groups[0:maxgroups]

    for g in groups:
        g['asns'] = pretty_print_asns(ampy, g['asns'])

    return groups, total_group_count, total_event_count


def event_tooltip(event):
    graphclass = get_event_collection(event)
    if graphclass == None:
        return "Unknown event"

    return graphclass.get_event_tooltip(event)

def get_event_href(event):
    """ Build the link to the graph showing an event """
    graphclass = get_event_collection(event)
    start = event["ts_started"] - (1.5 * 60 * 60)
    end = event["ts_ended"] + (0.5 * 60 * 60)

    base = "eventview"
    style = graphclass.get_event_graphstyle()

    href = "%s/%s/%s/%d/%d" % (base, style, event["stream"], start, end)
    return href


# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
