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

from operator import itemgetter
from pyramid.view import view_config
from pyramid.renderers import get_renderer
from pyramid.security import authenticated_userid, has_permission
from ampweb.views.common import initAmpy, createGraphClass, getCommonScripts
from ampweb.views.common import getBannerOptions, collectionToGraphStyle

@view_config(
    route_name="home",
    renderer="../templates/skeleton.pt",
    # depending on the auth.publicdata configuration option then this will
    # either be open to the public or require the "read" permission
    # permission=
)
@view_config(
    route_name="browser",
    renderer="../templates/skeleton.pt",
    # depending on the auth.publicdata configuration option then this will
    # either be open to the public or require the "read" permission
    # permission=
)
def browser(request):
    page_renderer = get_renderer("../templates/browser.pt")
    body = page_renderer.implementation().macros["body"]

    banopts = getBannerOptions(request)

    ampy = initAmpy(request)
    if ampy is None:
        print "Failed to start ampy while creating collection browser"
        return None

    collections = []

    nntsccols = ampy.get_collections()

    if 'ampweb.browsercollections' in request.registry.settings:
        chosen = [x.strip() for x in request.registry.settings['ampweb.browsercollections'].split(',')]
    else:
        chosen = []

    needloss = False

    for collection in nntsccols:
        if len(chosen) > 0 and collection not in chosen:
            continue
        graphclass = createGraphClass(collection)
        if graphclass != None:
            collections += graphclass.get_browser_collections()

        if collectionToGraphStyle(collection) == 'amp-latency':
            needloss = True

    if needloss:
        graphclass = createGraphClass('amp-loss')
        collections += graphclass.get_browser_collections()

    sortcols = sorted(collections, key=itemgetter('family', 'label'))

    # pyramid.security.has_permission is deprecated from version 1.5, if we
    # upgrade we should be able to use something like:
    #   request.has_permission("edit")

    return {
        "title": "Graph Browser",
        "body": body,
        "styles": ['bootstrap.min.css'],
        "scripts": getCommonScripts(),
        "logged_in": authenticated_userid(request),
        "can_edit": has_permission("edit", request.context, request),
        "bannertitle": banopts['title'],
        "show_dash": banopts['showdash'],
        "show_matrix": banopts['showmatrix'],
        "collections": sortcols
    }

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
