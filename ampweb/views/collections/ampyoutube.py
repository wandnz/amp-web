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

class AmpYoutubeGraph(CollectionGraph):
    def __init__(self):
        self.minbin_option = "ampweb.minbin.youtube"

    def _convert_raw(self, dp):
        result = [dp['timestamp'] * 1000]
        # track combined non-playing time to use as the maximum y value in
        # rainbow graphs, append it after the actual data
        total_non_playing = 0

        for k in ["total_time", "pre_time", "initial_buffering",
                  "stall_time", "stall_count"]:
            if k in dp and dp[k] is not None:
                if k == "stall_count":
                    result.append(int(dp[k]))
                else:
                    result.append(int(dp[k]) / 1000.0)
                    if k != "total_time":
                        total_non_playing += (int(dp[k]) / 1000.0)
            else:
                result.append(None)

        result.append(total_non_playing)
        return result

    def _format_matrix_data(self, recent, daydata=None):
        if recent is None:
            return [1] + ([-1] * 15)

        if recent.get("pre_time_avg") is not None:
            recent_pre = recent["pre_time_avg"] / 1000.0
        else:
            recent_pre = -1

        if recent.get("initial_buffering_avg") is not None:
            recent_buff = recent["initial_buffering_avg"] / 1000.0
        else:
            recent_buff = -1

        if recent.get("stall_time_avg") is not None:
            recent_stalltime = recent["stall_time_avg"]
        else:
            recent_stalltime = -1

        if recent.get("stall_count_avg") is not None:
            recent_stallcount = recent["stall_count_avg"]
        else:
            recent_stallcount = -1

        day_pre = -1
        day_pre_sd = -1
        day_buff = -1
        day_buff_sd = -1
        day_stalltime = -1
        day_stalltime_sd = -1
        day_stallcount = -1
        day_stallcount_sd = -1

        if daydata:
            if daydata.get("pre_time_avg") is not None:
                day_pre = daydata["pre_time_avg"] / 1000.0

            if daydata.get("pre_time_stddev") is not None:
                day_pre_sd = daydata["pre_time_stddev"] / 1000.0

            if daydata.get("initial_buffering_avg") is not None:
                day_buff = daydata["initial_buffering_avg"] / 1000.0

            if daydata.get("initial_buffering_stddev") is not None:
                day_buff_sd = daydata["initial_buffering_stddev"] / 1000.0

            if daydata.get("stall_time_avg") is not None:
                day_stalltime = daydata["stall_time_avg"] / 1000.0

            if daydata.get("stall_time_stddev") is not None:
                day_stalltime_sd = daydata["stall_time_stddev"] / 1000.0

            if daydata.get("stall_count_avg") is not None:
                day_stallcount = daydata["stall_count_avg"] / 1000.0

            if daydata.get("stall_count_stddev") is not None:
                day_stallcount_sd = daydata["stall_count_stddev"] / 1000.0

        return [1,
                recent_pre, day_pre, day_pre_sd,
                recent_buff, day_buff, day_buff_sd,
                recent_stalltime, day_stalltime, day_stalltime_sd,
                recent_stallcount, day_stallcount, day_stallcount_sd,
        ]

    def format_data(self, data):
        results = {}
        for streamid, streamdata in data.iteritems():
            results[streamid] = []
            for dp in streamdata:
                result = self._convert_raw(dp)
                results[streamid].append(result)
        return results

    def format_raw_data(self, descr, data, start, end):
        results = []
        header = [
            "collection", "source", "destination", "quality",
        ]

        datacols = [
            #"timestamp", "server_count", "object_count", "duration", "bytes"
            "timestamp", "total_time", "pre_time", "initial_buffering",
            "playing_time",
        ]

        for streamid, streamdata in data.iteritems():
            gid = int(streamid.split("_")[1])
            # build the metadata for each stream
            metadata = []
            for item in header:
                metadata.append((item, descr[gid][item]))

            thisline = []
            for dp in streamdata:
                if "timestamp" not in dp:
                    continue
                if dp["timestamp"] < start or dp["timestamp"] > end:
                    continue

                result = {}
                for k in datacols:
                    if k in dp:
                        result[k] = dp[k]
                    else:
                        # don't report any that don't have data, the timestamps
                        # will be wrong (binstart) so it's kinda pointless
                        break

                if len(result) == len(datacols):
                    thisline.append(result)

            # don't bother adding any lines that have no data
            if len(thisline) > 0:
                results.append({
                    "metadata": metadata,
                    "data": thisline,
                    "datafields": datacols
                })
        return results

    def getMatrixTabs(self):
        return [{
            'id': 'youtube-tab',
            'descr': 'YouTube video fetching',
            'title': 'YouTube'
        }]

    def get_matrix_viewstyle(self):
        return "amp-youtube"

    def getMatrixCellDuration(self):
        return 60 * 60

    def getMatrixCellDurationOptionName(self):
        return 'ampweb.matrixperiod.youtube'

    def generateSparklineData(self, dp, test, metric):
        # all the metrics and columns are currently named the same, and we
        # only care about the average values for each of them
        col = metric + "_avg"

        if col not in dp or dp[col] is None:
            return None
        if dp[col] < 0:
            return None
        return int(round(dp[col]))

    def formatTooltipText(self, result, test, metric):
        if result is None:
            return "Unknown"

        # all the metrics and columns are currently named the same, and we
        # only care about the average values for each of them
        col = metric + "_avg"

        formatted = { "pft": "No data" }
        for dp in result.itervalues():
            if len(dp) > 0 and col in dp[0] and dp[0][col] is not None:
                value = float(dp[0][col])
                if metric in ["stall_count"]:
                    if value == 0:
                        formatted['pft'] = '0 stalls'
                    else:
                        formatted['pft'] = '%.2f stalls' % value
                else:
                    formatted['pft'] = '%.2f secs' % (value / 1000.0)
                break

        return '%s' % (formatted['pft'])

    def generateMatrixCell(self, src, dst, urlparts, cellviews, recent,
            daydata=None):

        if (src, dst) in cellviews:
            view_id = cellviews[(src, dst)]
        else:
            view_id = -1

        # For now, all YouTube results come back as 'ipv4' as we don't make
        # any distinction between ipv4 and ipv6
        key = "%s_%s_ipv4" % (src, dst)
        if key not in recent:
            return {'view':-1}

        if daydata and key in daydata and len(daydata[key]) > 0:
            day = daydata[key][0]
        else:
            day = None

        result = {'view':view_id, 'ipv4': -1, 'ipv6': -1}
        if len(recent[key]) > 0:
            result['ipv4'] = self._format_matrix_data(recent[key][0], day)
            #result['ipv6'] = [1, result['ipv4'][1]]
        return result

    def get_collection_name(self):
        return "amp-youtube"

    def get_default_title(self):
        return "AMP YouTube Graphs"

    def get_event_label(self, event):
        # TODO Write this when we add event detection for amp-youtube
        return "Please write code for this!"

    def get_event_sources(self, streamprops):
        return []

    def get_event_targets(self, streamprops):
        return []

    def get_browser_collections(self):
        return [
            {
                "family" : "AMP",
                "label": "YouTube",
                "description": "Measure time taken to play a YouTube video.",
                "link": "view/amp-youtube"
            },
        ]

    def get_required_scripts(self):
        return [
            "modals/ampyoutube_modal.js",
            "graphpages/ampyoutube.js",
            "graphstyles/videorainbow.js",
            "graphtypes/videorainbow.js",
        ]

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
