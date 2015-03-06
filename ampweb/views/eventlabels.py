from ampweb.views.collections.rrdsmokeping import RRDSmokepingGraph
from ampweb.views.collections.rrdmuninbytes import RRDMuninbytesGraph
from ampweb.views.collections.amptraceroute import AmpTracerouteGraph
from ampweb.views.collections.amptraceroute import AmpAsTracerouteGraph
from ampweb.views.collections.amplatency import AmpIcmpGraph, AmpDnsGraph
from ampweb.views.collections.amplatency import AmpTcppingGraph
from ampweb.views.collections.amphttp import AmpHttpGraph
from ampweb.views.collections.lpi import LPIBytesGraph, LPIUsersGraph
from ampweb.views.collections.lpi import LPIFlowsGraph, LPIPacketsGraph

import datetime

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
