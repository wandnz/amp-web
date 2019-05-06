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

from getopt import getopt, GetoptError
import time
import shlex
import sys
import urllib
from pyramid.renderers import get_renderer
from pyramid.view import view_config
from pyramid.security import authenticated_userid, has_permission
from pyramid.httpexceptions import *
from ampweb.views.common import getCommonScripts, initAmpy, getBannerOptions, escapeURIComponent
from ampweb.views.common import getGATrackingID, get_test_optstring


# XXX push this back into ampy?
def get_mesh_members(ampy, meshname):
    members = []

    # XXX shouldn't be using things inside submodules?
    for site in ampy.ampmesh.get_mesh_sources(meshname):
        members.append(ampy.get_amp_site_info(site))
    for site in ampy.ampmesh.get_mesh_destinations(meshname):
        members.append(ampy.get_amp_site_info(site))

    # ensure sites that are both source and destination are only listed once
    members = dict((x["ampname"], x) for x in members).values()
    members.sort(key=lambda x: (x["longname"], x["ampname"]))
    return members



def get_certificate_status(ampname):
    ampname = urllib.unquote(ampname)
    try:
        sys.path.append("/usr/share/amppki/") # XXX
        from amppki.common import load_pending_requests, load_index, is_expired

        index = load_index()
        related = [x for x in index if x["host"] == ampname]
        valid = [x for x in related if x["status"] == "V" and not is_expired(x)]

        # find valid certificates for this host
        if len(valid) > 1:
            return None
        if len(valid) == 1:
            valid.sort(key=lambda x:x["expires"], reverse=True)
            valid[0]["expires"] = time.strftime("%Y-%m-%d %H:%M:%S UTC",
                    time.gmtime(int(valid[0]["expires"][:-3])))
            return {"status": "valid", "cert": valid[0]}

        # if there isn't a valid one, see if there are any outstanding requests
        pending = load_pending_requests(ampname)
        if len(pending) > 1:
            return None
        if len(pending) == 1:
            return {"status": "pending", "csr": pending[0]}

        # if there are no pending requests, return expired/revoked certificates
        if len(related) > 0:
            related.sort(
                    key=lambda x:x["revoked"] if x["revoked"] else x["expires"],
                    reverse=True)

            if related[0]["revoked"]:
                related[0]["revoked"] = time.strftime("%Y-%m-%d %H:%M:%S UTC",
                        time.gmtime(int(related[0]["revoked"][:-3])))
                return {"status": "revoked", "cert": related[0]}
            else:
                related[0]["expires"] = time.strftime("%Y-%m-%d %H:%M:%S UTC",
                        time.gmtime(int(related[0]["expires"][:-3])))
                return {"status": "expired", "cert": related[0]}

        return {}
    except ImportError:
        return False



def convert_schedule_item(source, item, mesh_info, site_info):
    item["period"] = _period_string(item["start"], item["end"],
            item["frequency"], item["period"])
    item["raw_frequency"] = item["frequency"]
    item["frequency"] = _frequency_string(item["frequency"])
    item["fullargs"] = _full_arg_strings(item["test"], item["args"])
    item["source"] = {
        "ampname": source["ampname"],
        "longname": source["longname"],
        "urlname": escapeURIComponent(source["ampname"])
    }
    item["meshes"] = []
    item["sites"] = []
    for target in item["dest_mesh"]:
        item["meshes"].append(mesh_info[target])
    for target in item["dest_site"]:
        # strip any address family suffixes that might be present
        prefix = target.split("!", 1)[0]
        if target == prefix:
            info = site_info[prefix]
        else:
            # copy the info so we can overwrite the ampname and longname
            info = site_info[prefix].copy()
            info["ampname"] = target
            suffixes = target.split("!")[1:]
            count = None
            family = None
            # print extra human readable information about the suffixes used
            for suffix in suffixes:
                if suffix == "v4":
                    family = "IPv4"
                elif suffix == "v6":
                    family = "IPv6"
                elif suffix == "1":
                    count = suffix + " address"
                else:
                    # XXX this assumes suffix is a useful number
                    count = suffix + " addresses"
            info["longname"] += " (%s)" % (
                    ",".join(x for x in [count, family] if x))
        item["sites"].append(info)
    return item



