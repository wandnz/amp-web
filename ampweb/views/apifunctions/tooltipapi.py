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
from ampweb.views.common import createMatrixClass, getMatrixCellDuration

def site_info_tooltip(ampy, site):
    """ Generate the HTML for a tooltip describing a single site """
    info = ampy.get_amp_site_info(site)
    if info is None:
        print("Error while fetching AMP site info")
        return {}

    if len(info) > 0:
        return {
            "site": True,
            "longname": info["longname"],
            "location": info["location"],
            "description": info["description"],
            "ampname": info["ampname"],
        }
    return {}

def _duration_label(duration):
    """ Converts a duration into a suitable label for display on the
        tooltip.
    """
    if duration < 60:
        if int(duration) == 1:
            plural = ""
        else:
            plural = "s"
        return "%d second%s" % (int(duration), plural)

    elif duration < 60 * 60:
        if int(duration / 60.0) == 1:
            plural = ""
        else:
            plural = "s"
        return "%d minute%s" % (int(duration / 60.0), plural)

    else:
        if int(duration / 60.0 / 60.0) == 1:
            plural = ""
        else:
            plural = "s"
        return "%d hour%s" % (int(duration / 60.0 / 60.0), plural)

    return "Unknown duration"

def get_full_name(ampy, site):
    """ Get the full name of a site """
    info = ampy.get_amp_site_info(site)
    if info is None:
        print("Error while fetching AMP site info")
        return "Unknown"
    if len(info) > 0:
        return info["longname"]
    return site

def generate_sparklines(graphclass, rawdata, test, metric):
    lines = {}
    linemax = 0

    for label, datapoints in rawdata.items():
        if len(datapoints) == 0:
            continue
        thisline = []
        for point in datapoints:
            nextval = graphclass.generateSparklineData(point, test, metric)

            if nextval is not None and nextval > linemax:
                linemax = nextval
            thisline.append([point['binstart'], nextval])

        lines[label] = thisline

    return {'sparklineDataMax': linemax, 'sparklineData': lines}

def build_data_tooltip(request, ampy, graphclass, view_id, basedur, test,
        metric):
    """ Build a tooltip showing data between a pair of sites for one metric """
    data = {}
    now = int(time.time())

    # Sparkline is based on the last 24 hours of data
    rawsparkdata = ampy.get_historic_data(graphclass.get_matrix_viewstyle(),
            view_id, now - (60 * 60 * 24), now, "spark",
            graphclass.get_minimum_binsize(request))

    if rawsparkdata is not None:
        data = generate_sparklines(graphclass, rawsparkdata, test, metric)

    # Generate the tooltip text
    durations = [basedur]

    if basedur < 60 * 30:
        durations.append(60 * 60)
    else:
        durations.append(60 * 60 * 6)

    durations.append(60 * 60 * 24)

    data['stats'] = []
    for duration in durations:
        resulttuple = ampy.get_recent_data(graphclass.get_matrix_viewstyle(),
                view_id, duration, "tooltiptext")

        if resulttuple is None:
            result = None
        else:
            result = resulttuple[0]

        nextttip = {'class':''}
        nextttip['value'] = graphclass.formatTooltipText(result, test, metric)
        nextttip['label'] = _duration_label(duration)
        data['stats'].append(nextttip)

    if len(data['stats']) != 0:
        data['stats'][-1]['class'] = "bottom"

    return data

def tooltip(ampy, request):
    """ Internal tooltip specific API """
    urlparts = request.GET

    cell_id = urlparts['id']

    if cell_id.startswith("src__") or cell_id.startswith("dst__"):
        cell_id = cell_id.replace("src__", "").replace("dst__", "")
        return site_info_tooltip(ampy, cell_id)

    if "test" not in urlparts:
        return {}

    if "metric" not in urlparts:
        return {}

    test = urlparts["test"]
    metric = urlparts["metric"]

    graphclass = createMatrixClass(test, None)
    if graphclass is None:
        return {}

    basedur = getMatrixCellDuration(request, graphclass)

    idsplit = cell_id.split("__")
    view_id = idsplit[0]
    src = idsplit[1]
    dst = idsplit[2]

    data = build_data_tooltip(request, ampy, graphclass, view_id, basedur,
            test, metric)
    if data is None:
        print("Unable to create tooltip for matrix cell")

    source = get_full_name(ampy, src)
    if source is None:
        return None
    data['source'] = source

    dest = get_full_name(ampy, dst)
    if dest is None:
        return None
    data['destination'] = dest

    data['test'] = test
    data['site'] = False
    return data

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
