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
from pyramid.view import view_config
from pyramid.security import authenticated_userid, has_permission
from ampweb.views.common import getCommonScripts, initAmpy, createMatrixClass
from ampweb.views.common import getBannerOptions, getGATrackingID

def _create_tabs(request):

    tabs = []

    if 'ampweb.matrixtabs' in request.registry.settings:
        chosen = [x.strip() for x in request.registry.settings['ampweb.matrixtabs'].split(',')]
    else:
        chosen = ['latency', 'hops', 'http', 'loss']

    for c in chosen:
        gc = createMatrixClass(c, None)
        if gc is None:
            print "Unknown matrix tab style: %s" % (c)
            continue

        tabs += gc.getMatrixTabs()

    return tabs

@view_config(
    route_name="matrix",
    renderer="../templates/skeleton.pt",
    # depending on the auth.publicdata configuration option then this will
    # either be open to the public or require the "read" permission
    # permission=
    http_cache=3600,
)
def matrix(request):
    page_renderer = get_renderer("../templates/matrix.pt")
    body = page_renderer.implementation().macros['body']

    SCRIPTS = getCommonScripts() + [
        "lib/jquery.sparkline.min.js",
        "pages/matrix.js",
        "matrix/basematrix.js",
        "matrix/latencymatrix.js",
        "matrix/lossmatrix.js",
        "matrix/hopmatrix.js",
        "matrix/throughputmatrix.js",
        "matrix/httpmatrix.js",
    ]

    ampy = initAmpy(request)
    if ampy is None:
        print "Error starting ampy during matrix request"
        return None

    src = ampy.get_meshes("source", public=True)

    banopts = getBannerOptions(request)

    return {
        "title": "AMP Measurements",
        "page": "matrix",
        "body": body,
        "scripts": SCRIPTS,
        "styles": ['bootstrap.min.css'],
        "logged_in": authenticated_userid(request),
        "show_config": has_permission("viewconfig", request.context, request),
        "show_users": has_permission("editusers", request.context, request),
        "gtag": getGATrackingID(request),
        "show_dash": banopts['showdash'],
        "show_matrix": banopts['showmatrix'],
        "bannertitle": banopts['title'],
        "srcMeshes": src,
        "tabs": _create_tabs(request),
    }

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
