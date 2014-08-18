from pyramid.renderers import get_renderer
from pyramid.view import view_config
from ampweb.views.common import getCommonScripts, initAmpy
from pyramid.httpexceptions import *


def display_add_modal(request, ampname):
    """ Generate the content for the modal schedule page """
    request.override_renderer = "../templates/modals/modalschedule.pt"

    ampy = initAmpy(request)
    if ampy is None:
        print "Error starting ampy during schedule request"
        return None

    mesh_targets = ampy.get_meshes("destination")
    mesh_sources = ampy.get_meshes("source", ampname)
    single_targets = ampy.get_amp_destinations()

    return {
            #"modal_body": modal_body,
            "mesh_sources": mesh_sources,
            "mesh_targets": mesh_targets,
            "single_targets": single_targets,
           }

def display_site_schedule(request, ampname):
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

    site = ampy.get_amp_site_info(ampname)

    schedule = ampy.get_amp_source_schedule(ampname)
    print schedule

    return {
        "title": "AMP Measurement Schedules for %s" % ampname,
        "page": "schedule",
        "body": body,
        "scripts": SCRIPTS,
        "styles": STYLES,
        "ampname": ampname,
        "fullname": site["longname"],
        "schedule": schedule,
    }

def display_schedule_landing(request):
    page_renderer = get_renderer("../templates/schedule_landing.pt")
    body = page_renderer.implementation().macros['body']

    ampy = initAmpy(request)
    if ampy is None:
        print "Error starting ampy during schedule request"
        return None

    sources = ampy.get_amp_sources()

    return {
        "title": "AMP Measurement Schedules",
        "body": body,
        "scripts": [],
        "styles": [],
        "sources": sources,
    }

@view_config(route_name='schedule', renderer='../templates/skeleton.pt',
    http_cache=3600)
def schedule(request):
    urlparts = request.matchdict['params']

    # landing page for schedules, listing all amplets etc
    if len(urlparts) == 0:
        return display_schedule_landing(request)

    # human friendly web interface for viewing site schedules
    if urlparts[0] == "view":
        if len(urlparts[1]) > 0:
            return display_site_schedule(request, urlparts[1])
        else:
            return HTTPClientError()

    # modal dialog for adding tests to the schedule
    if urlparts[0] == "add":
        if len(urlparts[1]) > 0:
            return display_add_modal(request, urlparts[1])
        else:
            return HTTPClientError()

    # no idea what the user is after, it's a 404
    return HTTPNotFound()


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
