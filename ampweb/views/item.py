from pyramid.renderers import get_renderer
from pyramid.view import view_config
from pyramid.security import authenticated_userid, has_permission
from pyramid.httpexceptions import *
from ampweb.views.common import getCommonScripts, initAmpy, getBannerOptions
import time
import calendar
import yaml
import re


# XXX push this back into ampy?
def get_mesh_members(ampy, meshname):
    members = []

    # XXX shouldn't be using things inside submodules?
    for site in ampy.ampmesh.get_mesh_sources(meshname):
        members.append(ampy.get_amp_site_info(site))
    for site in ampy.ampmesh.get_mesh_destinations(meshname):
        members.append(ampy.get_amp_site_info(site))

    # ensure sites that are both source and destination are only listed once
    members = dict((x["ampname"],x) for x in members).values()
    members.sort(key=lambda x: x["longname"])
    return members



def convert_schedule_item(source, item, mesh_info, site_info):
    item["period"] = _period_string(item["start"], item["end"],
            item["frequency"], item["period"])
    item["raw_frequency"] = item["frequency"]
    item["frequency"] = _frequency_string(item["frequency"])
    item["fullargs"] = _full_arg_strings(item["test"], item["args"])
    item["source"] = {"ampname":source["ampname"],"longname":source["longname"]}
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

    if category == "site":
        members = ampy.get_meshes(None, site=ampname)
        available = ampy.get_meshes(None)
    else:
        members = get_mesh_members(ampy, ampname)
        available = ampy.get_amp_destinations() # XXX exclude members

    return {
        "title": "Modify mesh membership",
        "ampname": ampname,
        "category": category,
        "members": members,
        "available": available, # XXX exclude members
    }


def display_item_info(request, ampname, category):
    """ Display an information page about a single site or mesh """
    page_renderer = get_renderer("../templates/item.pt")
    body = page_renderer.implementation().macros['body']

    SCRIPTS = getCommonScripts() + [
        "moment.min.js",
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

    if "unknown" in source and source["unknown"] is True:
        raise exception_response(404)

    # turn the list of dicts into a dict of dicts, keyed by ampname
    full_mesh_info = dict((x["ampname"],x) for x in ampy.get_meshes(None))

    # get full info for any possible destinations that we have
    destinations = ampy.get_amp_destinations()
    destinations.extend(ampy.get_amp_meshless_sites())
    full_dest_info = dict((x["ampname"],x) for x in destinations)

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

    banopts = getBannerOptions(request)

    return {
        "title": "AMP Measurement Schedules for %s" % ampname,
        "page": "schedule",
        "body": body,
        "scripts": SCRIPTS,
        "styles": STYLES,
        "category": category,
        "ampname": ampname,
        "item": source,
        "members": members,
        "schedule": schedule,
        "show_dash": banopts['showdash'],
        "show_matrix": banopts['showmatrix'],
        "can_edit": has_permission("edit", request.context, request),
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

    return {
        "title": "AMP Measurement Meshes",
        "body": body,
        "scripts": SCRIPTS,
        "styles": ["bootstrap.min.css"],
        "meshes": meshes,
        "show_dash": banopts['showdash'],
        "show_matrix": banopts['showmatrix'],
        "can_edit": has_permission("edit", request.context, request),
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
    sources.sort(key=lambda x: x["longname"])

    # get all sites that are in a destination mesh, or are not in a mesh
    destinations = ampy.get_amp_destinations()
    destinations.extend(ampy.get_amp_meshless_sites())
    destinations.sort(key=lambda x: x["longname"])

    # exclude any sources from the destinations list
    sourcenames = [x["ampname"] for x in sources]
    destinations = [x for x in destinations if x["ampname"] not in sourcenames]

    banopts = getBannerOptions(request)

    return {
        "title": "AMP Measurement Sites",
        "body": body,
        "scripts": SCRIPTS,
        "styles": ["bootstrap.min.css"],
        "sources": sources,
        "destinations": destinations,
        "show_dash": banopts['showdash'],
        "show_matrix": banopts['showmatrix'],
        "can_edit": has_permission("edit", request.context, request),
        "logged_in": authenticated_userid(request),
        "bannertitle": banopts['title'],
    }



# Meshes and sites are almost identical, so have both views point at the
# same place and call (mostly) the same functions.
@view_config(
    route_name='sites',
    renderer='../templates/skeleton.pt',
    permission="edit",
)
@view_config(
    route_name='meshes',
    renderer='../templates/skeleton.pt',
    permission="edit",
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

    # modal dialog for adding tests to the schedule
    if urlparts[0] == "add":
        return display_add_modal(request, category)

    # modal dialog for modifying tests
    if urlparts[0] == "modify":
        if len(urlparts[1]) > 0:
            return display_modify_modal(request, urlparts[1], category)
        else:
            return HTTPClientError()

    if urlparts[0] == "member":
        if len(urlparts[1]) > 0:
            return display_member_modal(request, urlparts[1], category)
        else:
            return HTTPClientError()

    # no idea what the user is after, it's a 404
    return HTTPNotFound()



# Convert the test schedule times into a human-readable string
def _period_string(start, end, freq, period):
    if (end == 0 or end == 86400 or end == None) and freq > start:
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
        start += 60*60*24*3;
        end += 60*60*24*3;
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
        strings.append("%s byte packets" % args["-s"])

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
        strings.append("%s byte packets" % args["-s"])

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

    return strings



# Parse udpstream test arguments into human readable strings
def _udpstream_full_arg_strings(args):
    strings = []
    direction_s2c = "target to self"
    direction_c2s = "self to target"
    directionstr = direction_c2s

    countstr = args["-n"] if "-n" in args else "101"
    sizestr = args["-z"] if "-z" in args else "100"
    spacingstr = args["-D"] if "-D" in args else "20"

    strings.append("%s packets of %s bytes each" % (countstr, sizestr))
    strings.append("%s spacing between packets" % spacingstr)

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



def _full_arg_strings(test, args):
    # considered using getopt or argparse, but I want it to work even if we
    # don't keep the argument strings up to date
    matches = dict(re.findall("(-[a-zA-Z0-9]) ?([^-]\S*)?", args))
    if test == "icmp":
        return _icmp_full_arg_strings(matches)
    if test == "dns":
        return _dns_full_arg_strings(matches)
    if test == "tcpping":
        return _tcpping_full_arg_strings(matches)
    if test == "traceroute":
        return _traceroute_full_arg_strings(matches)
    if test == "throughput":
        return _throughput_full_arg_strings(matches)
    if test == "http":
        return _http_full_arg_strings(matches)
    if test == "udpstream":
        return _udpstream_full_arg_strings(matches)
    return matches

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
