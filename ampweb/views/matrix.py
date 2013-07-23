from pyramid.renderers import get_renderer
from pyramid.view import view_config
from ampy import ampdb


@view_config(route_name='home', renderer='../templates/skeleton.pt')
@view_config(route_name='matrix', renderer='../templates/skeleton.pt')

def home(request):
    page_renderer = get_renderer("../templates/matrix.pt")
    body = page_renderer.implementation().macros['body']

    nntschost = request.registry.settings['ampweb.nntschost']
    nntscport = request.registry.settings['ampweb.nntscport']
    NNTSCConn = ampdb.create_nntsc_engine(nntschost, nntscport)
    NNTSCConn.create_parser("amp-icmp")
    src = NNTSCConn.get_selection_options("amp-icmp",
            {"_requesting": "source_meshes"})
    dst = NNTSCConn.get_selection_options("amp-icmp",
            {"_requesting": "destination_meshes"})

    return {
        "title": "AMP Measurements",
        "body": body,
        "scripts": SCRIPTS,
        "styles": STYLES,
        "srcMeshes": src,
        "dstMeshes": dst,
    }

SCRIPTS = [
    "datatables-1.9.4.js",
    "datatables.fnReloadAjax.js",
    "jquery-ui-1.9.2.js",
    "URI.js",
    "util.js",
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
