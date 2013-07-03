
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
    href = "graph/rrd-smokeping/%s/30/%d/%d" % (event["stream_id"], start, end)
    return href

def get_muninbytes_event_href(event):
    """ Build the link to the graph showing a muninbytes event """
    start = event["timestamp"] - (3 * 60 * 60)
    end = event["timestamp"] + (1 * 60 * 60)
    href = "graph/rrd-muninbytes/%s/30/%d/%d" % (event["stream_id"], start, end)
    return href
