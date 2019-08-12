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

from ampweb.views.collections.collection import CollectionGraph

class AmpUdpstreamGraph(CollectionGraph):
    def __init__(self):
        self.minbin_option = "ampweb.minbin.udpstream"

    def _convert_raw(self, datapoint):
        res = [datapoint['timestamp'] * 1000]

        if 'min_jitter' in datapoint and datapoint['min_jitter'] is not None:
            res.append(datapoint['min_jitter'] / 1000.0)
        else:
            res.append(None)

        for pct in range(10, 101, 10):
            field = 'jitter_percentile_%d' % (pct)

            if field in datapoint and datapoint[field] is not None:
                res.append(datapoint[field] / 1000.0)
            else:
                res.append(None)

        return res

    def format_data(self, data):
        results = {}

        for line, datapoints in data.iteritems():
            results[line] = []
            for datapoint in datapoints:
                res = self._convert_raw(datapoint)
                results[line].append(res)

        return results

    def format_raw_data(self, descr, data, start, end):
        results = []
        for line, datapoints in data.iteritems():
            gid = int(line.split("_")[1])

            metadata = [("collection", descr[gid]["collection"]),
                        ("source", descr[gid]["source"]),
                        ("destination", descr[gid]["destination"]),
                        ("family", line.split("_")[3].lower()),
                        ("direction", line.split("_")[2].lower()),
                        ("dscp", descr[gid]["dscp"]),
                        ("packet_size", descr[gid]["packet_size"]),
                        ("packet_spacing", descr[gid]["packet_spacing"]),
                        ("packet_count", descr[gid]["packet_count"]),
                       ]
            thisline = []

            for datapoint in datapoints:
                if "timestamp" not in datapoint:
                    continue
                if (datapoint["timestamp"] < start or
                        datapoint["timestamp"] > end):
                    continue

                result = {'timestamp': datapoint['timestamp']}

                if 'min_jitter' in datapoint:
                    result['min_jitter'] = datapoint['min_jitter']
                else:
                    result['min_jitter'] = None

                datafields = ['timestamp', 'min_jitter']

                for i in range(10, 101, 10):
                    key = "jitter_percentile_%d" % (i)
                    if key in datapoint:
                        result[key] = datapoint[key]
                    else:
                        result[key] = None
                    datafields.append(key)
                thisline.append(result)

            if len(thisline) > 0:
                results.append({
                    'metadata': metadata,
                    'data': thisline,
                    'datafields': datafields
                })
        return results

    def getMatrixTabs(self):
        return []

    def get_collection_name(self):
        return "amp-udpstream"

    def get_default_title(self):
        return "AMP UDPStream Delay Variation Graphs"

    def get_event_graphstyle(self):
        return "amp-udpstream"

    def generateSparklineData(self, dp, test, metric):
        return None

    def formatTooltipText(self, result, test, metric):
        return "TODO / TODO"

    def generateMatrixCell(self, src, dst, urlparts, cellviews, recent,
            daydata=None):

        return {'view': -1}

    def get_event_label(self, streamprops):
        return "   Unknown UDP Stream Jitter Event"

    def get_event_sources(self, streamprops):
        return [streamprops['source']]

    def get_event_targets(self, streamprops):
        return [streamprops['destination']]

    def get_browser_collections(self):
        return [{
            "family": "AMP",
            "label": "UDPStream",
            "description": "Measure packet delay variation while sending a burst of equally-spaced UDP packets.",
            "link": "view/amp-udpstream"
        },
        {
            "family": "AMP",
            "label": "UDPStream Latency",
            "description": "Measure latency observed for a burst of equally-sized UDP packets.",
            "link": "view/amp-udpstream-latency"
        }]

    def get_required_scripts(self):
        return [
            "modals/ampudpstream_modal.js",
            "graphpages/ampudpstream.js",
            "graphstyles/jitterrainbow.js",
            "graphtypes/jitterrainbow.js",
        ]

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
