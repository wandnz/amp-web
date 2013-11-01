import sys, string
import math

from ampy import ampdb
from ampweb.views.collections.collection import CollectionGraph

class AmpIcmpGraph(CollectionGraph):

    def get_destination_parameters(self, urlparts):
        params = {}
        if len(urlparts) < 2:
            params['_requesting'] = "sources"
        elif len(urlparts) == 2:
            params['_requesting'] = "destinations"
            params['source'] = urlparts[1]
        elif len(urlparts) == 3:
            params['_requesting'] = "packet_sizes"
            params['source'] = urlparts[1]
            params['destination'] = urlparts[2]
        else:
            params['_requesting'] = "addresses"
            params['source'] = urlparts[1]
            params['destination'] = urlparts[2]
            params['packet_size'] = urlparts[3]

        return params

    def get_stream_parameters(self, urlparts):
        params = {}
        if len(urlparts) > 1:
            params['source'] = urlparts[1]
        if len(urlparts) > 2:
            params["destination"] = urlparts[2]
        if len(urlparts) > 3:
            params["packet_size"] = urlparts[3]
        if len(urlparts) > 4:
            params["address"] = urlparts[4]
        return params

    # split a large array of combined smoke values into a smaller number
    def _chunk_smoke_data(self, smoke, count):
        step = int(math.ceil(len(smoke) / float(count)))
        for i in xrange(0, len(smoke), step):
            yield smoke[i:i+step]


    def format_data(self, data):
        results = {}

        for line,datapoints in data.iteritems():
            results[line] = []
            for datapoint in datapoints:
                result = [datapoint["timestamp"] * 1000]
                median = None
                if "values" in datapoint:
                    count = len(datapoint["values"])
                    if count > 0 and count % 2:
                        median = float(datapoint["values"][count/2]) / 1000.0
                    elif count > 0:
                        median = (float(datapoint["values"][count/2]) +
                                float(datapoint["values"][count/2 - 1]))/2.0/1000.0
                result.append(median)

                if "loss" in datapoint:
                    result.append(float(datapoint["loss"]) * 100.0)
                else:
                    result.append(None)

                if "values" in datapoint:
                    for value in datapoint["values"]:
                        result.append(float(value) / 1000.0)
                results[line].append(result)
        #print results
        return results

    def format_data_2(self, data):
        results = {}

        # XXX this works and plots a line for every stream_id
        #for address,stream_data in data.iteritems():
        #    results[address] = self.format_data_orig(stream_data)
        #return results


        for address,stream_data in data.iteritems():
            # store all the measurements within each bin for averaging
            latency = {}
            loss = {}
            smoke = {} # XXX new
            # Store the last timestamp with data in each bin for plotting. We
            # need to use binstart to group the data as they are at fixed,
            # known times, but need to plot using the last timestamp so that
            # data actually appears to be recent.
            last = {}
            for stream_id,datapoints in stream_data.iteritems():
                for datapoint in datapoints:
                    ts = datapoint["binstart"] * 1000
                    if ts not in latency:
                        latency[ts] = []
                        loss[ts] = []
                        last[ts] = datapoint["timestamp"] * 1000
                        # XXX new
                        smoke[ts] = []

                    median = None
                    if "values" in datapoint:
                        count = len(datapoint["values"])
                        if count > 0 and count % 2:
                            median = float(datapoint["values"][count/2]) / 1000.0
                        elif count > 0:
                            median = (float(datapoint["values"][count/2]) +
                                    float(datapoint["values"][count/2 - 1]))/2.0/1000.0
                        latency[ts].append(median)
                        # save values for smoke
                        for value in datapoint["values"]:
                            smoke[ts].append(float(value) / 1000.0)
                    else:
                        latency[ts].append(None)

                    # XXX old
                    #if "rtt" in datapoint and datapoint["rtt"] is not None:
                    #    latency[ts].append((float(datapoint["rtt"]) / 1000.0))
                    #else:
                    #    latency[ts].append(None)
                    if "loss" in datapoint:
                        loss[ts].append(float(datapoint["loss"]) * 100.0)
                    else:
                        loss[ts].append(0)
                    if datapoint["timestamp"] * 1000 > last[ts]:
                        last[ts] = datapoint["timestamp"] * 1000

            results[address] = []
            # all the dicts (latency,loss,last,smoke) should have identical keys
            timestamps = latency.keys()
            timestamps.sort()
            for ts in timestamps:
                rtt = latency[ts]
                missing = loss[ts]
                # Only calculate latency stats for valid values (i.e not None)
                valid = [x for x in rtt if x is not None]
                # XXX this will probably give unfair weight to streams with
                # only a few measurements, but it's good enough for now. The
                # way to solve all this is to do some smarter work in the
                # database, which we will do any day now!
                if len(valid) > 0:
                    avg_rtt = sum(valid) / len(valid)
                else:
                    avg_rtt = None
                avg_loss = sum(missing) / len(missing)
                #results[address].append([last[ts], avg_rtt, avg_loss]) #XXX old
                # XXX new
                if len(smoke[ts]) > 20:
                    aggr_smoke = []
                    smoke[ts].sort()
                    for s in self._chunk_smoke_data(smoke[ts], 20):
                        # get an average value for each chunk
                        aggr_smoke.append(sum(s) / len(s))
                else:
                    aggr_smoke = smoke[ts]
                item = [last[ts], avg_rtt, avg_loss] + aggr_smoke
                results[address].append(item)
        return results


    def format_data_orig(self, data):
        results = {}

        for stream_id,datapoints in data.iteritems():
            results[stream_id] = []
            for datapoint in datapoints:
                result = [datapoint["timestamp"] * 1000]
                median = None
                if "values" in datapoint:
                    count = len(datapoint["values"])
                    if count > 0 and count % 2:
                        median = float(datapoint["values"][count/2]) / 1000.0
                    elif count > 0:
                        median = (float(datapoint["values"][count/2]) +
                                float(datapoint["values"][count/2 - 1]))/2.0/1000.0
                result.append(median)

                if "loss" in datapoint:
                    result.append(float(datapoint["loss"]) * 100.0)
                else:
                    result.append(None)

                if "values" in datapoint:
                    for value in datapoint["values"]:
                        result.append(float(value) / 1000.0)
                results[stream_id].append(result)
        #print results
        return results

    def get_dropdowns(self, NNTSCConn, streamid, streaminfo,
            collection="amp-icmp"):
        sources = []
        destinations = []
        sizes = []
        addresses = []
        dropdowns = []

        NNTSCConn.create_parser(collection)
        sources = NNTSCConn.get_selection_options(collection,
                {'_requesting':'sources'})

        if streaminfo == {}:
            selected = ""
        else:
            selected = streaminfo['source']
        ddSource = {'ddlabel': 'Source: ',
                'ddidentifier':'drpSource',
                'ddcollection':collection,
                'dditems':sources,
                'ddselected':selected,
                'disabled':False}
        dropdowns.append(ddSource)

        destdisabled = True
        selected = ""
        if streaminfo != {}:
            params = {'source': streaminfo["source"],
                    '_requesting':'destinations'}
            destinations = NNTSCConn.get_selection_options(collection, params)
            selected = streaminfo['destination']
            destdisabled = False

        dddest = {'ddlabel': 'Target: ',
                'ddidentifier':'drpDest',
                'ddcollection':'amp-icmp',
                'dditems':destinations,
                'ddselected':selected,
                'disabled':destdisabled}
        dropdowns.append(dddest)

        sizedisabled = True
        selected = ""
        if streaminfo != {}:
            params = {'source': streaminfo["source"],
                    'destination': streaminfo["destination"],
                    '_requesting':'packet_sizes'}
            sizes = NNTSCConn.get_selection_options(collection, params)
            sizedisabled = False
            selected = streaminfo['packet_size']

        ddsize = {'ddlabel': 'Packet Size: ',
                'ddidentifier':'drpSize',
                'ddcollection':'amp-icmp',
                'dditems':sizes,
                'ddselected': selected,
                'disabled':sizedisabled}
        dropdowns.append(ddsize)

        addrdisabled = True
        selected = ""
        if streaminfo != {}:
            params = {'source': streaminfo["source"],
                    'destination': streaminfo["destination"],
                    'packet_size': streaminfo["packet_size"],
                    '_requesting':'addresses'}
            addresses = NNTSCConn.get_selection_options(collection, params)
            addrdisabled = False
            selected = streaminfo['address']

        ddaddr = {'ddlabel': 'Address: ',
                'ddidentifier':'drpAddr',
                'ddcollection':'amp-icmp',
                'dditems':addresses,
                'ddselected': selected,
                'disabled':addrdisabled}
        dropdowns.append(ddaddr)


        return dropdowns

    def get_collection_name(self):
        return "amp-icmp"

    def get_default_title(self):
        return "CUZ - AMP ICMP Graphs"

    def get_event_label(self, event):
        target = event["target_name"].split("|")

        label = "AMP ICMP: " + event["event_time"].strftime("%H:%M:%S")
        label += " %s in %s " % (event["type_name"], event["metric_name"])
        label += "from %s to %s " % (event["source_name"], target[0])
        label += "at %s (%s bytes)" % (target[1], target[2])
        label += ", severity level = %s/100" % event["severity"]
        return label

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :


