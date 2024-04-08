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

import bcrypt
from ampweb.views.common import initAmpy
from pyramid.authentication import AuthTktCookieHelper
from pyramid.authorization import ACLHelper, Authenticated, Everyone

def check_password(password, pwhash):
    if password and pwhash:
        check = bcrypt.hashpw(password.encode("utf8"), pwhash.encode("utf8"))
        if check == pwhash.encode("utf8"):
            return True
    return False

def check_login(request, username, password):
    if username is None or password is None or len(password) == 0:
        return False

    ampy = initAmpy(request)
    if ampy is None:
        print("Failed to start ampy for checking login details")
        return False

    user = ampy.get_user(username)
    if user and user["enabled"]:
        return check_password(password, user["password"])
    return False

def groupfinder(username, request):
    if username is None:
        return set()

    ampy = initAmpy(request)
    if ampy is None:
        print("Failed to start ampy for checking user group details")
        return set()

    user = ampy.get_user(username)
    if user:
        return {"g:%s" % g for g in user.get("roles", [])}
    return set()

class AmpSecurityPolicy:
    def __init__(self, secret):
        self.helper = AuthTktCookieHelper(secret)

    def identity(self, request):
        # define our simple identity as None or a dict with userid and
        # principals keys
        identity = self.helper.identify(request)
        if identity is None:
            return None

        # identical to the deprecated request.unauthenticated_userid
        userid = identity['userid']

        # verify the userid, just like we did before with groupfinder
        principals = groupfinder(userid, request)

        # assuming the userid is valid, return a map with userid and principals
        if principals is not None:
            return {
                'userid': userid,
                'principals': principals,
            }

    def authenticated_userid(self, request):
        # defer to the identity logic to determine if the user id logged in
        # and return None if they are not
        identity = request.identity
        if identity is not None:
            return identity['userid']

    def permits(self, request, context, permission):
        # use the identity to build a list of principals, and pass them
        # to the ACLHelper to determine allowed/denied
        identity = request.identity
        principals = set([Everyone])
        if identity is not None:
            principals.add(Authenticated)
            #principals.add(identity['userid'])
            principals.update(identity['principals'])
        return ACLHelper().permits(context, principals, permission)

    def remember(self, request, userid, **kw):
        return self.helper.remember(request, userid, **kw)

    def forget(self, request, **kw):
        return self.helper.forget(request, **kw)
