from ampy import ampdb
from ampweb.views.collections.collection import CollectionGraph

class AmpIcmpGraph(CollectionGraph):

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

                if "loss" in datapoint:
                    result.append(float(datapoint["loss"]) * 100.0)
                else:
                    result.append(None)

                if "rtt" in datapoint and datapoint["rtt"] is not None:
                    for value in datapoint["rtt"]:
                        if value is not None:
                            result.append(float(value) / 1000.0)
                        else:
                            result.append(None)
                results[line].append(result)
        #print results
        return results

    def get_collection_name(self):
        return "amp-icmp"

    def get_default_title(self):
        return "AMP ICMP Graphs"

    def get_event_label(self, event):
        target = event["target_name"].split("|")

        label = event["event_time"].strftime("%H:%M:%S")
        label += "  AMP ICMP from %s to %s (%s)" % (event["source_name"], target[0], target[2].strip())

        return label

    def get_event_tooltip(self, event):
        target = event["target_name"].split("|")
       
        label = "%s from %s to %s %s, %s bytes" % \
                (event["metric_name"], event["source_name"], 
                 target[0], target[2], target[1])
        return label

    def get_browser_collections(self):
        return [
        { "family":"AMP",
          "label": "ICMP",
          "description": "Measure ICMP latency and loss from an AMP monitor to a target name or address.",
          "link":"view/amp-icmp"
        },
        ]


# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :


