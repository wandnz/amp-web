from pyramid.renderers import get_renderer
from pyramid.view import view_config
from ampweb.views.common import getCommonScripts, initAmpy
from pyramid.httpexceptions import *
import time
import calendar
import yaml
import re


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

    # load the schedule for this particular source
    schedule = ampy.get_amp_source_schedule(ampname)
    for item in schedule:
        item["period"] = period_string(item["start"], item["end"],
                item["frequency"], item["period"])
        item["raw_frequency"] = item["frequency"]
        item["frequency"] = frequency_string(item["frequency"])
        item["fullargs"] = full_arg_strings(item["test"], item["args"])
        item["sourcename"] = ampname

    # if it belongs to any meshes, then load those schedules too
    for mesh in meshes:
        mesh_schedule = ampy.get_amp_source_schedule(mesh["name"])
        if len(mesh_schedule) > 0:
            for item in mesh_schedule:
                item["period"] = period_string(item["start"], item["end"],
                        item["frequency"], item["period"])
                item["raw_frequency"] = item["frequency"]
                item["frequency"] = frequency_string(item["frequency"])
                item["fullargs"] = full_arg_strings(item["test"], item["args"])
                item["sourcename"] = mesh["name"]
            schedule.extend(mesh_schedule)

    # sort the schedule by test, then from most frequent to less frequent
    schedule.sort(key=lambda x: x["end"])
    schedule.sort(key=lambda x: x["start"])
    schedule.sort(key=lambda x: x["raw_frequency"])
    schedule.sort(key=lambda x: x["test"])

    return {
        "title": "AMP Measurement Schedules for %s" % ampname,
        "page": "schedule",
        "body": body,
        "scripts": SCRIPTS,
        "styles": STYLES,
        "ampname": ampname,
        "fullname": source["longname"],
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

# TODO move these elsewhere, possibly into ampy?

# Parse icmp test arguments into human readable strings
def icmp_full_arg_strings(args):
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
def dns_full_arg_strings(args):
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
def tcpping_full_arg_strings(args):
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
def traceroute_full_arg_strings(args):
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
def throughput_full_arg_strings(args):
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
def http_full_arg_strings(args):
    strings = []

    if "-u" in args:
        strings.append(args["-u"])
    if "-c" in args:
        strings.append("Allow cached content")
    if "-p" in args:
        strings.append("Use HTTP/1.1 pipelining")

    return strings

def full_arg_strings(test, args):
    # considered using getopt or argparse, but I want it to work even if we
    # don't keep the argument strings up to date
    matches = dict(re.findall("(-[a-zA-Z0-9]) ?([^-]\S*)?", args))
    if test == "icmp":
        return icmp_full_arg_strings(matches)
    if test == "dns":
        return dns_full_arg_strings(matches)
    if test == "tcpping":
        return tcpping_full_arg_strings(matches)
    if test == "traceroute":
        return traceroute_full_arg_strings(matches)
    if test == "throughput":
        return throughput_full_arg_strings(matches)
    if test == "http":
        return http_full_arg_strings(matches)
    return matches


# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
