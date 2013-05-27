from pyramid.view import view_config
from pyramid.renderers import get_renderer
from ampy import ampdb
    
# XXX make these configurable?
nntschost = "prophet"
nntscport = 61234

STYLES = []

def generateStartScript(funcname, times, graph_type):
    startgraph = funcname + "();"
    if len(times) > 0:
        if len(times) > 2:
            if len(times) > 4:
                startgraph = (
                    funcname + "({graph: '" + graph_type +
                    "', generalstart: '" + times[0] +
                    "', generalend: '" + times[1] +
                    "', specificstart: '" + times[2] +
                    "', specificend: '" + times[3] + "'});")
            else:
                startgraph = (
                    funcname + "({graph: '" + graph_type +
                    "', generalstart: '" + times[0] +
                    "', generalend: '" + times[1] + "'});")
        else:
            startgraph = funcname + "({graph: '" + graph_type + "'});"

    return startgraph

def smokeping_graph(url):
    # Variables to return
    sources = []
    destinations = []

    db = ampdb.create_smokeping_engine(nntschost, nntscport)

    # Get currently selected source
    for source in db.get_sources():
        if len(url) > 1 and source == url[1]:
            sources.append({"name": source, "selected": True})
        else:
            sources.append({"name": source, "selected": False})

    # Get currently selected destination
    enabledest = True
    if len(url) > 1 :
        # XXX this is used to build the html, but gets overridden by an
        # ajax query or something it seems, investigate why this is set in so
        # many different places!
        for destination in db.get_destinations(url[1]):
            if len(url) > 2 and destination == url[2]:
                destinations.append({"name": destination, "selected": True})
            else:
                destinations.append({"name": destination, "selected": False})
    else:
        enabledest = False

    # Is a graph selected?, If so find the possible start/end times
    startgraph = generateStartScript("changeGraph", url[3:7], "smokeping")
    page_renderer = get_renderer("../templates/smokeping.pt")
    body = page_renderer.implementation().macros['body']
    smokeping_scripts = [
        "nntscgraph.js",
        "dropdown.js",
        "envision.min.js",
        #"envision.js",
        #"graphtemplates/basicts.js",
        #"graphtemplates/loss.js",
        "graphtemplates/smoke.js",
        "events.js",
        "jquery.sparkline.min.js",
        "history.js",
        "flashcanvas.js",
        "canvas2image.js",
        "grid.js",
        "smokeping.js",
        "jquery-cookie.js",
        "traceroutemap/raphael.js",
        "traceroutemap/traceroute.map.js",
        "traceroutemap/traceroute.view.js",
    ]
    
    return {
            "title": "Graphs",
            "body": body,
            "styles": STYLES,
            "scripts": smokeping_scripts,
            "sources": sources,
            "destinations": destinations,
            "enabledest": enabledest,
            "startgraph": startgraph,
           }

@view_config(route_name='graph', renderer='../templates/skeleton.pt')
def graph(request):
    page_renderer = get_renderer("../templates/graph.pt")
    body = page_renderer.implementation().macros['body']

    # Filtered URL parts
    url = request.matchdict['params']

    if len(url) > 0:
        graph_type = url[0]
    else:
        graph_type = "unknown"

    # Get database
    if graph_type == "smokeping":
        return smokeping_graph(url)
    elif graph_type == "muninbytes":
        pass
    else:
        pass

        #elif graph_type == "muninbytes":
        #    page_renderer = get_renderer("../templates/muninbytes.pt")
        #    body = page_renderer.implementation().macros['body']
        #else:
        #    page_renderer = get_renderer("../templates/graph.pt")
        #    body = page_renderer.implementation().macros['body']



# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
