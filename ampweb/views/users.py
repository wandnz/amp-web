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

import urllib.request, urllib.parse, urllib.error
from pyramid.renderers import get_renderer
from pyramid.view import view_config
from pyramid.security import authenticated_userid, has_permission
from pyramid.httpexceptions import *
from ampweb.views.common import getCommonScripts, initAmpy, getBannerOptions, escapeURIComponent
from ampweb.views.common import getGATrackingID



def display_add_modal(request):
    """ Generate the content for the modal page to add new users """
    request.override_renderer = "../templates/user_modal.pt"

    return {
        "title": "Create new user",
        "full_edit": True,
    }



def display_modify_modal(request, username):
    """ Generate the content for the modal modify site/mesh page """
    request.override_renderer = "../templates/user_modal.pt"

    ampy = initAmpy(request)
    if ampy is None:
        print("Error starting ampy during item request")
        return None

    user = ampy.get_user(urllib.parse.unquote(username))

    # Disable parts of the interface that the user isn't able to change.
    # Global admin permissions are checked in the backend too, though the
    # backend will currently allow a user to delete themselves or for admins
    # to remove their own roles.
    if has_permission("editusers", request.context, request) and \
            user["username"] != request.authenticated_userid:
        full_edit = True
    else:
        full_edit = False

    return {
        "title": "Modify user",
        "user": user,
        "full_edit": full_edit,
    }



def display_users_landing(request):
    """ Display a list of all the users """
    page_renderer = get_renderer("../templates/user_landing.pt")
    body = page_renderer.implementation().macros['body']

    SCRIPTS = getCommonScripts() + [
        "modals/modal.js",
        "modals/user_modal.js",
        "pages/users.js",
    ]

    ampy = initAmpy(request)
    if ampy is None:
        print("Error starting ampy during item request")
        return None

    users = ampy.get_users()
    banopts = getBannerOptions(request)

    # TODO enforce username policy so this isn't required?
    #for user in users:
    #    user["urlname"] = escapeURIComponent(user["username"])

    return {
        "title": "AMP Measurement Users",
        "body": body,
        "scripts": SCRIPTS,
        "styles": ["bootstrap.min.css"],
        "users": users,
        "gtag": getGATrackingID(request),
        "show_dash": banopts['showdash'],
        "show_matrix": banopts['showmatrix'],
        "show_config": has_permission("viewconfig", request.context, request),
        "show_users": has_permission("editusers", request.context, request),
        "logged_in": authenticated_userid(request),
        "bannertitle": banopts['title'],
    }


# XXX can i open this up and check user in the function, redirecting to the
# forbidden view if wrong?
# XXX too many branches?
@view_config(
    route_name='users',
    renderer='../templates/skeleton.pt',
    #permission="editusers",
    permission="read",
)
def users(request):
    urlparts = request.matchdict['params']

    # stop the user if they don't have global edit permissions and (if present)
    # aren't the user that is being modified
    global_permissions = has_permission("editusers", request.context, request)
    local_permissions = len(urlparts) == 2 and urlparts[1] == authenticated_userid(request)

    # landing page for schedules, listing all amplets etc
    if len(urlparts) == 0:
        if global_permissions:
            return display_users_landing(request)
        else:
            return HTTPForbidden()

    # modal dialog for adding users
    if urlparts[0] == "add":
        if global_permissions:
            return display_add_modal(request)
        else:
            return HTTPForbidden()

    # modal dialog for modifying users
    if urlparts[0] == "modify":
        if len(urlparts) == 2 and len(urlparts[1]) > 0:
            if global_permissions or local_permissions:
                return display_modify_modal(request, urlparts[1])
            else:
                return HTTPForbidden()
        else:
            return HTTPClientError()

    # no idea what the user is after, it's a 404
    return HTTPNotFound()

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
