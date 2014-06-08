import sys, string
import math

from ampweb.views.collections.collection import CollectionGraph

class AmpDnsGraph(CollectionGraph):

    def format_data(self, data):
        results = {}

        for line, datapoints in data.iteritems():
            results[line] = []
            for datapoint in datapoints:
                result = [datapoint["timestamp"] * 1000]
                median = None
                if "rtt" in datapoint and datapoint["rtt"] is not None:
                    count = len(datapoint["rtt"])
                    if count > 0 and count % 2:
                        median = float(datapoint["rtt"][count/2]) / 1000.0
                    elif count > 0:
                        median = (float(datapoint["rtt"][count/2]) +
                                float(datapoint["rtt"][count/2 - 1]))/2.0/1000.0
                result.append(median)

                # loss value
                result.append(0)

                if "rtt" in datapoint and datapoint["rtt"] is not None:
                    for value in datapoint["rtt"]:
                        if value is None:
                            result.append(None)
                        else:
                            result.append(float(value) / 1000.0)
                results[line].append(result)
        #print results
        return results

    def get_collection_name(self):
        return "amp-dns"

    def get_default_title(self):
        return "AMP DNS Graphs"

    def get_event_label(self, event):
        target = event["target_name"].split("|")

        label = event["event_time"].strftime("%H:%M:%S")
        label += "  AMP DNS from %s to %s requesting %s" % \
                (event["source_name"], target[0], target[2])

        return label

    def get_event_tooltip(self, event):
        target = event["target_name"].split("|")

        label = "%s requesting %s from %s (%s)" % (event["source_name"],
                target[2], target[0], target[1])
        return label

    def get_browser_collections(self):
        return [
        { "family":"AMP",
          "label": "DNS",
          "description": "Measure query response latency from an AMP monitor to a target DNS server.",
          "link":"view/amp-dns"
        },
        ]

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
