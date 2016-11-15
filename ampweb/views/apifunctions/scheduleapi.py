import getopt
import json
from pyramid.httpexceptions import *

# XXX GET THESE FROM AMPY?
SCHEDULE_OPTIONS = ["source", "destination", "frequency", "start", "end",
                    "period", "mesh_offset", "args"]

def validate_args(test, args):
    testopts = {
        "icmp": "s:",
        "traceroute": "I:abfp:rs:S:4:6:",
        "dns": "I:q:t:c:z:rsn4:6:",
        "tcpping": "I:p:P:rs:S:4:6:",
        "throughput": "I:t:d:p:P:4:6:",
        "http": "u:cp",
        "udpstream": "I:d:D:n:p:P:z:4:6:",
    }

    if test not in testopts:
        return False

    optstring = testopts[test]

    # We don't care about the actual arguments and what their values are, we
    # only care that it was able to be parsed 100%. The test itself will
    # double check that it has sane values for each option. Maybe we should
    # do more here, so we don't end up with tests that will fail on startup.
    try:
        _, remaining = getopt.getopt(args.split(), optstring)
        # make sure all arguments were parsed
        if len(remaining) > 0:
            return False
    except getopt.GetoptError:
        # any error parsing causes this to fail
        return False
    return True


def create_schedule(ampy, settings):
    # XXX who should verify that some of the other stuff makes sense? like only
    # http tests having zero destinations. or will that just not be an issue
    # as we can schedule tests with no targets perfectly ok. But maybe we want
    # to ensure all tests meet minumum/maximum number of targets (which amplet
    # client and ampweb/static/scripts/modals/schedule_modal.js knows)
    # XXX can we populate that javascript from a python file?
    for item in SCHEDULE_OPTIONS:
        if item not in settings:
            return HTTPBadRequest(body=json.dumps(
                        {"error": "Missing option %s" % item}))

    if not validate_args(settings["test"], settings["args"]):
        return HTTPBadRequest(body=json.dumps(
                {"error": "Bad arguments %s" % settings["args"]}))

    schedule_id = ampy.schedule_new_amp_test(settings)
    if schedule_id >= 0:
        return HTTPOk(body=json.dumps({"schedule_id": schedule_id}))
    return HTTPBadRequest()


def modify_schedule(ampy, schedule_id, settings):
    if len(set(SCHEDULE_OPTIONS).intersection(settings)) == 0:
        return HTTPBadRequest(body=json.dumps(
                    {"error": "No matching options to update"}))

    # if args is present then the test name also needs to be set to validate
    if "args" in settings:
        if "test" not in settings:
            return HTTPBadRequest(body=json.dumps(
                        {"error":"Missing test type"}))
        if not validate_args(settings["test"], settings["args"]):
            return HTTPBadRequest(body=json.dumps(
                        {"error": "Bad arguments %s" % settings["args"]}))

    # XXX difference between illegal values and schedule id not found
    if ampy.update_amp_test(schedule_id, settings):
        return HTTPNoContent()
    return HTTPBadRequest()


def delete_schedule(ampy, schedule_id):
    """ Delete the specified schedule test item """
    if ampy.delete_amp_test(schedule_id):
        return HTTPNoContent()
    return HTTPNotFound()


def set_schedule_status(ampy, schedule_id, settings):
    """ Set the enabled status of the specified schedule test item """
    if "status" not in settings:
        return HTTPBadRequest()

    if settings["status"] == "enable":
        if ampy.enable_amp_test(schedule_id):
            return HTTPNoContent()
        return HTTPNotFound()
    elif settings["status"] == "disable":
        if ampy.disable_amp_test(schedule_id):
            return HTTPNoContent()
        return HTTPNotFound()
    return HTTPBadRequest()


def schedule_status(ampy, schedule_id):
    """ Get the enabled status of the specified schedule test item """
    status = ampy.is_amp_test_enabled(schedule_id)
    if status is None:
        response = HTTPNotFound()
    else:
        if status:
            response = HTTPOk(body=json.dumps({"status": "enabled"}))
        else:
            response = HTTPOk(body=json.dumps({"status": "disabled"}))
    return response


# XXX difference between illegal values and schedule id not found
def add_endpoint(ampy, schedule_id, source, settings):
    if "destination" not in settings:
        return HTTPBadRequest()

    if ampy.add_amp_test_endpoints(schedule_id, source,settings["destination"]):
        return HTTPNoContent()
    return HTTPNotFound()


def delete_endpoint(ampy, schedule_id, source, destination):
    if ampy.delete_amp_test_endpoints(schedule_id, source, destination):
        return HTTPNoContent()
    return HTTPNotFound()


# XXX should we include any source information in the response?
def get_destinations(ampy, schedule_id):
    item = ampy.get_amp_schedule_by_id(schedule_id)
    if item is not None:
        if "dest_site" in item or "dest_mesh" in item:
            sites = item["dest_site"] if "dest_site" in item else []
            meshes = item["dest_mesh"] if "dest_mesh" in item else []
            return HTTPOk(body=json.dumps(
                        {"dest_sites": sites, "dest_meshes": meshes}))
        else:
            return HTTPInternalServerError(body=json.dumps(
                        {"error": "No valid destinations"}))
    return HTTPNotFound()


def schedule(ampy, request):
    response = None
    urlparts = request.matchdict['params']

    try:
        body = request.json_body
    except ValueError:
        body = {}

    if len(urlparts) < 1:
        return

    if len(urlparts) == 2:
        if request.method == "POST":
            response = create_schedule(ampy, body)
        elif request.method == "GET":
            response = HTTPNotImplemented()

    elif len(urlparts) == 3:
        schedule_id = urlparts[2]
        if request.method == "PUT":
            response = modify_schedule(ampy, schedule_id, body)
        elif request.method == "DELETE":
            response = delete_schedule(ampy, schedule_id)
        elif request.method == "GET":
            response = HTTPNotImplemented()

    elif len(urlparts) == 4 and urlparts[3] == "status":
        schedule_id = urlparts[2]
        if request.method == "PUT":
            response = set_schedule_status(ampy, schedule_id, body)
        elif request.method == "GET":
            response = schedule_status(ampy, schedule_id)

    elif len(urlparts) == 4 and urlparts[3] == "destinations":
        source, schedule_id = urlparts[1:3]
        if request.method == "GET":
            response = get_destinations(ampy, schedule_id)
        elif request.method == "POST":
            response = add_endpoint(ampy, schedule_id, source, body)

    elif len(urlparts) == 5 and urlparts[3] == "destinations":
        source, schedule_id, _, destination = urlparts[1:]
        if request.method == "DELETE":
            response = delete_endpoint(ampy, schedule_id, source, destination)

    if response is None:
        response = HTTPBadRequest(body=json.dumps({"error": "bad request"}))

    response.content_type = "application/json"
    return response


# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
