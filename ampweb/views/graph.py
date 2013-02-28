from pyramid.view import view_config
from pyramid.renderers import get_renderer
from ampy import ampdb

@view_config(route_name='graph', renderer='../templates/skeleton.pt')
def graph(request):
    page_renderer = get_renderer("../templates/graph.pt")
    body = page_renderer.implementation().macros['body']

    # Filtered URL parts
    url = request.matchdict['params']

    # Variables to return
    sources = []
    destinations = []

    # Get database
    db = ampdb.create()

    # Get currently selected source
    for source in db.get():
        if len(url) > 0 and source == url[0]:
            sources.append({"name": source, "selected": True})
        else:
            sources.append({"name": source, "selected": False})

    # Get currently selected destination
    enabledest = True
    if len(url) > 0 :
        for destination in db.get(url[0]):
            if len(url) > 1 and destination == url[1]:
                destinations.append({"name": destination, "selected": True})
            else:
                destinations.append({"name": destination, "selected": False})
    else:
        enabledest = False


    # Is a graph selected?, If so find the possible start/end times
    startgraph = "changeGraph();"
    if len(url) > 2:
        if len(url) > 4:
            if len(url) > 6:
                startgraph = (
                    "changeGraph({graph: '" + url[2] +
                    "', specificstart: '" + url[3] +
                    "', specificend: '" + url[4] +
                    "', generalstart: '" + url[5] +
                    "', generalend: '" + url[6] + "'});")
            else:
                startgraph = (
                    "changeGraph({graph: '" + url[2] +
                    "', specificstart: '" + url[3] +
                    "', specificend: '" + url[4] + "'});")
        else:
            startgraph = "changeGraph({graph: '" + url[2] + "'});"

    return {
            "title": "Graphs",
            "body": body,
            "styles": STYLES,
            "scripts": SCRIPTS,
            "sources": sources,
            "destinations": destinations,
            "enabledest": enabledest,
            "startgraph": startgraph,
           }

STYLES = []
SCRIPTS = [
    "graph.js",
    "envision.min.js",
    "graphtemplates/latency.js",
    "graphtemplates/loss.js",
    "jquery.sparkline.min.js",
    "history.js",
    "flashcanvas.js",
    "canvas2image.js",
    "grid.js",
    "lite-lines.js",
    "jquery-cookie.js",
    "traceroutemap/raphael.js",
    "traceroutemap/traceroute.map.js",
    "traceroutemap/traceroute.view.js",
]
