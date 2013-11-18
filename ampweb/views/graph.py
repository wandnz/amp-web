from pyramid.view import view_config
from pyramid.renderers import get_renderer
from pyramid.httpexceptions import *
from ampy import ampdb
from ampweb.views.collections.rrdsmokeping import RRDSmokepingGraph
from ampweb.views.collections.rrdmuninbytes import RRDMuninbytesGraph
from ampweb.views.collections.ampicmp import AmpIcmpGraph
from ampweb.views.collections.amptraceroute import AmpTracerouteGraph
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
    "cuzgraphpage.js",
    "graphpages/rrdsmokeping.js",
    "graphpages/rrdmuninbytes.js",
    "graphpages/ampicmp.js",
    "graphpages/amptraceroute.js",
    "graphpages/lpibytes.js",
    "graphpages/lpiflows.js",
    "graphpages/lpiusers.js",
    "graphpages/lpipackets.js",
]

dropdownscripts = [
    "dropdowns/dropdown.js",
    "dropdowns/dropdown_ampicmp.js",
    "dropdowns/dropdown_amptraceroute.js",
    "dropdowns/dropdown_lpibasic.js",
    "dropdowns/dropdown_lpiuser.js",
    "dropdowns/dropdown_munin.js",
    "dropdowns/dropdown_smokeping.js"
]

libscripts = [
    "lib/envision.min.js",
    #"lib/envision.js",
    "lib/jquery.sparkline.min.js",
    "lib/flashcanvas.js",
    "lib/canvas2image.js",
    "lib/grid.js",
]

def generateStartScript(funcname, times, graph_type):
    return funcname + "({graph: '" + graph_type + "'});"

def generateGraph(graph, url):
    title = graph.get_default_title()
    startgraph = generateStartScript("changeGraph", url[3:5], url[0])
    page_renderer = get_renderer("../templates/graph.pt")
    body = page_renderer.implementation().macros['body']

    scripts = libscripts + [
        "graph.js",
        "util.js",
        "events.js",
        "selection.js",
        "smokeping.js",
        "rainbow.js",
    ]

    scripts += stylescripts
    scripts += pagescripts
    scripts += dropdownscripts

    return {
            "title": title,
            "body": body,
            "styles": None,
            "scripts": scripts,
            "startgraph": startgraph,
           }

@view_config(route_name='graph', renderer='../templates/skeleton.pt')
def graph(request):
    global GraphNNTSCConn

    # Filtered URL parts
    url = request.matchdict['params']
    nntschost = request.registry.settings['ampweb.nntschost']
    nntscport = request.registry.settings['ampweb.nntscport']

    ampconfig = {}
    if 'ampweb.ampdbhost' in request.registry.settings:
        ampconfig['host'] = request.registry.settings['ampweb.ampdbhost']
    if 'ampweb.ampdbuser' in request.registry.settings:
        ampconfig['user'] = request.registry.settings['ampweb.ampdbuser']
    if 'ampweb.ampdbpwd' in request.registry.settings:
        ampconfig['pwd'] = request.registry.settings['ampweb.ampdbpwd']

    if GraphNNTSCConn == None:
        GraphNNTSCConn = ampdb.create_nntsc_engine(nntschost, nntscport,
                ampconfig)

    if len(url) == 0:
        raise exception_response(404)

    GraphNNTSCConn.create_parser(url[0])

    graphclass = None

    if url[0] == "rrd-smokeping":
        graphclass = RRDSmokepingGraph()
    elif url[0] == "rrd-muninbytes":
        graphclass = RRDMuninbytesGraph()
    elif url[0] == "lpi-bytes":
        graphclass = LPIBytesGraph()
    elif url[0] == "amp-icmp":
        graphclass = AmpIcmpGraph()
    elif url[0] == "amp-traceroute":
        graphclass = AmpTracerouteGraph()
    elif url[0] == "lpi-flows":
        graphclass = LPIFlowsGraph()
    elif url[0] == "lpi-packets":
        graphclass = LPIPacketsGraph()
    elif url[0] == "lpi-users":
        graphclass = LPIUsersGraph()

    if graphclass == None:
        raise exception_response(404)

    return generateGraph(graphclass, url)

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
