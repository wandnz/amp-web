from pyramid.view import view_config
from pyramid.renderers import get_renderer
from ampy import ampdb
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
    eventdb = request.registry.settings['ampweb.eventdb']
    if 'ampweb.eventhost' in request.registry.settings:
        eventhost = request.registry.settings['ampweb.eventhost']
    else:
        eventhost = None

    if 'ampweb.eventuser' in request.registry.settings:
        eventuser = request.registry.settings['ampweb.eventuser']
    else:
        eventuser = None

    if 'ampweb.eventpwd' in request.registry.settings:
        eventpwd = request.registry.settings['ampweb.eventpwd']
    else:
        eventpwd = None

    conn = ampdb.create_netevmon_engine(eventhost, eventdb, eventpwd, eventuser)
    # assume there won't be too many events that doing fetchall() is bad
    data = conn.get_event_groups(start, end).fetchall()

    groups = []
    total_event_count = 0
    total_group_count = 0

    # count global event/group statistics
    for group in data:
        total_group_count += 1
        total_event_count += group["group_event_count"]

    # get extra information about the 10 most recent event groups
    for group in data[-10:]:
        # build the label describing roughly what the event group contains
        label = group["group_start_time"].strftime("%H:%M:%S %A %B %d %Y")
        label += " (%s, %s)" % (
                eventlabels.get_site_count_label(group["group_site_count"]),
                eventlabels.get_event_count_label(group["group_event_count"])
                )

        # get all the events in the event group ready for display
        group_events = conn.get_events_in_group(group["group_id"])
        events = []
        for event in group_events:
            # insert most recent events at the front of the list
            events.insert(0, {
                "label": eventlabels.get_event_label(event),
                "description": event["type_name"] + ": " + event["event_description"],
                "href": eventlabels.get_event_href(event),
            })

        # add the most recent event groups at the front of the list
        groups.insert(0, {
                "id": group["group_id"],
                "label": label,
                "events": events,
        })

    dashboard_scripts = [
        "lib/envision.min.js",
        "lib/canvas2png.js",
        "lib/grid.js",
        "dashboard.js",
        "eventgroups.js",
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
