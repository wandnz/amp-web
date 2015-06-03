from ampweb.views.collections.rrdsmokeping import RRDSmokepingGraph
from ampweb.views.collections.rrdmuninbytes import RRDMuninbytesGraph
from ampweb.views.collections.amptraceroute import AmpTracerouteGraph
from ampweb.views.collections.amptraceroute import AmpAsTracerouteGraph
from ampweb.views.collections.amplatency import AmpIcmpGraph, AmpDnsGraph
from ampweb.views.collections.amplatency import AmpTcppingGraph
from ampweb.views.collections.amphttp import AmpHttpGraph
from ampweb.views.collections.lpi import LPIBytesGraph, LPIUsersGraph
from ampweb.views.collections.lpi import LPIFlowsGraph, LPIPacketsGraph

import datetime, re

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

def pretty_print_asns(ampy, groupval):

    asns = groupval.split('-')
    asnames = ampy.get_asn_names(asns)

    if asnames is None:
        return 'ASNs ' + asns.join(' and ')

    pp = ""
    for a in asns:
        # Dirty hackery to try and get a nice name to print
        # XXX May not always work for all AS names :/

        # An AS name is usually something along the lines of:
        # ABBREVIATED-NAME Detailed nicer name,COUNTRY

        # There can be a few extra characters between the abbreviated name
        # and the detailed name.
        # (example: CACHENETWORKS - CacheNetworks, Inc.,US)

        if a not in asnames:
            if a == asns[-1]:
                pp += "AS%s" % (a)
            else:
                pp += "AS%s" % (a) + " | "
            continue

        # First step, remove the abbreviated name and any extra cruft before
        # the name we want.
        regex = "[A-Z0-9\-]+ \W*(?P<name>[ \S]*)$"
        parts = re.match(regex, asnames[a])
        if parts is None:
            if a == asns[-1]:
                pp += "AS%s" % (a)
            else:
                pp += "AS%s" % (a) + " | "

            continue

        # A detailed name can have multiple commas in it, so we just want to
        # find the last one (i.e. the one that preceeds the country.
        # XXX Are all countries 2 letters? In that case, we would be better off
        # just trimming the last 3 chars.
        k = parts.group('name').rfind(',')
        
        if a == asns[-1]:
            pp += parts.group('name')[:k]
        else:
            pp += parts.group('name')[:k] + " | "

    return pp

def parse_event_groups(ampy, data):
    groups = []

    for group in data:
        # build the label describing roughly what the event group contains
        dt = datetime.datetime.fromtimestamp(group["ts_started"])
        label = dt.strftime("%H:%M:%S %A %B %d %Y")

        if group['grouped_by'] == 'asns':
            label += " %s detected for %s" % ( \
                    get_event_count_label(group["event_count"]),
                    pretty_print_asns(ampy, group['group_val']))
        else:
            label += " %s detected for %s %s" % ( \
                    get_event_count_label(group["event_count"]),
                    group['grouped_by'], group['group_val'])

        # get all the events in the event group ready for display
        group_events = ampy.get_event_group_members(group["group_id"])
        events = []
        for event in group_events:
            streamprops = ampy.get_stream_properties(event['collection'], event['stream'])
            # insert most recent events at the front of the list
            events.insert(0, {
                "label": get_event_label(event, streamprops),
                "description": event["description"],
                "href": get_event_href(event),
            })

        # add the most recent event groups at the front of the list
        groups.insert(0, {
                "id": group["group_id"],
                "label": label,
                "events": events,
        })
    return groups


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
