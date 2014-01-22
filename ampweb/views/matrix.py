from pyramid.renderers import get_renderer
from pyramid.view import view_config
from ampy import ampdb

@view_config(route_name='matrix', renderer='../templates/skeleton.pt',
    http_cache=3600)
def matrix(request):
    page_renderer = get_renderer("../templates/matrix.pt")
    body = page_renderer.implementation().macros['body']

    SCRIPTS = [
        "lib/URI.js",
        "lib/jquery-cookie.js",
        "lib/jquery.sparkline.min.js",
        "lib/jquery.ddslick.min.js",
        "matrix.js",
        "lib/bootstrap.min.js",
    ]

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
        "page": "matrix",
        "body": body,
        "scripts": SCRIPTS,
        "styles": None,
        "srcMeshes": src,
        "dstMeshes": dst,
    }

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