def display_add_modal(request, category):
    """ Generate the content for the modal page to add new sites/meshes """
    request.override_renderer = "../templates/schedule/iteminfo.pt"

    return {
        "title": "Create new %s" % category,
        "category": category,
    }



def display_modify_modal(request, ampname, category):
    """ Generate the content for the modal modify site/mesh page """
    request.override_renderer = "../templates/schedule/iteminfo.pt"

    ampy = initAmpy(request)
    if ampy is None:
        print "Error starting ampy during item request"
        return None

    ampname = urllib.unquote(ampname)

    # site info and mesh info are slightly different
    if category == "site":
        info = ampy.get_amp_site_info(ampname)
    else:
        info = ampy.get_amp_mesh_info(ampname)

    return {
        "title": "Modify %s" % category,
        "ampname": ampname,
        "info": info,
        "category": category,
    }



def display_member_modal(request, ampname, category):
    """ Generate the content for the mesh membership modification modal """
    # TODO make sure all templates are in sensible places
    request.override_renderer = "../templates/member.pt"

    ampy = initAmpy(request)
    if ampy is None:
        print "Error starting ampy during mesh membership request"
        return None

    ampname = urllib.unquote(ampname)

    if category == "site":
        members = ampy.get_meshes(None, site=ampname)
        available = ampy.get_meshes(None)
    else:
        members = get_mesh_members(ampy, ampname)
        available = ampy.get_amp_sites() # XXX exclude members

    return {
        "title": "Modify mesh membership",
        "ampname": ampname,
        "urlname": escapeURIComponent(ampname),
        "category": category,
        "members": members,
        "available": available, # XXX exclude members
    }



def display_item_info(request, ampname, category):
    """ Display an information page about a single site or mesh """
    page_renderer = get_renderer("../templates/item.pt")
    body = page_renderer.implementation().macros['body']

    SCRIPTS = getCommonScripts() + [
        "lib/bootstrap-datetimepicker.min.js",
        "modals/modal.js",
        "modals/member_modal.js",
        "modals/iteminfo_modal.js",
        "modals/schedule_modal.js",
        "pages/item.js",
    ]

    STYLES = [
        "bootstrap-datetimepicker.min.css",
        "bootstrap.min.css",
    ]

    ampname = urllib.unquote(ampname)

    ampy = initAmpy(request)
    if ampy is None:
        print "Error starting ampy during schedule request"
        return None

    if category == "site":
        source = ampy.get_amp_site_info(ampname)
        members = meshes = ampy.get_meshes(None, site=ampname)
    else:
        meshes = {}
        source = ampy.get_amp_mesh_info(ampname)
        members = get_mesh_members(ampy, ampname)

    for member in members:
        member["urlname"] = escapeURIComponent(member["ampname"])

    if "unknown" in source and source["unknown"] is True:
        return HTTPNotFound()

    # turn the list of dicts into a dict of dicts, keyed by ampname
    full_mesh_info = dict((x["ampname"], x) for x in ampy.get_meshes(None))
    # XXX
    for mesh in full_mesh_info:
        full_mesh_info[mesh]["urlname"] = escapeURIComponent(
                full_mesh_info[mesh]["ampname"])

    # get full info for any possible destinations that we have
    destinations = ampy.get_amp_destinations()
    destinations.extend(ampy.get_amp_meshless_sites())
    full_dest_info = dict((x["ampname"], x) for x in destinations)
    # XXX
    for dest in full_dest_info:
        full_dest_info[dest]["urlname"] = escapeURIComponent(
                full_dest_info[dest]["ampname"])

    # load the schedule for this particular source
    schedule = ampy.get_amp_source_schedule(ampname)
    schedule = [convert_schedule_item(
            source, x, full_mesh_info, full_dest_info) for x in schedule]

    # if it belongs to any meshes, then load those schedules too
    for mesh in meshes:
        mesh_schedule = ampy.get_amp_source_schedule(mesh["ampname"])
        mesh_schedule = [convert_schedule_item(
                mesh, x, full_mesh_info, full_dest_info) for x in mesh_schedule]
        schedule.extend(mesh_schedule)

    # sort the schedule by test, then from most frequent to less frequent
    schedule.sort(key=lambda x: x["end"])
    schedule.sort(key=lambda x: x["start"])
    schedule.sort(key=lambda x: x["raw_frequency"])
    schedule.sort(key=lambda x: x["test"])

    # report on the current certificate status if possible
    if category == "site":
        source["pki"] = get_certificate_status(ampname)

    banopts = getBannerOptions(request)

    return {
        "title": "AMP Measurement Schedules for %s" % ampname,
        "page": "schedule",
        "body": body,
        "scripts": SCRIPTS,
        "styles": STYLES,
        "category": category,
        "ampname": ampname,
        "urlname": escapeURIComponent(ampname),
        "item": source,
        "members": members,
        "schedule": schedule,
        "gtag": getGATrackingID(request),
        "show_dash": banopts['showdash'],
        "show_matrix": banopts['showmatrix'],
        "can_edit": has_permission("editconfig", request.context, request),
        "show_config": has_permission("viewconfig", request.context, request),
        "show_users": has_permission("editusers", request.context, request),
        "logged_in": authenticated_userid(request),
        "bannertitle": banopts['title'],
    }



