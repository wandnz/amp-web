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

import sys
import subprocess
from pyramid.view import view_config
from pyramid.httpexceptions import *


PERMISSION = 'edit'


try:
    sys.path.append("/usr/share/amppki/") # XXX
    from amppki.common import verify_common_name, load_pending_requests, load_index, is_expired


    @view_config(
        route_name='certificates',
        request_method='DELETE',
        renderer='json',
        permission=PERMISSION,
    )
    def revoke_certificate(request):
        name = request.matchdict["name"]
        cert = [x for x in load_index() if x["status"] == "V" and not is_expired(x)]
        if verify_common_name(name) and len(cert) > 0:
            result = subprocess.call(
                    ["sudo", "-n", "/usr/sbin/ampca", "revoke", name])
            if result == 0:
                return HTTPNoContent()
            return HTTPInternalServerError()
        return HTTPBadRequest()


    @view_config(
        route_name='certificates',
        request_method='POST',
        renderer='json',
        permission=PERMISSION,
    )
    def sign_certificate(request):
        name = request.matchdict["name"]
        if verify_common_name(name) and len(load_pending_requests(name)) > 0:
            result = subprocess.call(
                    ["sudo", "-n", "/usr/sbin/ampca", "sign", name])
            if result == 0:
                return HTTPNoContent()
            return HTTPInternalServerError()
        return HTTPBadRequest()


except ImportError:


    @view_config(
        route_name='certificates',
        request_method='DELETE',
        renderer='json',
        permission=PERMISSION,
    )
    def revoke_certificate(request):
        return HTTPNotImplemented()


    @view_config(
        route_name='certificates',
        request_method='POST',
        renderer='json',
        permission=PERMISSION,
    )
    def sign_certificate(request):
        return HTTPNotImplemented()

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
