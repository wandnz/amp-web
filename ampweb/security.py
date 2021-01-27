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
        return None

    ampy = initAmpy(request)
    if ampy is None:
        print("Failed to start ampy for checking user group details")
        return None

    user = ampy.get_user(username)
    if user:
        return ["g:%s" % g for g in user.get("roles", [])]
    return None
