from pyramid.view import view_config
from pyramid.renderers import get_renderer
from pyramid.security import authenticated_userid
from ampweb.views.common import getCommonScripts, getBannerOptions

@view_config(
    route_name="eventlist",
    renderer="../templates/skeleton.pt",
    permission="read",
)
def eventlist(request):
    """ Basic skeleton for the infinite scrolling event list """
    page_renderer = get_renderer("../templates/eventlist.pt")
    body = page_renderer.implementation().macros["body"]

    eventlist_scripts = getCommonScripts() + [
        "pages/eventlist.js",
    ]

    banopts = getBannerOptions(request)

    return {
            "title": "Event History",
            "page": "eventlist",
            "body": body,
            "styles": None,
            "scripts": eventlist_scripts,
            "logged_in": authenticated_userid(request),
            "show_dash": banopts['showdash'],
            "bannertitle": banopts['title']
           }


# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
