import sys, string

from ampy import ampdb
from ampweb.views.collections.ampicmp import AmpIcmpGraph

class AmpTracerouteGraph(AmpIcmpGraph):

    def format_data(self, data):
        results = {}
        for line, datapoints in data.iteritems():
            results[line] = []
            for datapoint in datapoints:
                result = [datapoint["timestamp"] * 1000]
                if "error_type" in datapoint:
                    result.append(datapoint["error_type"])
                    if "error_code" in datapoint:
                        result.append(datapoint["error_code"])
                    else:
                        result.append(0)
                else:
                    result.append(0)
                    result.append(0)

                if "path" in datapoint:
                    # length, list of (address, latency) pairs
                    result.append(len(datapoint["path"]))
                    result.append(zip(datapoint["path"],
                                [0]*len(datapoint["path"])))
                else:
                    result.append(0)
                    result.append([])
                results[line].append(result)
        return results

    def get_dropdowns(self, NNTSCConn, streamid, streaminfo):

        return super(AmpTracerouteGraph, self).get_dropdowns(NNTSCConn,
                streamid, streaminfo, "amp-traceroute")

    def get_collection_name(self):
        return "amp-traceroute"

    def get_default_title(self):
        return "CUZ - AMP Traceroute Graphs"

    def get_event_label(self, event):
        # TODO Include the address in the event text
        target = event["target_name"].split("|")

        label = "AMP Traceroute: " + event["event_time"].strftime("%H:%M:%S")
        label += " %s " % event["type_name"]
        label += "from %s to " % (event["source_name"])
        label += "%s at %s (%s bytes)" % (target[0], target[1], target[2])
        label += ", severity level = %s/100" % event["severity"]
        return label

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :


