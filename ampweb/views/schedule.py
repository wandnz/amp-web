from pyramid.renderers import get_renderer
from pyramid.view import view_config
from pyramid.httpexceptions import *
from ampweb.views.common import initAmpy
import calendar
import yaml


@view_config(
    route_name='yaml',
    renderer='../templates/skeleton.pt',
    permission="yaml",
)
def fetch_yaml_schedule(request):
    """ Generate the raw YAML for the schedule file """

    urlparts = request.matchdict['params']

    if len(urlparts) == 0 or len(urlparts[0]) == 0:
        return HTTPClientError()

    ampname = urlparts[0]

    request.override_renderer = "string"
    #request.response.content_type = "application/x-yaml"

    ampy = initAmpy(request)
    if ampy is None:
        print "Error starting ampy during schedule request"
        return None

    # Check if the schedule has changed since the last query
    if request.if_modified_since:
        site = ampy.get_amp_site_info(ampname)
        since = calendar.timegm(request.if_modified_since.utctimetuple())
        if site["last_schedule_update"] <= since:
            return HTTPNotModified()

    schedule = ampy.get_amp_source_schedule(ampname)

    for mesh in ampy.get_meshes("source", site=ampname):
        mesh_schedule = ampy.get_amp_source_schedule(mesh["ampname"])
        if len(mesh_schedule) > 0:
            schedule.extend(mesh_schedule)

    # For now, just return a blank page if there is no schedule. We should do
    # something to differentiate between a site that doesn't exist and a site
    # with no schedules, e.g. 404 error vs blank page
    if schedule is None:
        return ""

    meshes = {}

    for item in schedule:
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
        del(item["source_mesh"])
        del(item["source_site"])
        del(item["dest_mesh"])
        del(item["dest_site"])

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

    # Try to determine site vs mesh without an explicit argument. If we are
    # displaying a modal without coming from a mesh or site page then something
    # has gone pretty wrong.
    if request.referer.split("/")[-3] == "sites":
        info = ampy.get_amp_site_info(ampname)
    else:
        info = ampy.get_amp_mesh_info(ampname)

    mesh_targets = ampy.get_meshes("destination")
    mesh_sources = ampy.get_meshes("source", site=ampname)
    single_targets = ampy.get_amp_destinations()
    test_macros = get_test_macros()

    return {
            "title": "Schedule new test",
            "ampname": ampname,
            "info": info,
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

    # Try to determine site vs mesh without an explicit argument. If we are
    # displaying a modal without coming from a mesh or site page then something
    # has gone pretty wrong.
    current = request.referer.split("/")[-1]
    if request.referer.split("/")[-3] == "sites":
        if ampname == current:
            # viewing a local site schedule
            info = ampy.get_amp_site_info(ampname)
            inherited = False
        else:
            # viewing a schedule inherited from a mesh
            info = ampy.get_amp_mesh_info(ampname)
            inherited = True
    else:
        # viewing a mesh schedule from the mesh itself
        info = ampy.get_amp_mesh_info(ampname)
        inherited = False

    mesh_targets = ampy.get_meshes("destination")
    single_targets = ampy.get_amp_destinations()
    schedule = ampy.get_amp_source_schedule(ampname, schedule_id)[0]
    test_macros = get_test_macros()

    return {
            "title": "Modify scheduled test",
            "ampname": ampname,
            "info": info,
            "inherited": inherited,
            "mesh_targets": mesh_targets,
            "single_targets": single_targets,
            "schedule": schedule,
            "test_macros": test_macros,
            "mesh_sources": [],
           }



@view_config(
    route_name='schedule',
    renderer='../templates/skeleton.pt',
    permission="edit",
)
def schedule(request):
    urlparts = request.matchdict['params']

    if len(urlparts) < 2:
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

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
