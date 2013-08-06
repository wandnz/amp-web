import sys, string

from ampy import ampdb
from ampweb.views.collections.collection import CollectionGraph
from ampweb.views.collections.util import populateDropdown

class AmpTracerouteGraph(CollectionGraph):

    def get_destination_parameters(self, urlparts):
        params = {}
        if len(urlparts) < 2:
            params['_requesting'] = "sources"
        elif len(urlparts) == 2:
            params['_requesting'] = "destinations"
            params['source'] = urlparts[1]
        else:
            params['_requesting'] = "packet_sizes"
            params['source'] = urlparts[1]
            params['destination'] = urlparts[2]
        
        return params

    def get_stream_parameters(self, urlparts):
        params = {}
        if len(urlparts) > 1:
            params['source'] = urlparts[1]
        if len(urlparts) > 2:
            params["destination"] = urlparts[2]
        if len(urlparts) > 3:
            params["packet_size"] = urlparts[3]
        return params

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

    def get_javascripts(self):
        return [
            "graphtemplates/basicts.js",
            "betternntscgraph.js",
            "dropdowns/dropdown_amptraceroute.js",
            "graphobjects/amptraceroute.js"
        ]

    def get_dropdowns(self, NNTSCConn, streamid, streaminfo):
        sources = []
        destinations = []
        sizes = []
        dropdowns = []

        selopts = NNTSCConn.get_selection_options("amp-traceroute", 
                {'_requesting':'sources'})
        sources = populateDropdown(selopts, streaminfo, 'source')
        ddSource = {'ddlabel': 'Source: ', 
                'ddidentifier':'drpSource', 
                'ddcollection':'amp-traceroute', 
                'dditems':sources, 
                'disabled':False}
        dropdowns.append(ddSource)

        destdisabled = True
        if streaminfo != {}:
            params = {'source': streaminfo["source"], 
                    '_requesting':'destinations'}
            selopts = NNTSCConn.get_selection_options("amp-traceroute", params)
            destinations = populateDropdown(selopts, streaminfo, 
                    'destination')
            destdisabled = False
        
        dddest = {'ddlabel': 'Target: ', 
                'ddidentifier':'drpDest', 
                'ddcollection':'amp-traceroute', 
                'dditems':destinations, 
                'disabled':destdisabled}
        dropdowns.append(dddest)

        sizedisabled = True
        if streaminfo != {}:
            params = {'source': streaminfo["source"], 
                    'destination': streaminfo["destination"],
                    '_requesting':'packet_sizes'}
            selopts = NNTSCConn.get_selection_options("amp-traceroute", params)
            sizes = populateDropdown(selopts, streaminfo, "packet_size")
            sizedisabled = False

        ddsize = {'ddlabel': 'Packet Size: ', 
                'ddidentifier':'drpSize', 
                'ddcollection':'amp-traceroute', 
                'dditems':sizes, 
                'disabled':sizedisabled}
        dropdowns.append(ddsize)

        return dropdowns

    def get_collection_name(self):
        return "amp-traceroute"

    def get_default_title(self):
        return "CUZ - AMP Traceroute Graphs"

    def get_event_label(self, event):
        label = "AMP Traceroute: " + event["event_time"].strftime("%H:%M:%S")
        label += " %s " % event["type_name"]
        label += "from %s to %s" % (event["source_name"], event["target_name"])
        label += ", severity level = %s/100" % event["severity"]
        return label

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :


