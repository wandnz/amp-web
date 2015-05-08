from pyramid.renderers import get_renderer
from pyramid.view import view_config
from pyramid.security import authenticated_userid
from ampweb.views.common import getCommonScripts, initAmpy

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
    dst = ampy.get_meshes("destination")

    return {
        "title": "AMP Measurements",
        "page": "matrix",
        "body": body,
        "scripts": SCRIPTS,
        "styles": None,
        "logged_in": authenticated_userid(request),
        "srcMeshes": src,
        "dstMeshes": dst,
    }

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
