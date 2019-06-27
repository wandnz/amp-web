#
# This file is part of amp-web.
#
# Copyright (C) 2013-2017 The University of Waikato, Hamilton, New Zealand.
#
# Authors: Shane Alcock
#          Brendon Jones
#
# All rights reserved.
#
# This code has been developed by the WAND Network Research Group at the
# University of Waikato. For further information please see
# http://www.wand.net.nz/
#
# amp-web is free software; you can redistribute it and/or modify
# it under the terms of the GNU General Public License version 2 as
# published by the Free Software Foundation.
#
# amp-web is distributed in the hope that it will be useful, but
# WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
# General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with amp-web; if not, write to the Free Software Foundation, Inc.
# 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
#
# Please report any bugs, questions or comments to contact@wand.net.nz
#

import calendar
import json
import urllib
import yaml
from pyramid.renderers import get_renderer
from pyramid.view import view_config
from pyramid.httpexceptions import *
from ampweb.views.common import initAmpy

# this endpoint is used by the web interface to show the user the schedule
# and will apply the appropriate user permissions checks
@view_config(
    route_name='yaml_web',
    renderer='string',
    permission="viewconfig",
)
def fetch_yaml_schedule_web(request):
    """ Generate the raw YAML for the schedule file """
    return fetch_yaml_schedule(request)


# this endpoint is used by clients to fetch their own schedule and by default
# doesn't apply any permissions checking (but apache can be configured to
# restrict access to only those that supply a good client certificate, or
# block it entirely if schedules are distributed through another mechanism).
@view_config(
    route_name='yaml',
    renderer='string',
    permission="yaml",
)
def fetch_yaml_schedule(request):
    """ Generate the raw YAML for the schedule file """

    ampname = urllib.unquote(request.matchdict["name"])

    #request.response.content_type = "application/x-yaml"

    ampy = initAmpy(request)
    if ampy is None:
        print "Error starting ampy during schedule request"
        return HTTPInternalServerError()

    # Check if the schedule has changed since the last query
    if request.if_modified_since:
        site = ampy.get_amp_site_info(ampname)
        since = calendar.timegm(request.if_modified_since.utctimetuple())
        if site["last_schedule_update"] <= since:
            return HTTPNotModified()

    sched = ampy.get_amp_source_schedule(ampname)

    for mesh in ampy.get_meshes("source", site=ampname):
        mesh_schedule = ampy.get_amp_source_schedule(mesh["ampname"])
        if len(mesh_schedule) > 0:
            sched.extend(mesh_schedule)

    # For now, just return a blank page if there is no schedule. We should do
    # something to differentiate between a site that doesn't exist and a site
    # with no schedules, e.g. 404 error vs blank page
    if sched is None:
        return ""

    meshes = {}
    active = []

    for item in sched:
        if not item["enabled"]:
            continue

        # if the offset is set and this schedule item belongs to a mesh then
        # we need to adjust the start time for this site
        if len(item["source_mesh"]) > 0:
            sources = ampy.ampmesh.get_mesh_sources(item["source_mesh"][0])
            offset = sources.index(ampname) * item["mesh_offset"]
        else:
            offset = 0

        yamlitem = {
            "test": item["test"],
            "frequency": item["frequency"],
            "period": "day" if item["period"] == 0 else "week",
            "start": item["start"] + offset,
            "end": item["end"],
            "args": item["args"],
            "target": []
        }

        # figure out which meshes are used as targets and replace the mesh
        # names with the object so we get yaml aliases
        if item["test"] not in ["http", "youtube"]:
            for mesh in item["dest_mesh"]:
                if mesh not in meshes:
                    meshes[mesh] = ampy.get_amp_mesh_destinations(mesh)
                    if ampname in meshes[mesh]:
                        meshes[mesh].remove(ampname)
                yamlitem["target"].append(meshes[mesh])
            # add the individual site targets to the list as well
            for site in item["dest_site"]:
                # exclude any tests to ourselves
                if site != ampname:
                    yamlitem["target"].append(site)
            # don't bother adding the test if there weren't any valid targets
            if len(yamlitem["target"]) == 0:
                continue

        active.append(yamlitem)

    # combine the meshes with the schedule and turn it all into yaml
    return yaml.dump({"targets": meshes, "tests": active},
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
        category = "site"
    else:
        info = ampy.get_amp_mesh_info(ampname)
        category = "mesh"

    mesh_targets = ampy.get_meshes("destination")
    mesh_sources = ampy.get_meshes("source", site=ampname)
    single_targets = ampy.get_amp_sites()
    test_macros = get_test_macros()

    return {
        "title": "Schedule new test",
        "ampname": ampname,
        "category": category,
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
    # XXX using the referer is not the best way to do this! we have to unquote
    # twice because everything gets encoded twice to beat WSGI
    current = urllib.unquote(urllib.unquote(request.referer.split("/")[-1]))
    if request.referer.split("/")[-3] == "sites":
        if ampname == current:
            # viewing a local site schedule
            info = ampy.get_amp_site_info(ampname)
            category = "site"
            inherited = False
        else:
            # viewing a schedule inherited from a mesh
            info = ampy.get_amp_mesh_info(ampname)
            category = "mesh"
            inherited = True
    else:
        # viewing a mesh schedule from the mesh itself
        info = ampy.get_amp_mesh_info(ampname)
        category = "mesh"
        inherited = False

    mesh_targets = ampy.get_meshes("destination")
    single_targets = ampy.get_amp_sites()
    sched = ampy.get_amp_source_schedule(ampname, schedule_id)[0]
    # dump as json to escape backslashes and quotes
    sched["args"] = json.dumps(sched["args"])
    test_macros = get_test_macros()

    return {
        "title": "Modify scheduled test",
        "ampname": ampname,
        "info": info,
        "inherited": inherited,
        "category": category,
        "mesh_targets": mesh_targets,
        "single_targets": single_targets,
        "schedule": sched,
        "test_macros": test_macros,
        "mesh_sources": [],
    }


@view_config(
    route_name='schedule_ui',
    renderer='../templates/skeleton.pt',
    permission="editconfig",
)
def schedule(request):
    urlparts = request.matchdict['params']

    if len(urlparts) < 2:
        return HTTPClientError()

    # modal dialog for adding tests to the schedule
    if urlparts[0] == "add":
        if len(urlparts[1]) > 0:
            return display_add_modal(request, urllib.unquote(urlparts[1]))
        else:
            return HTTPClientError()

    # modal dialog for modifying tests
    if urlparts[0] == "modify":
        if len(urlparts[1]) > 0:
            return display_modify_modal(request, urllib.unquote(urlparts[1]),
                    urlparts[2])
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
        "udpstream":
            get_renderer('../templates/schedule/udpstream.pt').implementation(),
        "youtube":
            get_renderer('../templates/schedule/youtube.pt').implementation(),
        "fastping":
            get_renderer('../templates/schedule/fastping.pt').implementation(),
        "external":
            get_renderer('../templates/schedule/external.pt').implementation(),
    }

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
