import sys, string

from ampy import ampdb
from ampweb.views.collections.ampicmp import AmpIcmpGraph

class AmpTracerouteMap(AmpIcmpGraph):

    def format_data(self, data):
        results = {}

        # XXX This will need to also create a list of hops at some point
        # for drawing the rainbow graph. I'll leave that up to whoever is
        # implementing it to figure out exactly what format they need it in
        for line, datapoints in data.iteritems():
            results[line] = []
            for datapoint in datapoints:
                result = [datapoint["timestamp"] * 1000]
                if "length_avg" in datapoint:
                    result.append(round(datapoint["length_avg"]))
                else:
                    result.append(None)
                results[line].append(result)
        return results

    def format_data_old(self, data):
        results = {}

        # XXX This will need to also create a list of hops at some point
        # for drawing the rainbow graph. I'll leave that up to whoever is
        # implementing it to figure out exactly what format they need it
        # in
        for address,stream_data in data.iteritems():
            # store all the measurements within each bin for averaging
            length = {} # XXX new
            # Store the last timestamp with data in each bin for plotting. We
            # need to use binstart to group the data as they are at fixed,
            # known times, but need to plot using the last timestamp so that
            # data actually appears to be recent.
            last = {}
            for line, datapoints in stream_data.iteritems():
                for datapoint in datapoints:
                    ts = datapoint["binstart"] * 1000
                    if ts not in length:
                        length[ts] = []
                        last[ts] = datapoint["timestamp"] * 1000

                    if "length_avg" in datapoint:
                        #length[ts].append(float(datapoint["length_avg"]))
                        length[ts] += [float(datapoint["length_avg"])] * datapoint["length_count"]
                    else:
                        length[ts].append(None)
                    if datapoint["timestamp"] * 1000 > last[ts]:
                        last[ts] = datapoint["timestamp"] * 1000

            results[address] = []
            timestamps = length.keys()
            timestamps.sort()
            for ts in timestamps:
                pathlen = length[ts]
                # Only calculate length stats for valid values (i.e not None)
                valid = [x for x in pathlen if x is not None]
                if len(valid) > 0:
                    avg_path = sum(valid) / len(valid)
                else:
                    avg_path = None
                results[address].append([last[ts], avg_path])
        return results

    def get_dropdowns(self, NNTSCConn, streamid, streaminfo):

        return super(AmpTracerouteMap, self).get_dropdowns(NNTSCConn,
                streamid, streaminfo, "amp-tracemap")

    def get_collection_name(self):
        return "amp-tracemap"

    def get_default_title(self):
        return "CUZ - AMP Traceroute Maps"

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


