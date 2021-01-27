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

#import json
#import re
import urllib.request, urllib.parse, urllib.error
from pyramid.view import view_config
from pyramid.security import authenticated_userid, has_permission
from pyramid.httpexceptions import *
from ampweb.views.common import initAmpy, escapeURIComponent
from ampweb.views.item import get_mesh_members


PERMISSION = 'editusers'

@view_config(
    route_name='allusers',
    request_method='GET',
    renderer='json',
    permission=PERMISSION,
)
def get_users(request):
    ampy = initAmpy(request)
    if ampy is None:
        return HTTPInternalServerError()
    users = ampy.get_users()
    return HTTPOk(body=json.dumps({"users": users}))


@view_config(
    route_name='allusers',
    request_method='POST',
    renderer='json',
    permission=PERMISSION,
)
def create_user(request):
    ampy = initAmpy(request)
    if ampy is None:
        return HTTPInternalServerError()

    try:
        body = request.json_body
        username = body["username"]
        longname = body["longname"]
        email = body["email"]
        roles = body["roles"]
        password = body["password"]
    except (ValueError, KeyError):
        return HTTPBadRequest(body=json.dumps({"error": "missing value"}))

    if ampy.add_user(username, longname, email, roles, password):
        return HTTPNoContent()
    return HTTPBadRequest()


@view_config(
    route_name='user',
    request_method='PUT',
    renderer='json',
    #permission=PERMISSION,
    permission="read"
)
def update_user(request):
    # get the username that we are trying to update
    username = urllib.parse.unquote(request.matchdict["username"])

    # ensure that the person making the request is the same as the user to be
    # updated, or someone with permissions to make changes to any user
    global_permissions = has_permission("editusers", request.context, request)
    local_permissions = (username == authenticated_userid(request))

    if not global_permissions and not local_permissions:
        return HTTPForbidden()

    ampy = initAmpy(request)
    if ampy is None:
        return HTTPInternalServerError()

    try:
        body = request.json_body
        longname = body["longname"]
        email = body["email"]
        roles = body["roles"] if global_permissions else None
        password = body["password"]
    except (ValueError, KeyError):
        return HTTPBadRequest(body=json.dumps({"error": "missing value"}))

    if ampy.update_user(username, longname, email, roles, password):
        return HTTPNoContent()
    return HTTPBadRequest()


@view_config(
    route_name='user',
    request_method='DELETE',
    renderer='json',
    permission=PERMISSION,
)
def delete_user(request):
    # TODO forcibly logout and revoke credentials of user if they are logged in
    ampy = initAmpy(request)
    if ampy is None:
        return HTTPInternalServerError()

    result = ampy.delete_user(urllib.parse.unquote(request.matchdict["username"]))

    if result is None:
        return HTTPInternalServerError()
    if result:
        return HTTPNoContent()
    return HTTPNotFound()


@view_config(
    route_name='user_status',
    request_method='PUT',
    renderer='json',
    permission=PERMISSION,
)
def set_user_status(request):
    # TODO forcibly logout and revoke credentials of user if they are logged in
    ampy = initAmpy(request)
    if ampy is None:
        return HTTPInternalServerError()

    try:
        body = request.json_body
        status = body["status"]
    except (ValueError, KeyError):
        return HTTPBadRequest(body=json.dumps({"error": "missing status"}))

    if status in ["enable", "enabled", "on", "active", "yes"]:
        result = ampy.enable_user(request.matchdict["username"])
    elif status in ["disable", "disabled", "off", "inactive", "no"]:
        result = ampy.disable_user(request.matchdict["username"])
    else:
        return HTTPBadRequest(body=json.dumps({"error":"invalid status value"}))

    if result is None:
        return HTTPInternalServerError()
    if result:
        return HTTPNoContent()
    return HTTPNotFound()

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
