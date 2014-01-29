from pyramid.view import view_config
from pyramid.renderers import get_renderer
from pyramid.httpexceptions import *
from ampweb.views.common import connectNNTSC, createGraphClass, \
        graphStyleToCollection, getCommonScripts

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
    "graphpages/cuzviewpage.js",
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

modalscripts = [
    "modals/modal.js",
    "modals/ampicmp_modal.js",
    "modals/amptraceroute_modal.js",
    "modals/ampdns_modal.js",
    "modals/muninbytes_modal.js",
    "modals/smokeping_modal.js",
    "modals/lpiusers_modal.js",
    "modals/lpibase_modal.js",
    "modals/lpiflows_modal.js",
    "modals/lpibytes_modal.js",
    "modals/lpipackets_modal.js",
]

pluginscripts = [
    "graphplugins/selection.js",
    "graphplugins/handles.js",
    "graphplugins/events_overlay.js",
]

typescripts = [
    "graphtypes/events.js",
    "graphtypes/basicts.js",
    "graphtypes/smokeping.js",
    "graphtypes/rainbow.js",
]

def configureNNTSC(request):
    global GraphNNTSCConn

    if GraphNNTSCConn is not None:
        return GraphNNTSCConn

    return connectNNTSC(request)

def generateStartScript(funcname, times, graph_type):
    return funcname + "({graph: '" + graph_type + "'});"

def generateGraph(graph, url):
    title = graph.get_default_title()
    startgraph = generateStartScript("changeGraph", url[3:5], url[0])
    page_renderer = get_renderer("../templates/graph.pt")
    body = page_renderer.implementation().macros['body']

    scripts = getCommonScripts() + [
        "pages/view.js",
    ]

    scripts += pluginscripts
    scripts += stylescripts
    scripts += typescripts
    scripts += pagescripts
    scripts += modalscripts

    return {
            "title": title,
            "page": "view",
            "body": body,
            "styles": None,
            "scripts": scripts,
            "startgraph": startgraph,
           }

@view_config(route_name='eventview', renderer='../templates/skeleton.pt')
def eventview(request):
    
    start = None
    end = None

    # extract the stream id etc from the request so we can rebuild it
    urlparts = request.matchdict["params"]
    if len(urlparts) < 2:
        raise exception_response(404)

    graphstyle = urlparts[0]
    stream = int(urlparts[1])
    if len(urlparts) > 2:
        start = urlparts[2]
    if len(urlparts) > 3:
        end = urlparts[3]

    collection = graphStyleToCollection(graphstyle)

    NNTSCConn = configureNNTSC(request)
    NNTSCConn.create_parser(collection)

    # convert it into a view id, creating it if required
    view_id = NNTSCConn.view.create_view_from_event(collection, stream)

    # call the normal graphing function with the view id
    newurl = "/".join([request.host_url, "view", graphstyle, str(view_id)])
    if start is not None:
        newurl += "/%s" % start
        if end is not None:
            newurl += "/%s" % end

    # send an HTTP 301 and browsers should remember the new location
    return HTTPMovedPermanently(location=newurl)

@view_config(route_name='tabview', renderer='../templates/skeleton.pt')
def tabview(request):
    start = None
    end = None
    
    urlparts = request.matchdict['params']    
    if len(urlparts) < 3:
        raise exception_response(404)

    basecol = urlparts[0]
    view = urlparts[1]
    tabcol = urlparts[2]

    if len(urlparts) > 3:
        start = urlparts[3]
    if len(urlparts) > 4:
        end = urlparts[4]

    NNTSCConn = configureNNTSC(request)
    NNTSCConn.create_parser(basecol)
    NNTSCConn.create_parser(graphStyleToCollection(tabcol))

    view_id = NNTSCConn.view.create_tabview(basecol, view, 
            graphStyleToCollection(tabcol))

    # call the normal graphing function with the view id
    newurl = "/".join([request.host_url, "view", tabcol, str(view_id)])
    if start is not None:
        newurl += "/%s" % start
        if end is not None:
            newurl += "/%s" % end

    # send an HTTP 301 and browsers should remember the new location
    return HTTPMovedPermanently(location=newurl)

@view_config(route_name='streamview', renderer='../templates/skeleton.pt')
def streamview(request):
    start = None
    end = None

    # extract the stream id etc from the request so we can rebuild it
    urlparts = request.matchdict["params"]
    if len(urlparts) < 2:
        raise exception_response(404)

    graphstyle = urlparts[0]
    collection = graphStyleToCollection(urlparts[0])
    stream = int(urlparts[1])
    if len(urlparts) > 2:
        start = urlparts[2]
    if len(urlparts) > 3:
        end = urlparts[3]

    NNTSCConn = configureNNTSC(request)
    NNTSCConn.create_parser(collection)
    # convert it into a view id, creating it if required
    view_id = NNTSCConn.view.create_view_from_stream(collection, stream)

    # call the normal graphing function with the view id
    newurl = "/".join([request.host_url, "view", graphstyle, str(view_id)])
    if start is not None:
        newurl += "/%s" % start
        if end is not None:
            newurl += "/%s" % end

    # send an HTTP 301 and browsers should remember the new location
    return HTTPMovedPermanently(location=newurl)

@view_config(route_name='view', renderer='../templates/skeleton.pt',
    http_cache=3600)
def graph(request):
    urlparts = request.matchdict['params']

    if len(urlparts) == 0:
        raise exception_response(404)

    NNTSCConn = configureNNTSC(request)
    NNTSCConn.create_parser(urlparts[0])

    graphclass = createGraphClass(urlparts[0])

    if graphclass == None:
        raise exception_response(404)

    return generateGraph(graphclass, urlparts)

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
