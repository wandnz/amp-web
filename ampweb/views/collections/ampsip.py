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

class AmpSipGraph(CollectionGraph):
    def __init__(self):
        self.minbin_option = "ampweb.minbin.sip"

    def _convert_raw(self, datapoint):
        result = [datapoint['timestamp'] * 1000]

        if 'mos' in datapoint and datapoint['mos'] is not None:
            result.append(datapoint['mos'])
        else:
            result.append(None)

        if 'rtt_mean' in datapoint and datapoint['rtt_mean'] is not None:
            result.append(datapoint['rtt_mean'] / 1000.0)
        else:
            result.append(None)

        if 'response_time' in datapoint and datapoint['response_time'] is not None:
            result.append(datapoint['response_time'] / 1000.0)
        else:
            result.append(None)

        if 'connect_time' in datapoint and datapoint['connect_time'] is not None:
            result.append(datapoint['connect_time'] / 1000.0)
        else:
            result.append(None)

        return result

    def format_data(self, data):
        results = {}

        for line, datapoints in data.items():
            results[line] = []
            for datapoint in datapoints:
                res = self._convert_raw(datapoint)
                results[line].append(res)

        return results

    def _format_matrix_data(self, recent, day=None):
        if recent is None:
            return [1] + ([-1] * 12)

        recent_mos = recent["mos_avg"] if "mos_avg" in recent else -1
        recent_rtt = recent["rtt_mean_avg"] if "rtt_mean_avg" in recent else -1
        recent_response = recent["response_time_avg"] if "response_time_avg" in recent else -1
        recent_connect = recent["connect_time_avg"] if "connect_time_avg" in recent else -1

        if day:
            day_mos = day["mos_avg"] if "mos_avg" in day else -1
            day_mos_sd = day["mos_stddev"] if "mos_stddev" in day else -1
            day_rtt = day["rtt_mean_avg"] if "rtt_mean_avg" in day else -1
            day_rtt_sd = day["rtt_mean_stddev"] if "rtt_mean_stddev" in day else -1
            day_response = day["response_time_avg"] if "response_time_avg" in day else -1
            day_response_sd = day["response_time_avg"] if "response_time_avg" in day else -1
            day_connect = day["connect_time_avg"] if "connect_time_avg" in day else -1
            day_connect_sd = day["connect_time_avg"] if "connect_time_avg" in day else -1

        return [1,
            recent_mos, day_mos, day_mos_sd,
            recent_rtt, day_rtt, day_rtt_sd,
            recent_response, day_response, day_response_sd,
            recent_connect, day_connect, day_connect_sd,
        ]

    def format_raw_data(self, descr, data, start, end):
        results = []
        for line, datapoints in data.items():
            gid = int(line.split("_")[1])

            metadata = [("collection", descr[gid]["collection"]),
                        ("source", descr[gid]["source"]),
                        ("destination", descr[gid]["destination"]),
                        ("family", line.split("_")[3].lower()),
                        ("direction", line.split("_")[2].lower()),
                        ("dscp", descr[gid]["dscp"]),
                        ("proxy", descr[gid]["proxy"]),
                        ("repeat", descr[gid]["repeat"]),
                        ("filename", descr[gid]["filename"]),
                        ("max_duration", descr[gid]["max_duration"]),
                       ]
            thisline = []

            for datapoint in datapoints:
                if "timestamp" not in datapoint:
                    continue
                if (datapoint["timestamp"] < start or
                        datapoint["timestamp"] > end):
                    continue

                result = {'timestamp': datapoint['timestamp']}

                if 'mos' in datapoint:
                    result['mos'] = datapoint['mos']
                else:
                    result['mos'] = None

                if 'rtt_mean' in datapoint:
                    result['rtt_mean'] = datapoint['rtt_mean'] / 1000.0
                else:
                    result['rtt_mean'] = None

                if 'response_time' in datapoint:
                    result['response_time'] = datapoint['response_time'] / 1000.0
                else:
                    result['response_time'] = None

                if 'connect_time' in datapoint:
                    result['connect_time'] = datapoint['connect_time'] / 1000.0
                else:
                    result['connect_time'] = None

                datafields = ['timestamp', 'mos', 'rtt_mean', 'response_time', 'connect_time']
                thisline.append(result)

            if len(thisline) > 0:
                results.append({
                    'metadata': metadata,
                    'data': thisline,
                    'datafields': datafields
                })
        return results

    def getMatrixTabs(self):
        return [
            {'id': 'sip-tab', 'descr': 'SIP/RTP', 'title': 'SIP/RTP'}
        ]

    def get_matrix_viewstyle(self):
        return "amp-sip"

    def getMatrixCellDuration(self):
        return 60 * 60

    def getMatrixCellDurationOptionName(self):
        return "ampweb.matrixperiod.sip"

    def get_collection_name(self):
        return "amp-sip"

    def get_default_title(self):
        return "AMP SIP Mean Opinion Score Graphs"

    def get_event_graphstyle(self):
        return "amp-sip"

    def formatTooltipText(self, result, test, metric):
        if result is None:
            return "Unknown / Unknown"

        column = metric + "_avg"

        formatted = {"Receive" : "No data", "Transmit" : "No data"}
        for label, dp in result.items():
            if len(dp) == 0 or column not in dp[0] or dp[0][column] is None:
                continue

            if re.search('_rx_IPv[46]$', label) != None:
                key = "Receive"
            elif re.search('_tx_IPv[46]$', label) != None:
                key = "Transmit"
            else:
                continue

            value = dp[0][column]
            if metric == "mos":
                formatted[key] = "%.2f MOS" % (value)
            else:
                if value >= 0 and value < 1000:
                    formatted[key] = "%dus" % round(value)
                elif value >= 1000:
                    formatted[key] = "%dms" % round(float(value) / 1000.0)

        return "%s / %s" % (formatted["Receive"], formatted["Transmit"])

    def generateSparklineData(self, dp, test, metric):
        if metric not in dp or dp[metric] is None:
            return None
        return dp[metric]

    def generateMatrixCell(self, src, dst, urlparts, cellviews, recent,
            daydata=None):

        if (src, dst) in cellviews:
            view_id = cellviews[(src, dst)]
        else:
            view_id = -1

        txkey = "%s_%s_tx" % (src, dst)
        rxkey = "%s_%s_rx" % (src, dst)

        if txkey not in recent and rxkey not in recent:
            return {'view': -1}

        result = {'view': view_id, 'tx':-1, 'rx':-1}

        if txkey in recent and recent[txkey] is not None:
            if daydata and txkey in daydata and len(daydata[txkey]) > 0:
                day = daydata[txkey][0]
            else:
                day = None

            # get recent TX MOS
            if len(recent[txkey]) > 0:
                result['tx'] = self._format_matrix_data(recent[txkey][0], day)

        if rxkey in recent and recent[rxkey] is not None:
            if daydata and rxkey in daydata and len(daydata[rxkey]) > 0:
                day = daydata[rxkey][0]
            else:
                day = None

            # get recent RX MOS
            if len(recent[rxkey]) > 0:
                result['rx'] = self._format_matrix_data(recent[rxkey][0], day)

        return result

    def get_event_label(self, streamprops):
        return "Unknown SIP Event"

    def get_event_sources(self, streamprops):
        return [streamprops['source']]

    def get_event_targets(self, streamprops):
        return [streamprops['destination']]

    def get_browser_collections(self):
        return [{
            "family": "AMP",
            "label": "SIP/RTP",
            "description": "Measure Mean Opinion Score of a VoIP stream.",
            "link": "view/amp-sip"
        }]

    def get_required_scripts(self):
        return [
            "modals/ampsip_modal.js",
            "graphpages/ampsip.js",
        ]

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
