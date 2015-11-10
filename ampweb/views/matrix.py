from pyramid.renderers import get_renderer
from pyramid.view import view_config
from pyramid.security import authenticated_userid, has_permission
from ampweb.views.common import getCommonScripts, initAmpy, createMatrixClass
from ampweb.views.common import getBannerOptions, getAuthOptions

def _create_tabs(request):

    tabs = []

    if 'ampweb.matrixtabs' in request.registry.settings:
        chosen = [x.strip() for x in request.registry.settings['ampweb.matrixtabs'].split(',')]
    else:
        chosen = ['latency', 'hops', 'http']

    for c in chosen:
        gc = createMatrixClass(c, None)
        if gc is None:
            print "Unknown matrix tab style: %s" % (c)
            continue

        tabs += gc.getMatrixTabs()

    return tabs


@view_config(
    route_name="matrix",
    renderer="../templates/skeleton.pt",
    # depending on the auth.publicdata configuration option then this will
    # either be open to the public or require the "read" permission
    # permission=
    http_cache=3600,
)
def matrix(request):
    page_renderer = get_renderer("../templates/matrix.pt")
    body = page_renderer.implementation().macros['body']

    SCRIPTS = getCommonScripts() + [
        "lib/jquery.sparkline.min.js",
        "lib/jquery.ddslick.min.js",
        "pages/matrix.js",
        "matrix/basematrix.js",
        "matrix/latencymatrix.js",
        "matrix/hopmatrix.js",
        "matrix/throughputmatrix.js",
        "matrix/httpmatrix.js",
    ]

    ampy = initAmpy(request)
    if ampy is None:
        print "Error starting ampy during matrix request"
        return None

    src = ampy.get_meshes("source")

    banopts = getBannerOptions(request)

    return {
        "title": "AMP Measurements",
        "page": "matrix",
        "body": body,
        "scripts": SCRIPTS,
        "styles": ['bootstrap.min.css'],
        "logged_in": authenticated_userid(request),
        "can_edit": has_permission("edit", request.context, request),
        "show_dash": banopts['showdash'],
        "bannertitle": banopts['title'],
        "srcMeshes": src,
        "tabs": _create_tabs(request),
    }

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
