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

from pyramid.renderers import get_renderer
from pyramid.httpexceptions import HTTPFound
from ampweb.views.common import getBannerOptions, getAuthOptions

from pyramid.view import (
    view_config,
    forbidden_view_config,
    )

from pyramid.security import (
    remember,
    authenticated_userid,
    )

from ..security import USERS

@view_config(
    route_name="login",
    renderer="../templates/skeleton.pt"
)
@forbidden_view_config(
    renderer="../templates/skeleton.pt"
)
def login(request):
    page_renderer = get_renderer("../templates/login.pt")
    body = page_renderer.implementation().macros["body"]

    banopts = getBannerOptions(request)
    authopts = getAuthOptions(request)

    if authenticated_userid(request):
        return HTTPFound(location=request.resource_url(request.context))

    self_url = request.resource_url(request.context, 'login')
    referrer = request.url
    if referrer == self_url:
        # never use the login form itself as came_from
        referrer = request.route_url("home")
    came_from = request.params.get('came_from', referrer)

    errmessage = ''
    username = ''
    password = ''
    tos_accepted = ''

    if 'login.submitted' in request.params:
        tos_accepted = request.params.get('accepted')
        username = request.params.get('username')
        password = request.params.get('password')
        if username is not None and password is not None \
                and username in USERS and USERS.get(username) == password:
            if not authopts['tos'] or tos_accepted == "on":
                headers = remember(request, username)
                return HTTPFound(location=came_from, headers=headers)
            else:
                errmessage = 'Please accept Terms of Service before continuing'
        else:
            errmessage = 'Incorrect username or password'

    banopts = getBannerOptions(request)

    return {
            "title": "Login",
            "page": "login",
            "body": body,
            "styles": ['bootstrap.min.css'],
            "scripts": None,
            "logged_in": False,
            "errmessage": errmessage,
            "came_from": came_from,
            "username": username,
            "tos_required": authopts['tos'],
            "tos_accepted": tos_accepted,
            "show_dash": banopts['showdash'],
            "show_matrix": banopts['showmatrix'],
            "can_edit": False,
            "bannertitle": banopts['title'],
           }

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
