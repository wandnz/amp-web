from pyramid.response import Response
from pyramid.renderers import get_renderer
from pyramid.view import view_config
from ampy import ampdb


@view_config(route_name='home', renderer='../templates/skeleton.pt')
@view_config(route_name='matrix', renderer='../templates/skeleton.pt')
def home(request):
    page_renderer = get_renderer("../templates/matrix.pt")
    body = page_renderer.implementation().macros['body']

    url = None

    if 'params' in request.matchdict:
        url = request.matchdict['params']

    # Connect to the ampdb
    db = ampdb.create()

    # Default values
    dataType = "latency"
    src = "nz"
    dst = "nz"

    #TODO: pull the src/dst from the URL? 

    # Fetch all available sources and destinations in the desired mesh.
    srcList = db.get_sources(mesh=src)
    dstListUntrimmed = db.get_destinations(mesh=dst)
    dstList = []

    for destination in dstListUntrimmed:
        if destination.startswith("ampz-"):
            dstList.append(destination[5:])
        else:
            dstList.appent(destination)
            
            
    return {
        "title": "Amp Grid",
        "body": body, 
        "scripts": SCRIPTS, 
        "styles": STYLES, 
        "srcList": srcList, 
        "dstList": dstList,
    }

SCRIPTS = [
    "datatables-1.9.4.js",
    "datatables.fnReloadAjax.js",
    "jquery-ui-1.9.2.js",
    "URI.js",
    "matrix.js",
    "history.js"
]
STYLES = [
    "matrixStyles.css",
    "yui3-reset-min.css",
    "jquery-ui.css"
]
