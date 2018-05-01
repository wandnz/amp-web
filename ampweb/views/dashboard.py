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

import time
from pyramid.view import view_config
from pyramid.renderers import get_renderer
from pyramid.security import authenticated_userid, has_permission
from ampweb.views.common import getCommonScripts, initAmpy, getBannerOptions
from ampweb.views.common import getGATrackingID
from ampweb.views.eventparser import EventParser

DASHBOARD_EVENTS = 10

@view_config(
    route_name="dashboard",
    renderer="../templates/skeleton.pt",
    # depending on the auth.publicdata configuration option then this will
    # either be open to the public or require the "read" permission
    # permission=
)
def dashboard(request):
    """ Generate the content for the basic overview dashboard page """
    page_renderer = get_renderer("../templates/dashboard.pt")
    body = page_renderer.implementation().macros["body"]

    # display events from the last 24 hours
    end = time.time()
    start = end - (60 * 60 * 24)

    banopts = getBannerOptions(request)
    ampy = initAmpy(request)
    if ampy is None:
        print "Unable to start ampy while generating event dashboard"
        return None

    data = ampy.get_event_groups(start, end)
    groups = []
    total_event_count = 0
    total_group_count = 0

    settings = request.registry.settings

    if 'ampweb.eventratingfile' in settings:
        allowfeedback = True
    else:
        allowfeedback = False

    if 'ampweb.hidedashgraphs' in settings:
        if settings['ampweb.hidedashgraphs'] in ['yes', 'true']:
            showrightgraphs = False
        else:
            showrightgraphs = True
    else:
        showrightgraphs = True


    # count global event/group statistics
    if data is not None:
        parser = EventParser(ampy)

        # get extra information about the 10 most recent event groups
        groups, total_group_count, total_event_count, _ = \
                parser.parse_event_groups(data, start, end)

    dashboard_scripts = getCommonScripts() + [
        "pages/dashboard.js",
        "eventgroups/events.js",
        "modals/eventrating_modal.js",
        "graphplugins/hit.js",
        "graphstyles/event_frequency.js",
        "lib/bootstrap-datetimepicker.min.js"
    ]

    return {
        "title": "Event Dashboard",
        "page": "dashboard",
        "body": body,
        "styles": ['bootstrap.min.css', 'dashboard.css'],
        "scripts": dashboard_scripts,
        "logged_in": authenticated_userid(request),
        "show_config": has_permission("viewconfig", request.context, request),
        "show_users": has_permission("editusers", request.context, request),
        "gtag": getGATrackingID(request),
        "show_dash": banopts['showdash'],
        "show_matrix": banopts['showmatrix'],
        "bannertitle": banopts['title'],
        "total_event_count": total_event_count,
        "total_group_count": total_group_count,
        "extra_groups": total_group_count - len(groups),
        "allow_feedback": allowfeedback,

        # XXX Globally disabled pending implementation of async loading
        # of graph data -- trying to process all the necessary
        # events before loading the dashboard was leading to massive
        # delays in loading the dashboard. Shane, 23/02/17
        "showrightgraphs": False
       }

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
