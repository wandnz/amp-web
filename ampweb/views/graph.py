from pyramid.response import Response
from pyramid.view import view_config
from pyramid.renderers import get_renderer
from ampy import ampdb

@view_config(route_name='graph', renderer='../templates/skeleton.pt')
def graph(request):
    page_renderer = get_renderer("../templates/graph.pt")
    body = page_renderer.implementation().macros['body']
    
    #Filtered URL parts
    url = request.matchdict['params']

    #Variables to return
    sourcesfinal = []
    destsfinal = []

    #Get sources
    db = ampdb.create()

    #Get currently selected source
    for source in db.get():
        if len(url) > 0:
            if source == url[0]:
                sourcesfinal.append({"name": source,
                                     "selected": True})
            else:
                sourcesfinal.append({"name": source,
                                     "selected": False})
        else:
            sourcesfinal.append({"name": source,
                                 "selected": False})

    #Get currently selected destination
    enabledest = True
    if len(url) > 0 :
        for destination in db.get(url[0]):
            if len(url) > 1:
                if destination == url[1]:
                    destsfinal.append({"name": destination,
                                       "selected": True})
                else:
                    destsfinal.append({"name": destination,
                                       "selected": False})
            else:
                destsfinal.append({"name": destination,
                                   "selected": False})
    else:
        enabledest = False
        
    
    #Is a graph selected?, If so find the possible start/end times
    graph = "changeGraph();"
    if len(url) > 2:
        if len(url) > 4:
            if len(url) > 6:
                graph = "changeGraph({graph: '" + url[2] + "', specificstart: '" + url[3] + "', specificend: '" + url[4] + "', generalstart: '" + url[5] + "', generalend: '" + url[6] + "'});" 
            else:
                graph = "changeGraph({graph: '" + url[2] + "', specificstart: '" + url[3] + "', specificend: '" + url[4] + "'});"
        else:
            graph = "changeGraph({graph: '" + url[2] + "'});" 
    #RETURN
    return {
            "title": "Graphs",
            "body": body,
            "styles": STYLES,
            "scripts": SCRIPTS,
            "sources": sourcesfinal,
            "destinations": destsfinal,
            "enabledest": enabledest,
            "startgraph": graph,
           }

STYLES = []
SCRIPTS = [
    "graph.js",
    "envision.min.js",
    "grid.js",
    "graphtemplates/latency.js",
    "graphtemplates/loss.js",
]
