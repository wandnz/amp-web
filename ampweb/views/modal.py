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
from pyramid.httpexceptions import HTTPClientError

templates = {
    "amp-icmp": "amplatency.pt",
    "amp-traceroute-hops": "amptraceroute.pt",
    "amp-latency": "amplatency.pt",
    "amp-loss": "amplatency.pt",
    "amp-http": "amphttp.pt",
    "amp-httppagesize": "amphttp.pt",
    "amp-dns": "amplatency.pt",
    "amp-tcpping": "amplatency.pt",
    "amp-throughput": "ampthroughput.pt",
    "amp-astraceroute": "amptracerouterainbow.pt",
    "amp-traceroute": "amptracerouterainbow.pt",
    "amp-udpstream": "ampudpstream.pt",
    "rrd-smokeping": "smokeping.pt",
}

@view_config(
    route_name="modal",
    renderer="../templates/modals/modal.pt",
    # depending on the auth.publicdata configuration option then this will
    # either be open to the public or require the "read" permission
    # permission=
)
def modal(request):
    """ Generate the content for the modal data series page """
    urlparts = request.matchdict['params']
    if len(urlparts) != 1:
        return HTTPClientError()

    collection = urlparts[0]
    if collection in templates:
        template = templates[collection]
    else:
        return HTTPClientError()

    page_renderer = get_renderer("../templates/modals/%s" % template)
    modal_body = page_renderer.implementation().macros["modal_body"]

    # should we only load the scripts when the modal is required?
    #modalscripts = [
    #    "modals/modal.js",
    #    "modals/ampicmp_modal.js",
    #]

    return {
            #"title": "Add new data series",
            "modal_body": modal_body,
            #"styles": None,
            #"scripts": modalscripts,
           }

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