def display_mesh_landing(request):
    """ Display a list of all the available meshes """
    page_renderer = get_renderer("../templates/mesh_landing.pt")
    body = page_renderer.implementation().macros['body']

    SCRIPTS = getCommonScripts() + [
        "modals/modal.js",
        "modals/iteminfo_modal.js",
    ]

    ampy = initAmpy(request)
    if ampy is None:
        print "Error starting ampy during item request"
        return None

    meshes = ampy.get_meshes(None)
    banopts = getBannerOptions(request)

    for mesh in meshes:
        mesh["urlname"] = escapeURIComponent(mesh["ampname"])

    return {
        "title": "AMP Measurement Meshes",
        "body": body,
        "scripts": SCRIPTS,
        "styles": ["bootstrap.min.css"],
        "meshes": meshes,
        "gtag": getGATrackingID(request),
        "show_dash": banopts['showdash'],
        "show_matrix": banopts['showmatrix'],
        "can_edit": has_permission("editconfig", request.context, request),
        "show_config": has_permission("viewconfig", request.context, request),
        "show_users": has_permission("editusers", request.context, request),
        "logged_in": authenticated_userid(request),
        "bannertitle": banopts['title'],
    }



def display_site_landing(request):
    """ Display a list of all the available sites """
    page_renderer = get_renderer("../templates/site_landing.pt")
    body = page_renderer.implementation().macros['body']

    SCRIPTS = getCommonScripts() + [
        "modals/modal.js",
        "modals/iteminfo_modal.js",
    ]

    ampy = initAmpy(request)
    if ampy is None:
        print "Error starting ampy during item request"
        return None

    # get all sites that are in a source mesh, or that have a test scheduled
    # with them as the sources
    sources = ampy.get_amp_sources()
    sourcenames = [x["ampname"] for x in sources]
    sources.extend([x for x in ampy.get_amp_site_endpoints()
            if x["ampname"] not in sourcenames])
    sources.sort(key=lambda x: (x["longname"], x["ampname"]))

    # get all sites that are in a destination mesh, or are not in a mesh
    destinations = ampy.get_amp_destinations()
    destinations.extend(ampy.get_amp_meshless_sites())
    destinations.sort(key=lambda x: (x["longname"], x["ampname"]))

    # exclude any sources from the destinations list
    sourcenames = [x["ampname"] for x in sources]
    destinations = [x for x in destinations if x["ampname"] not in sourcenames]

    banopts = getBannerOptions(request)

    # TODO can this be done automatically when generating the lists?
    for source in sources:
        source["urlname"] = escapeURIComponent(source["ampname"])
    for destination in destinations:
        destination["urlname"] = escapeURIComponent(destination["ampname"])

    return {
        "title": "AMP Measurement Sites",
        "body": body,
        "scripts": SCRIPTS,
        "styles": ["bootstrap.min.css"],
        "sources": sources,
        "destinations": destinations,
        "gtag": getGATrackingID(request),
        "show_dash": banopts['showdash'],
        "show_matrix": banopts['showmatrix'],
        "can_edit": has_permission("editconfig", request.context, request),
        "show_config": has_permission("viewconfig", request.context, request),
        "show_users": has_permission("editusers", request.context, request),
        "logged_in": authenticated_userid(request),
        "bannertitle": banopts['title'],
    }



