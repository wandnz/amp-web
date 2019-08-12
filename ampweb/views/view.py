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

from pyramid.view import view_config
from pyramid.renderers import get_renderer
from pyramid.security import authenticated_userid, has_permission
from pyramid.httpexceptions import *
from ampweb.views.common import initAmpy, createGraphClass, \
        graphStyleToCollection, collectionToGraphStyle, getCommonScripts, \
        getBannerOptions
from ampweb.views.common import getGATrackingID

stylescripts = [
    "graphstyles/ticlabels.js",
    "graphstyles/interaction.js",
    "graphstyles/config.js",
    "graphstyles/basicts.js",
    "graphstyles/smoke.js",
]

pagescripts = [
    "graphpages/cuzviewpage.js",
]

modalscripts = [
    "modals/modal.js",
    "modals/timeselect_modal.js",
    "modals/eventrating_modal.js",
]

pluginscripts = [
    "graphplugins/selection.js",
    "graphplugins/handles.js",
    "graphplugins/hit.js",
    "graphplugins/events_overlay.js",
]

typescripts = [
    "graphtypes/events.js",
    "graphtypes/basicts.js",
    "graphtypes/smokeping.js",
]


def generateStartScript(funcname, graph_type):
    return funcname + "({graph: '" + graph_type + "'});"

def generateGraph(request, graph, url):
    title = graph.get_default_title()
    startgraph = generateStartScript("changeGraph", url[0])
    page_renderer = get_renderer("../templates/graph.pt")
    body = page_renderer.implementation().macros['body']

    banopts = getBannerOptions(request)

    scripts = getCommonScripts() + [
        "pages/view.js",
        "lib/bootstrap-datetimepicker.min.js"
    ]

    scripts += pluginscripts
    scripts += stylescripts
    scripts += typescripts
    scripts += modalscripts
    scripts += pagescripts
    scripts += graph.get_required_scripts()

    settings = request.registry.settings

    if 'ampweb.eventratingfile' in settings:
        allowfeedback = True
    else:
        allowfeedback = False

    return {
        "title": title,
        "page": "view",
        "body": body,
        "styles": ['bootstrap.min.css', 'bootstrap-datetimepicker.min.css'],
        "scripts": scripts,
        "logged_in": authenticated_userid(request),
        "show_config": has_permission("viewconfig", request.context, request),
        "show_users": has_permission("editusers", request.context, request),
        "gtag": getGATrackingID(request),
        "show_dash": banopts['showdash'],
        "show_matrix": banopts['showmatrix'],
        "bannertitle": banopts['title'],
        "startgraph": startgraph,
        "allow_feedback": allowfeedback,
    }

@view_config(
    route_name="eventview",
    # depending on the auth.publicdata configuration option then this will
    # either be open to the public or require the "read" permission
    # permission=
)
def eventview(request):
    start = None
    end = None

    # extract the stream id etc from the request so we can rebuild it
    urlparts = request.matchdict["params"]
    if len(urlparts) < 2:
        raise exception_response(404)

    basestyle = urlparts[0]
    stream = int(urlparts[1])
    if len(urlparts) > 2:
        start = urlparts[2]
    if len(urlparts) > 3:
        end = urlparts[3]

    collection = graphStyleToCollection(basestyle)
    graphstyle = collectionToGraphStyle(basestyle)

    ampy = initAmpy(request)
    if ampy is None:
        print "Failed to start ampy for generating event view"
        return None

    # convert it into a view id, creating it if required
    view_id = ampy.get_event_view(collection, stream)
    if view_id is None:
        print "Failed to generate view for event on stream %d" % (stream)
        return None

    # call the normal graphing function with the view id
    params = (graphstyle, str(view_id))
    if start:
        params += (start,)
        if end:
            params += (end,)
    newurl = request.route_url("view", params=params)

    # send an HTTP 301 and browsers should remember the new location
    return HTTPMovedPermanently(location=newurl)


@view_config(
    route_name="tabview",
    # depending on the auth.publicdata configuration option then this will
    # either be open to the public or require the "read" permission
    # permission=
)
def tabview(request):
    start = None
    end = None

    urlparts = request.matchdict['params']
    if len(urlparts) < 3:
        raise exception_response(404)

    basecol = urlparts[0]
    view = urlparts[1]
    tabcol = urlparts[2]

    if len(urlparts) > 3:
        start = urlparts[3]
    if len(urlparts) > 4:
        end = urlparts[4]

    ampy = initAmpy(request)
    if ampy is None:
        print "Failed to start ampy for generating tabbed view"
        return None

    view_id = ampy.create_graphtab_view(basecol, graphStyleToCollection(tabcol),
            view)

    if view_id is None:
        print "Error while creating tabbed view for collection %s" % (tabcol)
        return None

    # call the normal graphing function with the view id
    params = (tabcol, str(view_id))
    if start:
        params += (start,)
        if end:
            params += (end,)
    newurl = request.route_url("view", params=params)

    # send an HTTP 301 and browsers should remember the new location
    return HTTPMovedPermanently(location=newurl)

@view_config(
    route_name="view",
    renderer="../templates/skeleton.pt",
    # depending on the auth.publicdata configuration option then this will
    # either be open to the public or require the "read" permission
    # permission=
    http_cache=3600,
)
def graph(request):
    urlparts = request.matchdict['params']

    if len(urlparts) == 0:
        raise exception_response(404)

    graphclass = createGraphClass(urlparts[0])

    if graphclass is None:
        raise exception_response(404)

    return generateGraph(request, graphclass, urlparts)

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
