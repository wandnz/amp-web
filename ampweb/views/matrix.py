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

    ampconfig = {}
    if 'ampweb.ampdbhost' in request.registry.settings:
        ampconfig['host'] = request.registry.settings['ampweb.ampdbhost']
    if 'ampweb.ampdbuser' in request.registry.settings:
        ampconfig['user'] = request.registry.settings['ampweb.ampdbuser']
    if 'ampweb.ampdbpwd' in request.registry.settings:
        ampconfig['pwd'] = request.registry.settings['ampweb.ampdbpwd']

    NNTSCConn = ampdb.create_nntsc_engine(nntschost, nntscport, ampconfig)
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
    "lib/datatables-1.9.4.js",
    "lib/datatables.fnReloadAjax.js",
    "lib/jquery-ui-1.9.2.js",
    "lib/URI.js",
    "lib/jquery-cookie.js",
    "lib/EventHelpers.js",
    "lib/cssQuery-p.js",
    "lib/sylvester.js",
    "lib/textShadow.js",
    "lib/cssSandpaper.js",
    "lib/jquery.sparkline.min.js",
    "lib/jquery.ddslick.min.js",
    "matrix.js",
    "util.js",
]
STYLES = [
    "matrixStyles.css",
    "jquery-ui.css",
]

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
