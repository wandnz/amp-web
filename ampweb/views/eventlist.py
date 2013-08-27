from pyramid.view import view_config
from pyramid.renderers import get_renderer
from ampy import ampdb
import time

STYLES = []

@view_config(route_name="eventlist", renderer="../templates/skeleton.pt")
def eventlist(request):
    """ Basic skeleton for the infinite scrolling event list """
    page_renderer = get_renderer("../templates/eventlist.pt")
    body = page_renderer.implementation().macros["body"]

    # TODO add regular wand styles we like from current dashboard
    # TODO these styles are no longer dashboard specific
    STYLES.append("dashboard.css")

    eventlist_scripts = [
        "lib/envision.min.js",
        "lib/flashcanvas.js",
        "li/canvas2image.js",
        "lib/grid.js",
        "lib/jquery-cookie.js",
        "eventlist.js",
        "eventgroups.js",
        "graphtemplates/event_frequency.js",
    ]

    return {
            "title": "Event History",
            "body": body,
            "styles": STYLES,
            "scripts": eventlist_scripts,
           }


# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
