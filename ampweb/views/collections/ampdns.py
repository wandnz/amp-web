import sys, string
import math

from ampy import ampdb
from ampweb.views.collections.collection import CollectionGraph

class AmpDnsGraph(CollectionGraph):

    def get_destination_parameters(self, urlparts):
        params = {}

        if len(urlparts) > 0:
            params['_requesting'] = "sources"
        
        if len(urlparts) > 1:
            params['_requesting'] = "destinations"
            params['source'] = urlparts[1]

        if len(urlparts) > 2:
            params['_requesting'] = "queries"
            params['destination'] = urlparts[2]

        if len(urlparts) > 3:
            params['_requesting'] = "query_type"
            params['query'] = urlparts[3]
        
        if len(urlparts) > 4:
            params['_requesting'] = "query_class"
            params['query_type'] = urlparts[4]
        
        if len(urlparts) > 5:
            params['_requesting'] = "udp_payload_size"
            params['query_class'] = urlparts[5]
        
        if len(urlparts) > 6:
            params['_requesting'] = "recurse"
            params['udp_payload_size'] = int(urlparts[6])

        if len(urlparts) > 7:
            params['_requesting'] = "dnssec"
            if urlparts[7] == "true":
                params['recurse'] = True
            elif urlparts[7] == "false":
                params['recurse'] = False

        if len(urlparts) > 8:
            params['_requesting'] = "nsid"
            if urlparts[8] == "true":
                params['dnssec'] = True
            elif urlparts[8] == "false":
                params['dnssec'] = False


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

    def get_collection_name(self):
        return "amp-dns"

    def get_default_title(self):
        return "CUZ - AMP DNS Graphs"

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
          "description":"Measure DNS query response time from an AMP monitor to a DNS server",
          "link":"view/amp-dns"
        },
        ]

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