# Meshes and sites are almost identical, so have both views point at the
# same place and call (mostly) the same functions.
@view_config(
    route_name='sites',
    renderer='../templates/skeleton.pt',
    permission="viewconfig",
)
@view_config(
    route_name='meshes',
    renderer='../templates/skeleton.pt',
    permission="viewconfig",
)
def item(request):
    urlparts = request.matchdict['params']
    if request.matched_route.name == "sites":
        category = "site"
    else:
        category = "mesh"

    # landing page for schedules, listing all amplets etc
    if len(urlparts) == 0:
        if category == "site":
            return display_site_landing(request)
        else:
            return display_mesh_landing(request)

    # human friendly web interface for viewing site schedules
    if urlparts[0] == "view":
        if len(urlparts[1]) > 0:
            return display_item_info(request, urlparts[1], category)
        else:
            return HTTPClientError()

    # the following items require further permissions to use
    edit = has_permission("editconfig", request.context, request)

    # modal dialog for adding tests to the schedule
    if urlparts[0] == "add":
        if edit:
            return display_add_modal(request, category)
        else:
            return HTTPForbidden()

    # modal dialog for modifying tests
    if urlparts[0] == "modify":
        if len(urlparts[1]) > 0:
            if edit:
                return display_modify_modal(request, urlparts[1], category)
            else:
                return HTTPForbidden()
        else:
            return HTTPClientError()

    # modal dialog for modifying mesh membership
    if urlparts[0] == "member":
        if len(urlparts[1]) > 0:
            if edit:
                return display_member_modal(request, urlparts[1], category)
            else:
                return HTTPForbidden()
        else:
            return HTTPClientError()

    # no idea what the user is after, it's a 404
    return HTTPNotFound()



# Convert the test schedule times into a human-readable string
def _period_string(start, end, freq, period):
    if (end == 0 or end == 86400 or end is None) and freq > start:
        starttime = time.strftime("%H:%M:%S", time.gmtime(start))
        return "Starting from %s" % starttime

    if period == 0:
        starttime = time.strftime("%H:%M:%S", time.gmtime(start))
        endtime = time.strftime("%H:%M:%S every day", time.gmtime(end))
    else:
        # start and end are zero based, so if you start treating them as normal
        # timestamps you end up with values around the epoch. The first day of
        # unix time is a Thursday, so lets cheat by adding 3 days to make all
        # our values start on Sunday for display purposes.
        start += 60*60*24*3
        end += 60*60*24*3
        starttime = time.strftime("%A %H:%M:%S", time.gmtime(start))
        endtime = time.strftime("%A %H:%M:%S", time.gmtime(end))
    return "%s to %s" % (starttime, endtime)



