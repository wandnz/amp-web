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

from ampweb.views.common import createMatrixClass, getMatrixCellDuration

def matrix(ampy, request):
    """ Internal matrix specific API """
    urlparts = request.GET
    src_mesh = None
    dst_mesh = None
    test = None
    metric = None

    # Keep reading until we run out of arguments
    try:
        test = urlparts['testType']
        src_mesh = urlparts['source']
        dst_mesh = urlparts['destination']
        metric = urlparts['metric']
        split = urlparts['split']
    except KeyError:
        pass

    gc = createMatrixClass(test, metric)
    options = [src_mesh, dst_mesh, split, metric]

    if gc is None:
        return {'error': "Unknown matrix type: %s-%s" % (test, metric)}

    tableData = []
    day_data = None

    duration = getMatrixCellDuration(request, gc)

    recent = ampy.get_matrix_data(gc.get_matrix_data_collection(),
            gc.get_matrix_viewstyle(), options, duration)
    if recent is None:
        return {'error': "Failed to query matrix data"}

    # query for all the recent information from these streams in one go
    recent_data, recent_timedout, sources, destinations, cellviews = recent

    if len(recent_timedout) != 0:
        # Query for recent data timed out
        request.response_status = 503
        return {'error': "Request for matrix recent data timed out"}

    # if it's the latency test then we also need the last 24 hours of data
    # so that we can colour the cell based on how it compares
    lastday = ampy.get_matrix_data(gc.get_matrix_data_collection(),
            gc.get_matrix_viewstyle(), options, 86400)
    if lastday is None:
        return {'error': "Request for matrix day data failed"}

    day_data, day_timedout, _, _, _ = lastday

    if len(day_timedout) != 0:
        # Query for recent data timed out
        request.response_status = 503
        return {'error': "Request for matrix day data timed out"}

    # put together all the row data for our table
    for src in sources:
        rowData = [src]
        for dst in destinations:
            # TODO generate proper index name(s)
            if src != dst:
                celldata = gc.generateMatrixCell(src, dst, urlparts, cellviews,
                        recent_data, day_data)
                if celldata is None:
                    return {'error': "Failed to generate data for cell at %s:%s" % (src, dst)}
                rowData.append(celldata)
            else:
                rowData.append({'view':-1})
        tableData.append(rowData)

    return tableData

def matrix_mesh(ampy, request):
    urlparts = request.GET
    queryres = ampy.get_meshes("destination", urlparts['testType'], public=True)
    if queryres is None:
        return {'error': "Failed to fetch destination meshes for matrix"}

    return queryres

def matrix_axis(ampy, request):
    """ Internal matrix thead specific API """
    urlparts = request.GET

    # Get the list of source and destination nodes and return it
    src_mesh = urlparts['srcMesh']
    dst_mesh = urlparts['dstMesh']

    queryres = ampy.get_matrix_members(src_mesh, dst_mesh)
    if queryres is None:
        return {'error': 'Failed to fetch matrix axes'}

    result = {'src': queryres[0], 'dst': queryres[1]}
    return result

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
