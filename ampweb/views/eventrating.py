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
from ampweb.views.common import initAmpy

@view_config(
    route_name="rating",
    renderer="../templates/modals/eventrating.pt",
)
def rating(request):
    urlparts = request.matchdict['params']
    if len(urlparts) != 2:
        return {}

    ampy = initAmpy(request)
    if ampy is None:
        print "Failed to start ampy while creating event rating modal"
        return None

    eventid = urlparts[0]
    streamid = urlparts[1]

    # TODO grab some descriptive information that we can display about
    # this modal

    evdeets = ampy.get_single_event(streamid, eventid)

    request.override_renderer = "../templates/modals/eventrating.pt"

    return {
        "title": "Provide Feedback on this Event",
        "evstreamlabel": "TODO",
        "description": evdeets['description'],
        "eventid": eventid,
        "streamid": streamid,
    }

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
