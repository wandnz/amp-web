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

    #connect to the ampdb
    db = ampdb.create()

    #default values
    dataType = "latency"
    src = "NZ"
    dst = "NZ"

    if url is not None:
        if len(url) >= 1:
            #check test type
            if url[0] in ("latency", "loss", "hops", "mtu"):
                dataType = url[0]
                #check valid src
                if len(url) > 1:
                    #check the URL value against a list of node groups
                    #check valid dst
                    if len(url) > 2: 
                        #check the URL value against a list of node groups
                        pass

    # Fetch all available sources and destinations in the desired mesh.
    srcList = db.get_sources(mesh=src)
    dstList = db.get_destinations(mesh=dst)

    return {
        "title": "Amp Grid",
        "body": body, 
        "scripts": SCRIPTS, 
        "styles": STYLES, 
        "srcList": srcList, 
        "dstList": dstList,
        "dataType": dataType,
        "src": src,
        "dst": dst
    }

SCRIPTS = [
    "datatables-1.9.4.js",
    "datatables.fnReloadAjax.js",
    "jquery-ui-1.9.2.js",
    "URI.js",
    "matrix.js"
]
STYLES = [
    "matrixStyles.css",
    "jquery-ui.css",
    "yui3-reset-min.css"
]
