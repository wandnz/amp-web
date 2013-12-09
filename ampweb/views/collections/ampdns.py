import sys, string
import math

from ampy import ampdb
from ampweb.views.collections.collection import CollectionGraph

class AmpDnsGraph(CollectionGraph):

    def get_destination_parameters(self, urlparts):
        params = {}
        if len(urlparts) < 2:
            params['_requesting'] = "sources"
        elif len(urlparts) == 2:
            params['_requesting'] = "destinations"
            params['source'] = urlparts[1]
        elif len(urlparts) == 3:
            params['_requesting'] = "queries"
            params['source'] = urlparts[1]
            params['destination'] = urlparts[2]
        else:
            params['_requesting'] = "addresses"
            params['source'] = urlparts[1]
            params['destination'] = urlparts[2]
            params['query'] = urlparts[3]

        return params

    def get_stream_parameters(self, urlparts):
        params = {}
        if len(urlparts) > 1:
            params['source'] = urlparts[1]
        if len(urlparts) > 2:
            params["destination"] = urlparts[2]
        if len(urlparts) > 3:
            params["query"] = urlparts[3]
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

        # XXX this works and plots a line for every stream_id
        #for address,stream_data in data.iteritems():
        #    results[address] = self.format_data_orig(stream_data)
        #return results


        for address,stream_data in data.iteritems():
            # store all the measurements within each bin for averaging
            latency = {}
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
                    if datapoint["timestamp"] * 1000 > last[ts]:
                        last[ts] = datapoint["timestamp"] * 1000

            results[address] = []
            # all the dicts (latency,loss,last,smoke) should have identical keys
            timestamps = latency.keys()
            timestamps.sort()
            for ts in timestamps:
                rtt = latency[ts]
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
                
                # The 0.0 is a "loss" figure that is used to colour the
                # line in traditional smokeping graphs. We could perhaps
                # try to colour our line based on the status, e.g. 
                # different colours if an error occurs, but views are going
                # to make that somewhat redundant anyway.
                item = [last[ts], avg_rtt, 0.0] + aggr_smoke
                results[address].append(item)
        return results

    def get_dropdowns(self, NNTSCConn, streamid, streaminfo, 
            collection="amp-dns"):
        sources = []
        destinations = []
        queries = []
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

        dddest = {'ddlabel': 'DNS Server: ',
                'ddidentifier':'drpDest',
                'ddcollection':collection,
                'dditems':destinations,
                'ddselected':selected,
                'disabled':destdisabled}
        dropdowns.append(dddest)

        querydisabled = True
        selected = ""
        if streaminfo != {}:
            params = {'source': streaminfo["source"],
                    'destination': streaminfo["destination"],
                    '_requesting':'queries'}
            queries = NNTSCConn.get_selection_options(collection, params)
            querydisabled = False
            selected = streaminfo['query']
        
        ddquery = {'ddlabel': 'Query Name: ',
                'ddidentifier':'drpQuery',
                'ddcollection':collection,
                'dditems':queries,
                'ddselected': selected,
                'disabled':querydisabled}
        dropdowns.append(ddquery)

        addrdisabled = True
        selected = ""
        if streaminfo != {}:
            params = {'source': streaminfo["source"],
                    'destination': streaminfo["destination"],
                    'query': streaminfo["query"],
                    '_requesting':'addresses'}
            addresses = NNTSCConn.get_selection_options(collection, params)
            addrdisabled = False
            selected = streaminfo['address']

        ddaddr = {'ddlabel': 'Responding Address: ',
                'ddidentifier':'drpAddr',
                'ddcollection':collection,
                'dditems':addresses,
                'ddselected': selected,
                'disabled':addrdisabled}
        dropdowns.append(ddaddr)

        return dropdowns

    def get_collection_name(self):
        return "amp-dns"

    def get_default_title(self):
        return "CUZ - AMP DNS Graphs"

    def get_event_label(self, event):
        target = event["target_name"].split("|")

        label = "AMP DNS: " + event["event_time"].strftime("%H:%M:%S")
        label += " %s in %s " % (event["type_name"], event["metric_name"])
        label += "from %s to server %s " % (event["source_name"], target[0])
        label += "at %s asking for %s" % (target[1], target[2])
        label += ", severity level = %s/100" % event["severity"]
        return label

    def get_event_tooltip(self, event):
        target = event["target_name"].split("|")

        label = "%s requesting %s from %s (%s)" % (event["source_name"],
                target[2], target[0], target[1])
        return label

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
