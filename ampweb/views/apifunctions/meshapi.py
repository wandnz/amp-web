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
    route_name='sites',
    request_method='POST',
    renderer='json',
    permission=PERMISSION,
)
@view_config(
    route_name='meshes',
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
        if request.matched_route.name == "sites":
            location = body["location"]
    except (ValueError, KeyError):
        return HTTPBadRequest(body=json.dumps({"error": "missing value"}))

    if request.matched_route.name == "sites":
        if ampy.add_amp_site(ampname, longname, location, description):
            return HTTPNoContent()
    elif request.matched_route.name == "meshes":
        if ampy.add_amp_mesh(ampname, longname, description):
            return HTTPNoContent()

    return HTTPBadRequest()


@view_config(
    route_name='site',
    request_method='PUT',
    renderer='json',
    permission=PERMISSION,
)
@view_config(
    route_name='mesh',
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
        if request.matched_route.name == "site":
            location = body["location"]
    except (ValueError, KeyError):
        return HTTPBadRequest(body=json.dumps({"error": "missing value"}))

    if request.matched_route.name == "site":
        if ampy.update_amp_site(request.matchdict["name"], longname, location,
                description):
            return HTTPNoContent()
    elif request.matched_route.name == "mesh":
        if ampy.update_amp_mesh(request.matchdict["mesh"], longname,
                description):
            return HTTPNoContent()

    return HTTPBadRequest()


@view_config(
    route_name='site',
    request_method='DELETE',
    renderer='json',
    permission=PERMISSION,
)
@view_config(
    route_name='mesh',
    request_method='DELETE',
    renderer='json',
    permission=PERMISSION,
)
def delete_item(request):
    ampy = initAmpy(request)
    if ampy is None:
        return HTTPInternalServerError()

    if request.matched_route.name == "site":
        if ampy.delete_amp_site(request.matchdict["name"]):
            return HTTPNoContent()
    elif request.matched_route.name == "mesh":
        if ampy.delete_amp_mesh(request.matchdict["mesh"]):
            return HTTPNoContent()

    return HTTPBadRequest()


# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