# Convert the frequency into a human-readable string
def _frequency_string(freq):
    if freq == 60:
        return "Every minute"
    if freq == (60*60):
        return "Every hour"
    if freq == (60*60*24):
        return "Every day"

    if freq % (60*60*24) == 0:
        return "Every %d days" % (freq / (60*60*24))
    if freq % (60*60) == 0:
        return "Every %d hours" % (freq / (60*60))
    elif freq % 60 == 0:
        return "Every %d minutes" % (freq / 60)

    return "Every %d seconds" % freq



# TODO move these elsewhere, possibly into ampy?

# Parse icmp test arguments into human readable strings
def _icmp_full_arg_strings(args):
    strings = []
    size = 84

    # packet size is either fixed or random
    if "-r" in args:
        strings.append("Random sized packets")
    else:
        if "-s" in args:
            size = args["-s"]
        strings.append("%s byte packets" % size)

    return strings



# Parse dns test arguments into human readable strings
def _dns_full_arg_strings(args):
    strings = []

    # build a full query string on one line
    if "-q" in args:
        query = args["-q"]
        if "-c" in args:
            qclass = args["-c"]
        else:
            qclass = "IN"
        if "-t" in args:
            qtype = args["-t"]
        else:
            qtype = "A"
        query += " %s %s" % (qclass, qtype)
        strings.append(query)

    # Put all the flags on one line too, they are only short. In theory
    # there should be +nodnssec and +nonsid strings, but they look a bit
    # stupid so I've left them out
    flags = []
    if "-r" in args:
        flags.append("+recurse")
    else:
        flags.append("+norecurse")
    if "-s" in args:
        flags.append("+dnssec")
    if "-n" in args:
        flags.append("+nsid")
    if len(flags) > 0:
        strings.append(" ".join(flags))

    return strings



# Parse tcpping test arguments into human readable strings
def _tcpping_full_arg_strings(args):
    strings = []
    port = 80
    size = 84

    # packet size is either fixed or random
    if "-r" in args:
        strings.append("Random sized packets")
    else:
        if "-s" in args:
            size = args["-s"]
        strings.append("%s byte packets" % size)

    # target port to test
    if "-P" in args:
        port = args["-P"]
    strings.append("TCP port %s" % port)

    return strings



# Parse traceroute test arguments into human readable strings
def _traceroute_full_arg_strings(args):
    strings = []
    size = 84

    # packet size is either fixed or random
    if "-r" in args:
        strings.append("Random sized packets")
    else:
        if "-s" in args:
            size = args["-s"]
        strings.append("%s byte packets" % size)

    # are we forcing each hop to be probed (rather than using doubletree)
    if "-f" in args:
        strings.append("Probe every hop")

    # Describe what parts of the path are being reported
    if "-a" in args and "-b" in args:
        strings.append("Report AS numbers only")
    elif "-a" in args:
        strings.append("Report IP addresses and AS numbers")
    elif "-b" in args:
        strings.append("Don't report anything?!")
    else:
        strings.append("Report IP addresses only")

    return strings



# Parse throughput test arguments into human readable strings
def _throughput_full_arg_strings(args):
    strings = []
    direction_s2c = "target to self"
    direction_c2s = "self to target"
    directionstr = direction_c2s
    duration = 10

    if "-S" in args:
        # TODO this is a proper schedule, not created with the web interface
        pass
    else:
        # time in seconds to test for in (each) direction
        if "-t" in args:
            duration = args["-t"]
        durationstr = "%s seconds" % duration

        # direction(s) to test
        if "-d" in args:
            if args["-d"] == "0":
                directionstr = "%s" % direction_c2s
            elif args["-d"] == "1":
                directionstr = "%s" % direction_s2c
            elif args["-d"] == "2":
                directionstr = "%s, %s" % (direction_c2s, direction_s2c)
            elif args["-d"] == "3":
                directionstr = "%s, %s" % (direction_s2c, direction_c2s)
            strings.append("%s %s" % (durationstr, directionstr))

        # the protocol the test is pretending to be
        if "-u" in args:
            if args["-u"] == "http":
                strings.append(" Masquerade as HTTP POST")

    return strings



