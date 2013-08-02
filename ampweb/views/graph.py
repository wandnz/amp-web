from pyramid.view import view_config
from pyramid.renderers import get_renderer
from ampy import ampdb
from ampweb.views.collections.rrdsmokeping import RRDSmokepingGraph
from ampweb.views.collections.rrdmuninbytes import RRDMuninbytesGraph
from ampweb.views.collections.ampicmp import AmpIcmpGraph
from ampweb.views.collections.lpi import LPIBytesGraph, LPIUsersGraph
from ampweb.views.collections.lpi import LPIFlowsGraph, LPIPacketsGraph

STYLES = []
NNTSCConn = None

def generateStartScript(funcname, times, graph_type):
    return funcname + "({graph: '" + graph_type + "'});"

def generateGraph(graph, url):
    dropdowns = []

    if len(url) > 1:
        stream = int(url[1])
        streaminfo = NNTSCConn.get_stream_info(stream)
    else:
        stream = -1
        streaminfo = {}

    title = graph.get_default_title()
    dropdowns = graph.get_dropdowns(NNTSCConn, stream, streaminfo)
    startgraph = generateStartScript("changeGraph", url[3:5], url[0])
    page_renderer = get_renderer("../templates/graph.pt")
    body = page_renderer.implementation().macros['body']

    scripts = [ 
        "graph.js",
        "dropdowns/dropdown.js",
        "envision.min.js",
        "util.js",
        "events.js",
        "jquery.sparkline.min.js",
        "history.js",
        "flashcanvas.js",
        "canvas2image.js",
        "grid.js",
        "jquery-cookie.js",
    ]
    scripts += graph.get_javascripts()
   
    return {
            "title": title,
            "body": body,
            "styles": STYLES,
            "scripts": scripts,
            "startgraph": startgraph,
            "dropdowns":dropdowns,
           }

@view_config(route_name='graph', renderer='../templates/skeleton.pt')
def graph(request):
    global NNTSCConn
    page_renderer = get_renderer("../templates/graph.pt")
    body = page_renderer.implementation().macros['body']

    # Filtered URL parts
    url = request.matchdict['params']
    nntschost = request.registry.settings['ampweb.nntschost']
    nntscport = request.registry.settings['ampweb.nntscport']

    if NNTSCConn == None:
        NNTSCConn = ampdb.create_nntsc_engine(nntschost, nntscport)
    

    if len(url) == 0:
        return

    NNTSCConn.create_parser(url[0])

    graphclass = None

    if url[0] == "rrd-smokeping":
        graphclass = RRDSmokepingGraph()
    elif url[0] == "rrd-muninbytes":
        graphclass = RRDMuninbytesGraph()
    elif url[0] == "lpi-bytes":
        graphclass = LPIBytesGraph()
    elif url[0] == "amp-icmp":
        graphclass = AmpIcmpGraph()
    elif url[0] == "lpi-flows":
        graphclass = LPIFlowsGraph()
    elif url[0] == "lpi-packets":
        graphclass = LPIPacketsGraph()
    elif url[0] == "lpi-users":
        graphclass = LPIUsersGraph()

    if graphclass == None:
        return

    return generateGraph(graphclass, url)

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
