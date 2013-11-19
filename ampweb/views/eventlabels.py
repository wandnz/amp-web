from ampweb.views.collections.rrdsmokeping import RRDSmokepingGraph
from ampweb.views.collections.rrdmuninbytes import RRDMuninbytesGraph
from ampweb.views.collections.amptraceroute import AmpTracerouteGraph
from ampweb.views.collections.ampdns import AmpDnsGraph
from ampweb.views.collections.ampicmp import AmpIcmpGraph
from ampweb.views.collections.lpi import LPIBytesGraph, LPIUsersGraph
from ampweb.views.collections.lpi import LPIFlowsGraph, LPIPacketsGraph

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

def get_event_label(event):
    """ Properly format the time and description of an event for a label """
    graphclass = None
    
    if event["collector_name"] == "rrd":
        if event["collection_style"] == "smokeping":
            graphclass = RRDSmokepingGraph()
        if event["collection_style"] == "muninbytes":
            graphclass = RRDMuninbytesGraph()

    if event["collector_name"] == "lpi":
        if event["collection_style"] == "bytes":
            graphclass = LPIBytesGraph()
        if event["collection_style"] == "flows":
            graphclass = LPIFlowsGraph()
        if event["collection_style"] == "packets":
            graphclass = LPIPacketsGraph()
        if event["collection_style"] == "users":
            graphclass = LPIUsersGraph()

    if event["collector_name"] == "amp":
        if event["collection_style"] == "dns":
            graphclass = AmpDnsGraph()
        if event["collection_style"] == "icmp":
            graphclass = AmpIcmpGraph()
        if event["collection_style"] == "traceroute":
            graphclass = AmpTracerouteGraph()

    if graphclass == None:
        label = "Unknown: " + event["event_time"].strftime("%H:%M:%S")
        label += " %s " % event["type_name"]
        label += "measured by %s, severity level = %s/100" % \
                (event["source_name"], event["severity"])
        return label

    return graphclass.get_event_label(event)

def get_event_href(event):
    """ Build the link to the graph showing an event """
    start = event["timestamp"] - (3 * 60 * 60)
    end = event["timestamp"] + (1 * 60 * 60)
    if event["collector_name"] == "amp":
        base = "streamview"
    else:
        base = "graph"

    href = "%s/%s-%s/%s/%d/%d" % (base, event['collector_name'], \
            event['collection_style'], event["stream_id"], start, end)
    return href
    

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
