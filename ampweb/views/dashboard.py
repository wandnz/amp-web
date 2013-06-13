from pyramid.view import view_config
from pyramid.renderers import get_renderer
from ampy import ampdb
import time

STYLES = []

def get_site_count_label(site_count):
    """ Properly format the number of sites involved in events for a label """
    if site_count == 1:
        return "1 site"
    return "%d sites" % site_count

def get_event_count_label(event_count):
    """ Properly format the number of events for a label """
    if event_count == 1:
        return "1 event"
    return "%d events" % event_count

def get_event_label(event):
    """ Properly format the time and description of an event for a label """
    if event["collection_style"] == "smokeping":
        return get_smokeping_event_label(event)
    if event["collection_style"] == "muninbytes":
        return get_muninbytes_event_label(event)

def get_smokeping_event_label(event):
    """ Properly format the time and description of a smokeping event """
    label = "Smokeping: " + event["event_time"].strftime("%H:%M:%S")
    label += " %s " % event["type_name"]
    label += "from %s to %s" % (event["source_name"], event["target_name"])
    label += ", severity level = %s/100" % event["severity"]
    return label

def get_muninbytes_event_label(event):
    """ Properly format the time and description of a muninbytes event """
    label = "munin: " + event["event_time"].strftime("%H:%M:%S")
    label += " %s " % event["type_name"]
    label += "from %s to %s" % (event["source_name"], event["target_name"])
    label += ", severity level = %s/100" % event["severity"]
    return label

def get_event_href(event):
    """ Build the link to the graph showing an event """
    if event["collection_style"] == "smokeping":
        return get_smokeping_event_href(event)
    if event["collection_style"] == "muninbytes":
        return get_muninbytes_event_href(event)

def get_smokeping_event_href(event):
    """ Build the link to the graph showing a smokeping event """
    start = event["timestamp"] - (3 * 60 * 60)
    end = event["timestamp"] + (1 * 60 * 60)
    href = "/graph/smokeping/%s/30/%d/%d" % (event["stream_id"], start, end)
    return href

def get_muninbytes_event_href(event):
    """ Build the link to the graph showing a muninbytes event """
    start = event["timestamp"] - (3 * 60 * 60)
    end = event["timestamp"] + (1 * 60 * 60)
    href = "/graph/muninbytes/%s/30/%d/%d" % (event["stream_id"], start, end)
    return href

@view_config(route_name="dashboard", renderer="../templates/skeleton.pt")
def dashboard(request):
    """ Generate the content for the basic overview dashboard page """
    page_renderer = get_renderer("../templates/dashboard.pt")
    body = page_renderer.implementation().macros["body"]

    # display events from the last 24 hours
    end = time.time()
    start = end - (60 * 60 * 24)
    eventdb = request.registry.settings['ampweb.eventdb']
    conn = ampdb.create_netevmon_engine(None, eventdb, None)
    data = conn.get_event_groups(start, end)

    groups = []
    total_event_count = 0
    total_group_count = 0
    for group in data:
        site_count = group["group_site_count"]
        event_count = group["group_event_count"]

        # build the label describing roughly what the event group contains
        label = group["group_start_time"].strftime("%H:%M:%S %A %B %d %Y")
        label += " (%s, %s)" % (
                get_site_count_label(site_count),
                get_event_count_label(event_count)
                )

        # get all the events in the event group ready for display
        group_events = conn.get_events_in_group(group["group_id"])
        events = []
        for event in group_events:
            event_label = get_event_label(event)
            event_href = get_event_href(event)
            # insert most recent events at the front of the list
            events.insert(0, {
                "label": event_label,
                "description": event["event_description"],
                "href": event_href,
            })

        # add the most recent event groups at the front of the list
        groups.insert(0, {
                "id": group["group_id"],
                "label": label,
                "events": events,
        })
        total_group_count += 1
        total_event_count += event_count

    # TODO add regular wand styles we like from current dashboard
    STYLES.append("dashboard.css")

    dashboard_scripts = [
        "envision.min.js",
        "history.js",
        "flashcanvas.js",
        "canvas2image.js",
        "grid.js",
        "jquery-cookie.js",
        "dashboard.js",
        "graphtemplates/event_frequency.js",
    ]

    return {
            "title": "Event Dashboard",
            "body": body,
            "styles": STYLES,
            "scripts": dashboard_scripts,
            "groups": groups,
            "total_event_count": total_event_count,
            "total_group_count": total_group_count,
           }


# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
