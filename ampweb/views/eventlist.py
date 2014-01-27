from pyramid.view import view_config
from pyramid.renderers import get_renderer
from ampy import ampdb
import time

@view_config(route_name="eventlist", renderer="../templates/skeleton.pt")
def eventlist(request):
    """ Basic skeleton for the infinite scrolling event list """
    page_renderer = get_renderer("../templates/eventlist.pt")
    body = page_renderer.implementation().macros["body"]

    eventlist_scripts = [
        "lib/envision.min.js",
        "lib/canvas2png.js",
        "graphplugins/grid.js",
        "pages/eventlist.js",
        "graphstyles/event_frequency.js",
    ]

    return {
            "title": "Event History",
            "page": "eventlist",
            "body": body,
            "styles": None,
            "scripts": eventlist_scripts,
           }


# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
