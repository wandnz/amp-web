from pyramid.renderers import get_renderer
from pyramid.view import view_config
from ampweb.views.common import getCommonScripts, initAmpy
from pyramid.httpexceptions import *
import time
import calendar
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

    for mesh in ampy.get_meshes("source", site=ampname):
        mesh_schedule = ampy.get_amp_source_schedule(mesh["name"])
        if len(mesh_schedule) > 0:
            schedule.extend(mesh_schedule)

    # For now, just return a blank page if there is no schedule. We should do
    # something to differentiate between a site that doesn't exist and a site
    # with no schedules, e.g. 404 error vs blank page
    if schedule is None:
        return ""

    meshes = {}
    modified = 0

    for item in schedule:
        if item["modified"] > modified:
            modified = item["modified"]

        if item["period"] == 0:
            item["period"] = "day"
        else:
            item["period"] = "week"

        item["target"] = []
        # figure out which meshes are used as targets and replace the mesh
        # names with the object so we get yaml aliases
        for mesh in item["dest_mesh"]:
            if mesh not in meshes:
                meshes[mesh] = ampy.get_amp_mesh_destinations(mesh)
                if ampname in meshes[mesh]:
                    meshes[mesh].remove(ampname)
            item["target"].append(meshes[mesh])
        # add the individual site targets to the list as well
        for site in item["dest_site"]:
            item["target"].append(site)

        # remove the fields we don't need in the final output
        del(item["id"])
        del(item["dest_mesh"])
        del(item["dest_site"])
        del(item["modified"])

    # TODO if we update twice in the same second that the schedule is fetched,
    # once before and once after, we miss the second update. I think ideally
    # we should be using etags, but need a nice hashing function to combine
    # the schedule ids and a version number
    if request.if_modified_since:
        since = calendar.timegm(request.if_modified_since.utctimetuple())
        if modified <= since:
            return HTTPNotModified()

    # combine the meshes with the schedule and turn it all into yaml
    return yaml.dump({"targets": meshes, "tests": schedule},
            explicit_start=True, explicit_end=True)

def display_add_modal(request, ampname):
    """ Generate the content for the modal schedule page """
    request.override_renderer = "../templates/schedule/modal.pt"

    ampy = initAmpy(request)
    if ampy is None:
        print "Error starting ampy during schedule request"
        return None

    mesh_targets = ampy.get_meshes("destination")
    mesh_sources = ampy.get_meshes("source", site=ampname)
    single_targets = ampy.get_amp_destinations()
    test_macros = get_test_macros()

    return {
            #"modal_body": modal_body,
            "title": "Schedule new test",
            "ampname": ampname,
            "mesh_sources": mesh_sources,
            "mesh_targets": mesh_targets,
            "single_targets": single_targets,
            "test_macros": test_macros,
           }

def display_modify_modal(request, ampname, schedule_id):
    """ Generate the content for the modal modify schedule page """
    request.override_renderer = "../templates/schedule/modal.pt"

    ampy = initAmpy(request)
    if ampy is None:
        print "Error starting ampy during schedule request"
        return None

    mesh_targets = ampy.get_meshes("destination")
    single_targets = ampy.get_amp_destinations()
    schedule = ampy.get_amp_source_schedule(ampname, schedule_id)[0]
    test_macros = get_test_macros()

    return {
            #"modal_body": modal_body,
            "title": "Modify scheduled test",
            "ampname": ampname,
            "mesh_targets": mesh_targets,
            "single_targets": single_targets,
            "schedule": schedule,
            "test_macros": test_macros,
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

    source = ampy.get_amp_site_info(ampname)
    # XXX this check feels too hax, but it has to return "something" to make
    # sure a name gets displayed if we forget to update the metadata db.
    # XXX could use is_mesh etc if I made them available
    if "unknown" in source and source["unknown"] is True:
        source = ampy.get_amp_mesh_info(ampname)
        meshes = {}
    else:
        meshes = ampy.get_meshes("source", site=ampname)

    schedule = ampy.get_amp_source_schedule(ampname)
    for item in schedule:
        item["period"] = period_string(item["start"], item["end"],
                item["frequency"], item["period"])
        item["frequency"] = frequency_string(item["frequency"])

    mesh_schedule = {}
    for mesh in meshes:
        meshname = mesh["name"]
        this_mesh_sched = ampy.get_amp_source_schedule(meshname)
        # only include meshes that actually have tests
        if len(this_mesh_sched) > 0:
            mesh_schedule[meshname] = this_mesh_sched
            for item in mesh_schedule[meshname]:
                item["period"] = period_string(item["start"], item["end"],
                        item["frequency"], item["period"])
                item["frequency"] = frequency_string(item["frequency"])

    # XXX should mesh schedules and normal schedules be combined?
    return {
        "title": "AMP Measurement Schedules for %s" % ampname,
        "page": "schedule",
        "body": body,
        "scripts": SCRIPTS,
        "styles": STYLES,
        "ampname": ampname,
        "fullname": source["longname"],
        "schedule": schedule,
        "mesh_schedule": mesh_schedule,
    }

def display_schedule_landing(request):
    page_renderer = get_renderer("../templates/schedule_landing.pt")
    body = page_renderer.implementation().macros['body']

    ampy = initAmpy(request)
    if ampy is None:
        print "Error starting ampy during schedule request"
        return None

    sources = ampy.get_amp_sources()
    meshes = ampy.get_meshes("source")

    return {
        "title": "AMP Measurement Schedules",
        "body": body,
        "scripts": [],
        "styles": [],
        "sources": sources,
        "meshes": meshes,
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


def get_test_macros():
    return {
        "icmp":
            get_renderer('../templates/schedule/icmp.pt').implementation(),
        "tcpping":
            get_renderer('../templates/schedule/tcpping.pt').implementation(),
        "dns":
            get_renderer('../templates/schedule/dns.pt').implementation(),
        "traceroute":
            get_renderer('../templates/schedule/traceroute.pt').implementation(),
        "throughput":
            get_renderer('../templates/schedule/throughput.pt').implementation(),
        "http":
            get_renderer('../templates/schedule/http.pt').implementation(),
    }

def period_string(start, end, freq, period):
    if ( (start == 0 or start == None) and
            (end == 0 or end == 86400 or end == None) ):
        return ""

    if start > 0 and (end == 0 or end == 86400 or end == None) and freq > start:
        starttime = time.strftime("%H:%M:%S", time.gmtime(start))
        return "starting from %s" % starttime

    if period == 0:
        starttime = time.strftime("%H:%M:%S", time.gmtime(start))
        endtime = time.strftime("%H:%M:%S every day", time.gmtime(end))
    else:
        # start and end are zero based, so if you start treating them as normal
        # timestamps you end up with values around the epoch. The first day of
        # unix time is a Thursday, so lets cheat by adding 3 days to make all
        # our values start on Sunday for display purposes.
        start += 60*60*24*3;
        end += 60*60*24*3;
        starttime = time.strftime("%A %H:%M:%S", time.gmtime(start))
        endtime = time.strftime("%A %H:%M:%S", time.gmtime(end))
    return "%s to %s" % (starttime, endtime)

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
        elif freq % 60 == 0:
            return "Every %d minutes" % (freq / 60)
        else:
            return "Every %d seconds" % freq
    if freq == 60*60*24:
        return "Every day"

    return "Every %d seconds" % freq


# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