# Parse http test arguments into human readable strings
def _http_full_arg_strings(args):
    strings = []

    if "-u" in args:
        strings.append(args["-u"])
    if "-c" in args:
        strings.append("Allow cached content")
    if "-p" in args:
        strings.append("Use HTTP/1.1 pipelining")
    if "-P" in args:
        strings.append("Via %s" % args["-P"])
    if "-a" in args:
        strings.append("UserAgent: %s" % args["-a"])

    return strings



# Parse udpstream test arguments into human readable strings
def _udpstream_full_arg_strings(args):
    strings = []
    direction_s2c = "target to self"
    direction_c2s = "self to target"
    directionstr = direction_c2s

    countstr = args["-n"] if "-n" in args else "101"
    sizestr = args["-z"] if "-z" in args else "100"
    spacingstr = args["-D"] if "-D" in args else "20000"

    strings.append("%s packets of %s bytes each" % (countstr, sizestr))
    strings.append("%sus spacing between packets" % spacingstr)

    # direction(s) to test
    if "-d" in args:
        if args["-d"] == "0":
            directionstr = "%s" % direction_c2s
        elif args["-d"] == "1":
            directionstr = "%s" % direction_s2c
        elif args["-d"] == "2":
            directionstr = "%s, %s" % (direction_c2s, direction_s2c)
        elif args["-d"] == "3":
            directionstr = "%s, %s" % (direction_s2c, direction_c2s)
    strings.append(directionstr)

    return strings



# Parse http test arguments into human readable strings
def _youtube_full_arg_strings(args):
    strings = []
    if "-y" in args:
        strings.append("video %s" % args["-y"])
    if "-q" in args:
        if args["-q"] == "1":
            quality = "default"
        elif args["-q"] == "2":
            quality = "small"
        elif args["-q"] == "3":
            quality = "medium"
        elif args["-q"] == "4":
            quality = "large"
        elif args["-q"] == "5":
            quality = "hd720"
        elif args["-q"] == "6":
            quality = "hd1080"
        elif args["-q"] == "7":
            quality = "hd1440"
        elif args["-q"] == "8":
            quality = "hd2160"
        elif args["-q"] == "9":
            quality = "highres"
        else:
            quality = args["-q"]
        strings.append("%s quality" % quality)
    if "-a" in args:
        strings.append("UserAgent: %s" % args["-a"])
    if "-t" in args:
        strings.append("Stop after %s seconds" % args["-t"])

    return strings


def _fastping_full_arg_strings(args):
    strings = []
    sizestr = args["-s"] if "-s" in args else "64"
    ratestr = args["-r"] if "-r" in args else "1"
    countstr = args["-c"] if "-c" in args else "60"

    strings.append("%s packets of %s bytes each" % (countstr, sizestr))
    strings.append("%s packets per second" % ratestr)
    if "-p" in args:
        strings.append("Pre-probe before test starts")

    return strings


def _external_full_arg_strings(args):
    strings = []
    if "-c" in args:
        strings.append("%s" % args["-c"])
    return strings


def _full_arg_strings(test, args):
    try:
        argv, _ = getopt(shlex.split(args), get_test_optstring(test))
    except GetoptError as e:
        return [args, e.msg]
    argdict = dict(argv)

    if test == "icmp":
        return _icmp_full_arg_strings(argdict)
    if test == "dns":
        return _dns_full_arg_strings(argdict)
    if test == "tcpping":
        return _tcpping_full_arg_strings(argdict)
    if test == "traceroute":
        return _traceroute_full_arg_strings(argdict)
    if test == "throughput":
        return _throughput_full_arg_strings(argdict)
    if test == "http":
        return _http_full_arg_strings(argdict)
    if test == "udpstream":
        return _udpstream_full_arg_strings(argdict)
    if test == "youtube":
        return _youtube_full_arg_strings(argdict)
    if test == "fastping":
        return _fastping_full_arg_strings(argdict)
    if test == "external":
        return _external_full_arg_strings(argdict)
    return [args]

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
