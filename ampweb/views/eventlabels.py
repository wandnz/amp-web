import datetime, re, time

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


def event_tooltip(event):
    graphclass = get_event_collection(event)
    if graphclass == None:
        return "Unknown event"

    return graphclass.get_event_tooltip(event)


# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
