from pyramid.renderers import get_renderer
from pyramid.view import view_config
from ampweb.views.common import getCommonScripts, initAmpy


@view_config(route_name="schedmodal", renderer="../templates/modals/modalschedule.pt")
def schedmodal(request):
    """ Generate the content for the modal schedule page """
    #page_renderer = get_renderer("../templates/modals/%s" % template)
    #modal_body = page_renderer.implementation().macros["modal_body"]
    ampy = initAmpy(request)
    if ampy is None:
        print "Error starting ampy during schedule request"
        return None

    ampname = "waikato.amp.wand.net.nz"
    mesh_targets = ampy.get_meshes("destination")
    mesh_sources = ampy.get_meshes("source", ampname)
    single_targets = ampy.get_amp_destinations()

    return {
            #"modal_body": modal_body,
            "mesh_sources": mesh_sources,
            "mesh_targets": mesh_targets,
            "single_targets": single_targets,
           }


@view_config(route_name='schedule', renderer='../templates/skeleton.pt',
    http_cache=3600)
def schedule(request):
    page_renderer = get_renderer("../templates/schedule.pt")
    body = page_renderer.implementation().macros['body']

    SCRIPTS = getCommonScripts() + [
        "moment.min.js",
        "bootstrap-datetimepicker.min.js",
    ]

    STYLES = [
        "bootstrap-datetimepicker.min.css",
    ]

    ampy = initAmpy(request)
    if ampy is None:
        print "Error starting ampy during schedule request"
        return None

    ampname = "waikato.amp.wand.net.nz"
    site = ampy.get_amp_site_info(ampname)

    items = [
        {
            "type": "icmp",
            "frequency": frequency_string(60),
            "start": 0,
            "end": 86400,
            "period": "day",
            "args": "-s 1500",
            "targets": ["foo", "bar", "baz"]
        },
        {
            "type": "traceroute",
            "frequency": frequency_string(600),
            "start": 0,
            "end": 86400,
            "period": "day",
            "args": "",
            "targets": ["foo", "bar", "baz"]
        },
        {
            "type": "tput",
            "frequency": frequency_string(86400),
            "start": 10800,
            "end": 86400,
            "period": "day",
            "args": "",
            "targets": ["foo"]
        }
    ]

    return {
        "title": "AMP Measurements",
        "page": "schedule",
        "body": body,
        "scripts": SCRIPTS,
        "styles": STYLES,
        "ampname": ampname,
        "fullname": site["longname"],
        "schedule": items,
    }


def frequency_string(freq):
    if freq < 60:
        return "Every %d seconds" % freq
    if freq == 60:
        return "Every minute"

    if freq < 3600:
        if freq % 60 == 0:
            return "Every %d minutes" % (freq / 60)
        else:
            return "Every %d seconds" % freq
    if freq == 3600:
        return "Every hour"

    if freq < 60*60*24:
        if freq % 3600 == 0:
            return "Every %d hours" % (freq / 3600)
        else:
            return "Every %d minutes" % freq
    if freq == 60*60*24:
        return "Every day"

    return "Every %d seconds" % freq


# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
