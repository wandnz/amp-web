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

import re
from ampweb.views.collections.collection import CollectionGraph

class AmpThroughputGraph(CollectionGraph):
    def __init__(self):
        self.minbin_option = "ampweb.minbin.throughput"

    def _convert_raw(self, dp):
        res = [dp["timestamp"] * 1000]
        Mbps = None
        pps = None

        if "bytes" in dp and "runtime" in dp:
            if dp['bytes'] is not None and dp['runtime'] > 0:
                MBs = float(dp['bytes']) * 8.0 / 1000 / 1000
                Mbps = MBs / (dp['runtime'] / 1000.0)

        if 'packets' in dp and 'runtime' in dp:
            if dp['packets'] is not None and dp['runtime'] > 0:
                pps = float(dp['packets']) / (dp['runtime'] / 1000.0)

        res.append(Mbps)
        res.append(pps)
        return res

    def format_data(self, data):
        results = {}

        for line, datapoints in data.iteritems():
            results[line] = []
            for dp in datapoints:
                res = self._convert_raw(dp)
                results[line].append(res)

        return results

    def getMatrixTabs(self):
        return [{'id': 'tput-tab', 'descr': 'Throughput', 'title':'Throughput'}]

    def get_matrix_viewstyle(self):
        return "amp-throughput"

    def getMatrixCellDuration(self):
        return 60 * 60 * 2

    def getMatrixCellDurationOptionName(self):
        return 'ampweb.matrixperiod.tput'

    def formatTooltipText(self, result, test, metric):
        if result is None:
            return "Unknown / Unknown"

        formatted = {"Download" : "No data", "Upload" : "No data"}
        for label, dp in result.iteritems():
            if len(dp) == 0 or "runtime" not in dp[0] or "bytes" not in dp[0]:
                continue

            if dp[0]["runtime"] is None or dp[0]["bytes"] is None:
                continue
            if dp[0]["runtime"] == 0:
                continue

            if re.search('_in_IPv[46]$', label) != None:
                key = "Download"
            elif re.search('_out_IPv[46]$', label) != None:
                key = "Upload"
            else:
                continue

            bps = (float(dp[0]["bytes"]) / dp[0]["runtime"]) * 8.0 / 1000.0
            formatted[key] = "%.1f Mbps" % (bps)

        return "%s / %s" % (formatted["Download"], formatted["Upload"])

    def generateSparklineData(self, dp, test, metric):
        if 'runtime' not in dp or 'bytes' not in dp:
            return None
        if dp['runtime'] is None or dp['bytes'] is None:
            return None
        if dp['runtime'] == 0:
            return None

        nextval = (float(dp['bytes']) / dp['runtime']) * 8.0
        return int(nextval / 1000.0)

    def generateMatrixCell(self, src, dst, urlparts, cellviews, recent,
            daydata=None):

        # Default to ipv4 unless specified otherwise in the request
        if 'family' in urlparts:
            family = urlparts['family']
        else:
            family = 'ipv4'

        if 'metric' in urlparts:
            metric = urlparts['metric']
        else:
            metric = 'default'

        if (src, dst, family) in cellviews:
            view_id = cellviews[(src, dst, family)]
        else:
            view_id = -1

        index = "%s_%s_%s" % (src, dst, metric)
        keyup = index + "_out_" + family
        keydown = index + "_in_" + family

        if keyup not in recent and keydown not in recent:
            return {'view': -1}

        result = {'view': view_id, 'up':-1, 'down':-1}

        if keyup in recent and recent[keyup] is not None:
            if len(recent[keyup]) > 0:
                result['up'] = [1, self._convert_raw(recent[keyup][0])[1]]
            else:
                result['up'] = [1, -1]

            if daydata and keyup in daydata and daydata[keyup] is not None:
                result['up'].append(self._convert_raw(daydata[keyup][0])[1])
                if ('rate' in daydata[keyup][0] and
                        daydata[keyup][0]['rate'] is not None):
                    result['up'].append(daydata[keyup][0]['rate'] * 8.0 / 1000.0)
                else:
                    result['up'].append(-1)
            else:
                result['up'].append(-1)
                result['up'].append(-1)

        if keydown in recent and recent[keydown] is not None:
            if len(recent[keydown]) > 0:
                result['down'] = [1, self._convert_raw(recent[keydown][0])[1]]
            else:
                result['down'] = [1, -1]

            if daydata and keydown in daydata and daydata[keydown] is not None:
                result['down'].append(self._convert_raw(daydata[keydown][0])[1])
                if ('rate' in daydata[keydown][0] and
                        daydata[keydown][0]['rate'] is not None):
                    result['down'].append(daydata[keydown][0]['rate'] * 8.0 / 1000.0)
                else:
                    result['down'].append(-1)
            else:
                result['down'].append(-1)
                result['down'].append(-1)

        return result

    def format_raw_data(self, descr, data, start, end):
        results = []

        for line, datapoints in data.iteritems():
            gid = int(line.split("_")[1])
            # build the metadata block for each stream
            metadata = [("collection", descr[gid]["collection"]),
                        ("source", descr[gid]["source"]),
                        ("destination", descr[gid]["destination"]),
                        ("family", line.split("_")[3].lower()),
                        ("direction", line.split("_")[2].lower()),
                        ("duration", descr[gid]["duration"]),
                        ("writesize", descr[gid]["writesize"]),
                        ("tcpreused", descr[gid]["tcpreused"])
                        ]

            thisline = []
            # add all the valid datapoints to the result data
            for dp in datapoints:
                if "timestamp" not in dp or "bytes" not in dp or "runtime" not in dp:
                    continue
                if dp["timestamp"] < start or dp["timestamp"] > end:
                    continue

                Mbps = None
                if dp['bytes'] is not None and dp['runtime'] > 0:
                    MBs = float(dp['bytes']) * 8.0 / 1000 / 1000
                    Mbps = MBs / (dp['runtime'] / 1000.0)

                result = {"timestamp": dp["timestamp"], "rate_mbps": Mbps}
                thisline.append(result)

            # don't bother adding any lines that have no data
            if len(thisline) > 0:
                results.append({
                    "metadata": metadata,
                    "data": thisline,
                    "datafields":["timestamp", "rate_mbps"]
                })
        return results

    def get_collection_name(self):
        return "amp-throughput"

    def get_default_title(self):
        return "AMP Throughput Graphs"

    def get_event_label(self, event):
        label = event["event_time"].strftime("%H:%M:%S")
        label += "  AMP Throughput"
        return label

    def get_event_sources(self, streamprops):
        return [streamprops['source']]

    def get_event_targets(self, streamprops):
        return [streamprops['destination']]

    def get_browser_collections(self):
        return [{
            "family":"AMP",
                "label": "Throughput",
                "description": "Measure achievable throughput between two AMP monitors.",
                "link":"view/amp-throughput"
        }]

    def get_required_scripts(self):
        return [
            "modals/ampthroughput_modal.js",
            "graphpages/ampthroughput.js",
        ]

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
