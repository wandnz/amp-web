from pyramid.renderers import get_renderer
from pyramid.view import view_config
from ampy import ampdb


@view_config(route_name='home', renderer='../templates/skeleton.pt')
@view_config(route_name='matrix', renderer='../templates/skeleton.pt')

def home(request):
    page_renderer = get_renderer("../templates/matrix.pt")
    body = page_renderer.implementation().macros['body']

    db = ampdb.create()

    return {
        "title": "AMP Measurements",
        "body": body,
        "scripts": SCRIPTS,
        "styles": STYLES,
        "srcMeshes": db.get_source_meshes(),
        "dstMeshes": db.get_destination_meshes()
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
    "jquery.ddslick.min.js",
]
STYLES = [
    "matrixStyles.css",
    "jquery-ui.css",
]
