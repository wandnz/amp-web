from pyramid.view import view_config
from pyramid.renderers import get_renderer
from pyramid.security import authenticated_userid, has_permission
from ampweb.views.common import initAmpy, createGraphClass, getCommonScripts
from ampweb.views.common import getBannerOptions
from operator import itemgetter

@view_config(
    route_name="home",
    renderer="../templates/skeleton.pt",
    permission="read"
)
@view_config(
    route_name="browser",
    renderer="../templates/skeleton.pt",
    permission="read",
)
def browser(request):
    page_renderer = get_renderer("../templates/browser.pt")
    body = page_renderer.implementation().macros["body"]

    banopts = getBannerOptions(request)

    ampy = initAmpy(request)
    if ampy is None:
        print "Failed to start ampy while creating collection browser"
        return None

    collections = []

    nntsccols = ampy.get_collections()

    if 'ampweb.browsercollections' in request.registry.settings:
        chosen = [x.strip() for x in request.registry.settings['ampweb.browsercollections'].split(',')]
    else:
        chosen = []

    for c in nntsccols:
        if len(chosen) > 0 and c not in chosen:
            continue
        graphclass = createGraphClass(c)
        if graphclass != None:
            collections += graphclass.get_browser_collections()

    sortcols = sorted(collections, key=itemgetter('family', 'label'))

    # pyramid.security.has_permission is deprecated from version 1.5, if we
    # upgrade we should be able to use something like:
    #   request.has_permission("edit")

    return {
        "title": "Graph Browser",
        "body": body,
        "styles": ['bootstrap.min.css'],
        "scripts": getCommonScripts(),
        "logged_in": authenticated_userid(request),
        "can_edit": has_permission("edit", request.context, request),
        "bannertitle": banopts['title'],
        "show_dash": banopts['showdash'],
        "collections": sortcols
    }


# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
