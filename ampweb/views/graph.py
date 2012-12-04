from pyramid.response import Response
from pyramid.view import view_config
from pyramid.renderers import get_renderer
from ampy import ampdb

@view_config(route_name='graph', renderer='../templates/skeleton.pt')
def graph(request):
    #Get requested source
    url = request.url
    url = url.split("graph")[1]
    urlparts = url.split("/")
    try:
        urlparts.remove('')
        urlparts.remove('')
    except:
        print ""

    #Variables to return
    sourcesfinal = []
    destsfinal = []

    #Get sources
    db = ampdb.create();

    #Get currently selected source
    for source in db.get():
        if len(urlparts) > 0:
            if source == urlparts[0]:
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
    if len(urlparts) > 0:
        for destination in db.get(urlparts[0]):
            if len(urlparts) > 1:
                if destination == urlparts[1]:
                    destsfinal.append({"name": destination,
                                    "selected": True})
                else:
                    destsfinal.append({"name": destination,
                                    "selected": False})
            else:
                destsfinal.append({"name": destination,
                                   "selected": False})
    else:
        destsfinal.append({"name": "",
                           "selected": False})
        enabledest = False

    page_renderer = get_renderer("../templates/graph.pt")
    body = page_renderer.implementation().macros['body']

    return {
            "title": "Graphs",
            "body": body,
            "sources": sourcesfinal,
            "destinations": destsfinal,
            "enabledest": enabledest,
           }
