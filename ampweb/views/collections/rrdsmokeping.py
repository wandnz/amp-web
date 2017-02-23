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

class RRDSmokepingGraph(CollectionGraph):
    def __init__(self):
        self.minbin_option = "ampweb.minbin.smokeping"

    def format_data(self, data):
        # Turn preprocessing off in the graph and we can return useful
        # data to flotr rather than the braindead approach envision wants.
        # It still has to be an array of various bits in special locations
        # though, if you give it an object with nice names it interprets
        # each object as a series - what about an object, with a list of
        # objects within it? that might work, though it seems like it
        # might cause difficulties for auto axis detection etc.
        results = {}

        if data is None:
            return results

        for stream_id, stream_data in data.iteritems():
            results[stream_id] = []
            for datapoint in stream_data:
                result = [datapoint["timestamp"] * 1000]
                if "median" in datapoint and datapoint['median'] is not None:
                    result.append(float(datapoint["median"]))
                else:
                    result.append(None)

                if "loss" not in datapoint or datapoint["loss"] is None:
                    result.append(None)
                else:
                    # format_data() in smokeping enforces and hardcodes 20 pings
                    # so we will do the same here. Convert it to a percentage.
                    result.append(float(datapoint["loss"]) / 20.0 * 100)

                if "pings" in datapoint and datapoint['pings'] is not None:
                    for ping in datapoint["pings"]:
                        result.append(float(ping))
                results[stream_id].append(result)
        return results

    def get_collection_name(self):
        return "rrd-smokeping"

    def get_default_title(self):
        return "Smokeping Graphs"

    def format_raw_data(self, descr, data, start, end):
        results = []

        for line, datapoints in data.iteritems():
            gid = int(line.split("_")[1])

            metadata = [
                ("collection", descr[gid]["collection"]),
                ("source", descr[gid]["source"]),
                ("host", descr[gid]["host"]),
                ("family", line.split("_")[2].lower()),
            ]

            thisline = []
            for datapoint in datapoints:
                if "timestamp" not in datapoint:
                    continue
                if datapoint["timestamp"] < start or datapoint["timestamp"] > end:
                    continue

                if "loss" in datapoint:
                    loss = datapoint["loss"]
                else:
                    loss = None

                if "pingsent" in datapoint:
                    count = datapoint["pingsent"]
                else:
                    count = None

                if "median" in datapoint:
                    median = datapoint["median"]
                else:
                    median = None

                result = {
                    "timestamp": datapoint["timestamp"],
                    "loss": loss,
                    "results": count,
                    "median": median
                }
                thisline.append(result)

            if len(thisline) > 0:
                results.append({
                    "metadata": metadata,
                    "data": thisline,
                    "datafields": ["timestamp", "median", "loss", "results"]
                })

        return results

    def get_event_label(self, event):
        label = event["event_time"].strftime("%H:%M:%S")
        label += "  RRD Smokeping from %s to %s" % (event["source_name"], event["target_name"])
        return label

    def get_event_sources(self, streamprops):
        return [streamprops['source']]

    def get_event_targets(self, streamprops):
        return [streamprops['destination']]

    def get_event_tooltip(self, event):
        return "%s from %s to %s" % (event["metric_name"], event["source_name"],
                event["target_name"])

    def get_browser_collections(self):
        return [{
            "family":"RRD",
            "label": "Smokeping",
            "description": "Measure latency and loss between two endpoints using Smokeping.",
            "link":"view/rrd-smokeping"
        }]

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
