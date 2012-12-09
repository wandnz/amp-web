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
        
    #RETURN
    return {
            "title": "Graphs",
            "body": body,
            "styles": STYLES,
            "scripts": SCRIPTS,
            "sources": sourcesfinal,
            "destinations": destsfinal,
            "enabledest": enabledest,
           }

STYLES = []
SCRIPTS = [
    "graph.js",
    "envision.min.js",
    "grid.js",
]
