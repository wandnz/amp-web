from pyramid.view import view_config
from pyramid.renderers import get_renderer
from pyramid.httpexceptions import *
from ampy import ampdb
from ampweb.views.collections.rrdsmokeping import RRDSmokepingGraph
from ampweb.views.collections.rrdmuninbytes import RRDMuninbytesGraph
from ampweb.views.collections.ampicmp import AmpIcmpGraph
from ampweb.views.collections.amptraceroute import AmpTracerouteGraph
from ampweb.views.collections.ampdns import AmpDnsGraph
from ampweb.views.collections.lpi import LPIBytesGraph, LPIUsersGraph
from ampweb.views.collections.lpi import LPIFlowsGraph, LPIPacketsGraph

GraphNNTSCConn = None

stylescripts = [
    "graphstyles/ticlabels.js",
    "graphstyles/interaction.js",
    "graphstyles/config.js",
    "graphstyles/basicts.js",
    "graphstyles/smoke.js",
    "graphstyles/rainbow.js",
]

pagescripts = [
    "cuzviewpage.js",
    "graphpages/rrdsmokeping.js",
    "graphpages/rrdmuninbytes.js",
    "graphpages/ampicmp.js",
    "graphpages/amptraceroute.js",
    "graphpages/ampdns.js",
    "graphpages/lpibytes.js",
    "graphpages/lpiflows.js",
    "graphpages/lpiusers.js",
    "graphpages/lpipackets.js",
]

dropdownscripts = [
    "dropdowns/dropdown.js",
    "dropdowns/dropdown_ampicmp.js",
    "dropdowns/dropdown_amptraceroute.js",
    "dropdowns/dropdown_ampdns.js",
    "dropdowns/dropdown_lpibasic.js",
    "dropdowns/dropdown_lpiuser.js",
    "dropdowns/dropdown_munin.js",
    "dropdowns/dropdown_smokeping.js"
]

modalscripts = [
    "modals/modal.js",
    "modals/ampicmp_modal.js",
    "modals/amptraceroute_modal.js",
    "modals/ampdns_modal.js",
]

libscripts = [
    "lib/envision.min.js",
    #"lib/envision.js",
    "lib/jquery.sparkline.min.js",
    "lib/flashcanvas.js",
    "lib/canvas2image.js",
    "lib/grid.js",
    "lib/bootstrap.min.js"
]

styles = [
    "bootstrap.min.css"
]

def configureNNTSC(request):
    global GraphNNTSCConn

    if GraphNNTSCConn is not None:
        return GraphNNTSCConn

    nntschost = request.registry.settings['ampweb.nntschost']
    nntscport = request.registry.settings['ampweb.nntscport']

    ampconfig = {}
    if 'ampweb.ampdbhost' in request.registry.settings:
        ampconfig['host'] = request.registry.settings['ampweb.ampdbhost']
    if 'ampweb.ampdbuser' in request.registry.settings:
        ampconfig['user'] = request.registry.settings['ampweb.ampdbuser']
    if 'ampweb.ampdbpwd' in request.registry.settings:
        ampconfig['pwd'] = request.registry.settings['ampweb.ampdbpwd']

    GraphNNTSCConn = ampdb.create_nntsc_engine(nntschost, nntscport, ampconfig)
    return GraphNNTSCConn

def generateStartScript(funcname, times, graph_type):
    return funcname + "({graph: '" + graph_type + "'});"

def generateGraph(graph, url):
    title = graph.get_default_title()
    startgraph = generateStartScript("changeGraph", url[3:5], url[0])
    page_renderer = get_renderer("../templates/graph.pt")
    body = page_renderer.implementation().macros['body']

    scripts = libscripts + [
        "view.js",
        "util.js",
        "events.js",
        "selection.js",
        "smokeping.js",
        "rainbow.js",
    ]

    scripts += stylescripts
    scripts += pagescripts
    scripts += dropdownscripts
    scripts += modalscripts

    return {
            "title": title,
            "body": body,
            "styles": styles,
            #"styles": None,
            "scripts": scripts,
            "startgraph": startgraph,
           }

@view_config(route_name='streamview', renderer='../templates/skeleton.pt')
def streamview(request):
    start = None
    end = None

    # extract the stream id etc from the request so we can rebuild it
    urlparts = request.matchdict["params"]
    if len(urlparts) < 2:
        raise exception_response(404)

    collection = urlparts[0]
    stream = urlparts[1]
    if len(urlparts) > 2:
        start = urlparts[2]
    if len(urlparts) > 3:
        end = urlparts[3]

    NNTSCConn = configureNNTSC(request)
    NNTSCConn.create_parser(collection)
    # convert it into a view id, creating it if required
    view_id = NNTSCConn.view.create_view_from_stream(collection, stream)

    # call the normal graphing function with the view id
    newurl = "/".join([request.host_url, "view", collection, str(view_id)])
    if start is not None:
        newurl += "/%s" % start
        if end is not None:
            newurl += "/%s" % end

    # send an HTTP 301 and browsers should remember the new location
    return HTTPMovedPermanently(location=newurl)

@view_config(route_name='view', renderer='../templates/skeleton.pt')
def graph(request):
    urlparts = request.matchdict['params']

    if len(urlparts) == 0:
        raise exception_response(404)

    NNTSCConn = configureNNTSC(request)
    NNTSCConn.create_parser(urlparts[0])

    graphclass = None

    if urlparts[0] == "rrd-smokeping":
        graphclass = RRDSmokepingGraph()
    elif urlparts[0] == "rrd-muninbytes":
        graphclass = RRDMuninbytesGraph()
    elif urlparts[0] == "lpi-bytes":
        graphclass = LPIBytesGraph()
    elif urlparts[0] == "amp-icmp":
        graphclass = AmpIcmpGraph()
    elif urlparts[0] == "amp-dns":
        graphclass = AmpDnsGraph()
    elif urlparts[0] == "amp-traceroute":
        graphclass = AmpTracerouteGraph()
    elif urlparts[0] == "lpi-flows":
        graphclass = LPIFlowsGraph()
    elif urlparts[0] == "lpi-packets":
        graphclass = LPIPacketsGraph()
    elif urlparts[0] == "lpi-users":
        graphclass = LPIUsersGraph()

    if graphclass == None:
        raise exception_response(404)

    return generateGraph(graphclass, urlparts)

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
