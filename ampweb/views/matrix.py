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

    # TODO: pull the src/dst from the URL? 

    # Get the lists of src & dst meshes
    srcMeshes = db.get_source_meshes()
    dstMeshes = db.get_destination_meshes()

    # Fetch all available sources and destinations in the desired mesh.
    srcList = db.get_sources(mesh=src)
    dstListUntrimmed = db.get_destinations(mesh=dst)
    dstList = []

    for destination in dstListUntrimmed:
        if destination.startswith("ampz-"):
            dstList.append(destination[5:])
        else:
            dstList.append(destination)
            
            
    return {
        "title": "AMP Measurements",
        "body": body, 
        "scripts": SCRIPTS, 
        "styles": STYLES, 
        "srcList": srcList, 
        "dstList": dstList,
        "srcMeshes": srcMeshes,
        "dstMeshes": dstMeshes
    }

SCRIPTS = [
    "datatables-1.9.4.js",
    "datatables.fnReloadAjax.js",
    "jquery-ui-1.9.2.js",
    "URI.js",
    "history.js",
    "jquery-cookie.js",
    "EventHelpers.js",
    "cssQuery-p.js",
    "sylvester.js",
    "textShadow.js",
    "cssSandpaper.js",
    "jquery.sparkline.min.js",
    "matrix.js",
]
STYLES = [
    "matrixStyles.css",
    "yui3-reset-min.css",
    "jquery-ui.css",
]
