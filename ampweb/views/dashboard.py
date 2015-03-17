from pyramid.view import view_config
from pyramid.renderers import get_renderer
from ampweb.views.common import getCommonScripts, initAmpy
import datetime
import time
import eventlabels

@view_config(route_name='home', renderer='../templates/skeleton.pt')
@view_config(route_name="dashboard", renderer="../templates/skeleton.pt")
def dashboard(request):
    """ Generate the content for the basic overview dashboard page """
    page_renderer = get_renderer("../templates/dashboard.pt")
    body = page_renderer.implementation().macros["body"]

    # display events from the last 24 hours
    end = time.time()
    start = end - (60 * 60 * 24)

    ampy = initAmpy(request)
    if ampy is None:
        print "Unable to start ampy while generating event dashboard"
        return None

    data = ampy.get_event_groups(start, end)
    groups = []
    total_event_count = 0
    total_group_count = 0

    # count global event/group statistics
    for group in data:
        total_group_count += 1
        total_event_count += group["event_count"]

    # get extra information about the 10 most recent event groups
    groups = eventlabels.parse_event_groups(ampy, data[-10:])

    dashboard_scripts = getCommonScripts() + [
        "pages/dashboard.js",
        "graphplugins/hit.js",
        "graphstyles/event_frequency.js",
    ]

    return {
            "title": "Event Dashboard",
            "page": "dashboard",
            "body": body,
            "styles": None,
            "scripts": dashboard_scripts,
            "groups": groups,
            "total_event_count": total_event_count,
            "total_group_count": total_group_count,
            "extra_groups": total_group_count - len(groups),
           }


# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
