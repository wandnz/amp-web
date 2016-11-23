import json
from pyramid.view import view_config
from pyramid.httpexceptions import *
from ampweb.views.common import initAmpy
from ampweb.views.item import get_mesh_members


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
    ampy = initAmpy(request)
    if ampy is None:
        return HTTPInternalServerError()

    if request.matched_route.name == "sitemeshes":
        members = ampy.get_meshes(None, site=request.matchdict["name"])
    elif request.matched_route.name == "meshsites":
        # TODO using this function is not ideal, could be done better in ampy
        members = get_mesh_members(ampy, request.matchdict["mesh"])

    # TODO deal with not existing vs zero mesh membership
    if members is None:
        return HTTPInternalServerError()
    if members is False:
        return HTTPNotFound()

    return HTTPOk(body=json.dumps({"membership": members}))


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
    request_method='GET',
    renderer='json',
    permission=PERMISSION,
)
@view_config(
    route_name='allmeshes',
    request_method='GET',
    renderer='json',
    permission=PERMISSION,
)
def get_all_items(request):
    ampy = initAmpy(request)
    if ampy is None:
        return HTTPInternalServerError()

    if request.matched_route.name == "allsites":
        items = ampy.get_amp_sites()
        label = "sites"
    elif request.matched_route.name == "allmeshes":
        items = ampy.get_meshes(None)
        label = "meshes"

    if items is None:
        return HTTPInternalServerError()
    return HTTPOk(body=json.dumps({label: items}))


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
        label = "site"
    elif request.matched_route.name == "allmeshes":
        result = ampy.add_amp_mesh(ampname, longname, description, public)
        url = request.route_url("onemesh", mesh=ampname)
        label = "mesh"
    else:
        return HTTPBadRequest()

    if result:
        return HTTPCreated(headers=[("Location", url)], body=json.dumps({
                    label: {
                        "ampname": ampname,
                        "url": url,
                    }}))

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
        label = "site"
    elif request.matched_route.name == "onemesh":
        item = ampy.get_amp_mesh_info(request.matchdict["mesh"])
        label = "mesh"

    if item is None:
        return HTTPInternalServerError()
    if "unknown" in item and item["unknown"] is True:
        return HTTPNotFound()

    return HTTPOk(body=json.dumps({label: item}))


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
        result = ampy.delete_amp_site(request.matchdict["name"])
    elif request.matched_route.name == "onemesh":
        result = ampy.delete_amp_mesh(request.matchdict["mesh"])

    if result is None:
        return HTTPInternalServerError()
    if result:
        return HTTPNoContent()
    return HTTPNotFound()


# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
