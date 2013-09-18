import sys, string

from ampy import ampdb
from ampweb.views.collections.ampicmp import AmpIcmpGraph

class AmpTracerouteGraph(AmpIcmpGraph):

    def format_data(self, data):
        results = []

        # XXX This will need to also create a list of hops at some point
        # for drawing the rainbow graph. I'll leave that up to whoever is
        # implementing it to figure out exactly what format they need it
        # in

        for datapoint in data:
            result = [datapoint["timestamp"] * 1000]
            if "length" in datapoint and datapoint["length"] != None:
                result.append(int(datapoint["length"]))
            else:
                result.append(None)

            results.append(result)
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
        label = "AMP Traceroute: " + event["event_time"].strftime("%H:%M:%S")
        label += " %s " % event["type_name"]
        label += "from %s to %s" % (event["source_name"], event["target_name"])
        label += ", severity level = %s/100" % event["severity"]
        return label

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :


