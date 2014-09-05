from pyramid.renderers import get_renderer
from pyramid.view import view_config
from ampweb.views.common import getCommonScripts, initAmpy
from pyramid.httpexceptions import *
import time
import yaml


def fetch_yaml_schedule(request, ampname):
    """ Generate the raw YAML for the schedule file """
    request.override_renderer = "string"
    #request.response.content_type = "application/x-yaml"

    ampy = initAmpy(request)
    if ampy is None:
        print "Error starting ampy during schedule request"
        return None

    schedule = ampy.get_amp_source_schedule(ampname)
    meshes = {}
    modified = 0

    for item in schedule:
        if item["modified"] > modified:
            modified = item["modified"]
        item["target"] = []
        # figure out which meshes are used as targets and replace the mesh
        # names with the object so we get yaml aliases
        for mesh in item["dest_mesh"]:
            if mesh not in meshes:
                meshes[mesh] = ampy.get_amp_mesh_destinations(mesh)
            item["target"].append(meshes[mesh])
        # add the individual site targets to the list as well
        for site in item["dest_site"]:
            item["target"].append(site)
        # remove the fields we don't need in the final output
        del(item["dest_mesh"])
        del(item["dest_site"])

    # TODO if we update twice in the same second that the schedule is fetched,
    # once before and once after, we miss the second update. I think ideally
    # we should be using etags, but need a nice hashing function to combine
    # the schedule ids and a version number
    if request.if_modified_since:
        since = int(request.if_modified_since.strftime("%s"))
        if modified <= since:
            return HTTPNotModified()

    # combine the meshes with the schedule and turn it all into yaml
    return yaml.dump({"targets": meshes, "tests": schedule},
            explicit_start=True, explicit_end=True)

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
            "ampname": ampname,
            "mesh_sources": mesh_sources,
            "mesh_targets": mesh_targets,
            "single_targets": single_targets,
           }

def display_modify_modal(request, ampname, schedule_id):
    """ Generate the content for the modal modify schedule page """
    request.override_renderer = "../templates/modals/schedulemod.pt"

    ampy = initAmpy(request)
    if ampy is None:
        print "Error starting ampy during schedule request"
        return None

    mesh_targets = ampy.get_meshes("destination")
    mesh_sources = ampy.get_meshes("source", ampname)
    single_targets = ampy.get_amp_destinations()
    schedule = ampy.get_amp_source_schedule(ampname, schedule_id)[0]
    print schedule

    return {
            #"modal_body": modal_body,
            "ampname": ampname,
            "mesh_sources": mesh_sources,
            "mesh_targets": mesh_targets,
            "single_targets": single_targets,
            "schedule": schedule,
           }

def display_site_schedule(request, ampname):
    page_renderer = get_renderer("../templates/schedule.pt")
    body = page_renderer.implementation().macros['body']

    SCRIPTS = getCommonScripts() + [
        "moment.min.js",
        "bootstrap-datetimepicker.min.js",
        "modals/schedule.js",
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
    for item in schedule:
        item["frequency"] = frequency_string(item["frequency"])
        item["period"] = period_string(item["start"], item["end"])

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

    # raw yaml page for amplets to fetch from automatically
    if urlparts[0] == "yaml":
        if len(urlparts[1]) > 0:
            return fetch_yaml_schedule(request, urlparts[1])
        else:
            return HTTPClientError()

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

    # modal dialog for modifying tests
    if urlparts[0] == "modify":
        if len(urlparts[1]) > 0:
            return display_modify_modal(request, urlparts[1], urlparts[2])
        else:
            return HTTPClientError()

    # no idea what the user is after, it's a 404
    return HTTPNotFound()


def period_string(start, end):
    if ( (start == 0 or start == None) and
            (end == 0 or end == 86400 or end == None) ):
        return ""
    print start, end

    if start > 0 and (end == 0 or end == 86400 or end == None):
        starttime = time.strftime("%H:%M:%S", time.gmtime(start))
        return "starting from %s" % starttime

    starttime = time.strftime("%H:%M:%S", time.gmtime(start))
    endtime = time.strftime("%H:%M:%S", time.gmtime(end))
    return "between %s and %s" % (starttime, endtime)

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
