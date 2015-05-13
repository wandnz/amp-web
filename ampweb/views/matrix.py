from pyramid.renderers import get_renderer
from pyramid.view import view_config
from pyramid.security import authenticated_userid
from ampweb.views.common import getCommonScripts, initAmpy, createGraphClass

def _create_tabs(request):

    tabs = []

    if 'ampweb.matrixtabs' in request.registry.settings:
        chosen = request.registry.settings['ampweb.matrixtabs'].split(',')
    else:
        chosen = ['latency', 'hops', 'http']

    for c in chosen:
        if c == 'latency':
            gc = createGraphClass('amp-latency')
        elif c == 'hops':
            gc = createGraphClass('amp-traceroute-hops')
        elif c == 'http':
            gc = createGraphClass('amp-http')
        elif c == 'throughput':
            gc = createGraphClass('amp-throughput')
        else:
            print "Unknown matrix tab style: %s" % (c)
            continue

        tabs += gc.getMatrixTabs()

    return tabs


@view_config(
    route_name="matrix",
    renderer="../templates/skeleton.pt",
    permission="read",
    http_cache=3600,
)
def matrix(request):
    page_renderer = get_renderer("../templates/matrix.pt")
    body = page_renderer.implementation().macros['body']

    SCRIPTS = getCommonScripts() + [
        "lib/jquery.sparkline.min.js",
        "lib/jquery.ddslick.min.js",
        "pages/matrix.js",
    ]

    ampy = initAmpy(request)
    if ampy is None:
        print "Error starting ampy during matrix request"
        return None

    src = ampy.get_meshes("source")

    return {
        "title": "AMP Measurements",
        "page": "matrix",
        "body": body,
        "scripts": SCRIPTS,
        "styles": None,
        "logged_in": authenticated_userid(request),
        "srcMeshes": src,
        "tabs": _create_tabs(request),
    }

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
