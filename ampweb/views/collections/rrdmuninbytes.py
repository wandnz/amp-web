import sys, string

from ampweb.views.collections.collection import CollectionGraph

class RRDMuninbytesGraph(CollectionGraph):

    def format_data(self, data):
        results = {}
        for stream_id,stream_data in data.iteritems():
            results[stream_id] = []
            for datapoint in stream_data:
                result = [datapoint["timestamp"] * 1000]
                if "mbps" in datapoint and datapoint["mbps"] != None:
                    result.append(float(datapoint["mbps"]))
                else:
                    result.append(None)
                results[stream_id].append(result)
        return results

    def get_collection_name(self):
        return "rrd-muninbytes"

    def get_default_title(self):
        return "Muninbytes Graphs"

    def get_event_label(self, event):
        target = event["target_name"].split("|")
        label = event["event_time"].strftime("%H:%M:%S")
        label += "  RRD Munin bytes %s on %s:%s"  % \
                (target[1], event["source_name"], target[0])
        return label

    def get_event_sources(self, streamprops):
        return []

    def get_event_targets(self, streamprops):
        return []

    def get_event_tooltip(self, event):
        target = event["target_name"].split("|")
        label = "Bytes %s, %s:%s" % (target[1], event["source_name"],
                target[0])
        return label

    def get_browser_collections(self):
        return [
        { "family":"RRD",
          "label": "Muninbytes",
          "description": "Measure traffic volumes for a switch interface using Munin.",
          "link":"view/rrd-muninbytes"
        },
        ]

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
