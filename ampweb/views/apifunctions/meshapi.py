import json
from pyramid.view import view_config
from pyramid.httpexceptions import *
from ampweb.views.common import initAmpy


# TODO better name for api? it covers sites and meshes but is called mesh


PERMISSION = 'edit'


@view_config(
    route_name='meshsites',
    request_method='GET',
    renderer='json',
    permission=PERMISSION,
)
@view_config(
    route_name='sitemeshes',
    request_method='GET',
    renderer='json',
    permission=PERMISSION,
)
def get_members(request):
    return HTTPNotImplemented()


@view_config(
    route_name='meshsites',
    request_method='POST',
    renderer='json',
    permission=PERMISSION,
)
@view_config(
    route_name='sitemeshes',
    request_method='POST',
    renderer='json',
    permission=PERMISSION,
)
def add_member(request):
    ampy = initAmpy(request)
    if ampy is None:
        return HTTPInternalServerError()

    try:
        body = request.json_body
        if request.matched_route.name == "meshsites":
            mesh = request.matchdict["mesh"]
            site = body["site"]
        else:
            mesh = body["mesh"]
            site = request.matchdict["name"]
    except (ValueError, KeyError):
        return HTTPBadRequest(body=json.dumps({"error": "missing value"}))

    if ampy.add_amp_mesh_member(mesh, site):
        return HTTPNoContent()
    return HTTPNotFound()


@view_config(
    route_name='meshsite',
    request_method='DELETE',
    renderer='json',
    permission=PERMISSION,
)
@view_config(
    route_name='sitemesh',
    request_method='DELETE',
    renderer='json',
    permission=PERMISSION,
)
def remove_member(request):
    ampy = initAmpy(request)
    if ampy is None:
        return HTTPInternalServerError()

    if ampy.delete_amp_mesh_member(request.matchdict["mesh"],
            request.matchdict["name"]):
        return HTTPNoContent()
    return HTTPNotFound()


@view_config(
    route_name='allsites',
    request_method='POST',
    renderer='json',
    permission=PERMISSION,
)
@view_config(
    route_name='allmeshes',
    request_method='POST',
    renderer='json',
    permission=PERMISSION,
)
def create_item(request):
    ampy = initAmpy(request)
    if ampy is None:
        return HTTPInternalServerError()

    try:
        body = request.json_body
        ampname = body["ampname"]
        longname = body["longname"]
        description = body["description"]
        if request.matched_route.name == "allsites":
            location = body["location"]
        elif request.matched_route.name == "allmeshes":
            public = body["public"]
    except (ValueError, KeyError):
        return HTTPBadRequest(body=json.dumps({"error": "missing value"}))

    if request.matched_route.name == "allsites":
        result = ampy.add_amp_site(ampname, longname, location, description)
        url = request.route_url("onesite", name=ampname)
    elif request.matched_route.name == "allmeshes":
        result = ampy.add_amp_mesh(ampname, longname, description, public)
        url = request.route_url("onemesh", mesh=ampname)
    else:
        return HTTPBadRequest()

    if result:
        return HTTPCreated(headers=[("Location", url)], body=json.dumps({
                    "ampname": ampname,
                    "url": url,
                    }))

    return HTTPBadRequest()


@view_config(
    route_name='onesite',
    request_method='GET',
    renderer='json',
    permission=PERMISSION,
)
@view_config(
    route_name='onemesh',
    request_method='GET',
    renderer='json',
    permission=PERMISSION,
)
def get_item(request):
    ampy = initAmpy(request)
    if ampy is None:
        return HTTPInternalServerError()

    if request.matched_route.name == "onesite":
        item = ampy.get_amp_site_info(request.matchdict["name"])
    elif request.matched_route.name == "onemesh":
        item = ampy.get_amp_mesh_info(request.matchdict["mesh"])

    if item is None:
        return HTTPInternalServerError()
    if "unknown" in item and item["unknown"] is True:
        return HTTPNotFound()

    return HTTPOk(body=json.dumps(item))


@view_config(
    route_name='onesite',
    request_method='PUT',
    renderer='json',
    permission=PERMISSION,
)
@view_config(
    route_name='onemesh',
    request_method='PUT',
    renderer='json',
    permission=PERMISSION,
)
def update_item(request):
    ampy = initAmpy(request)
    if ampy is None:
        return HTTPInternalServerError()

    try:
        body = request.json_body
        longname = body["longname"]
        description = body["description"]
        if request.matched_route.name == "onesite":
            location = body["location"]
        elif request.matched_route.name == "onemesh":
            public = body["public"]
    except (ValueError, KeyError):
        return HTTPBadRequest(body=json.dumps({"error": "missing value"}))

    if request.matched_route.name == "onesite":
        if ampy.update_amp_site(request.matchdict["name"], longname, location,
                description):
            return HTTPNoContent()
    elif request.matched_route.name == "onemesh":
        if ampy.update_amp_mesh(request.matchdict["mesh"], longname,
                description, public):
            return HTTPNoContent()

    return HTTPBadRequest()


@view_config(
    route_name='onesite',
    request_method='DELETE',
    renderer='json',
    permission=PERMISSION,
)
@view_config(
    route_name='onemesh',
    request_method='DELETE',
    renderer='json',
    permission=PERMISSION,
)
def delete_item(request):
    ampy = initAmpy(request)
    if ampy is None:
        return HTTPInternalServerError()

    if request.matched_route.name == "onesite":
        if ampy.delete_amp_site(request.matchdict["name"]):
            return HTTPNoContent()
    elif request.matched_route.name == "onemesh":
        if ampy.delete_amp_mesh(request.matchdict["mesh"]):
            return HTTPNoContent()

    return HTTPBadRequest()


# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
