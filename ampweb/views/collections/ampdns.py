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
            #params['_requesting'] = "addresses"
            params['_requesting'] = "query_type"
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


    def format_data(self, data):
        results = {}

        for line, datapoints in data.iteritems():
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

                # loss value
                result.append(0)

                if "values" in datapoint:
                    for value in datapoint["values"]:
                        result.append(float(value) / 1000.0)
                results[line].append(result)
        #print results
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

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
