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
        label += "%s (%s bytes)" % (target[2], target[1])
        label += ", severity level = %s/100" % event["severity"]
        return label

    def get_event_tooltip(self, event):
        target = event["target_name"].split("|")
       
        label = "%s from %s to %s %s, %s bytes" % \
                (event["metric_name"], event["source_name"], 
                 target[0], target[2], target[1])
        return label

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :


