import sys, string

from ampy import ampdb
from ampweb.views.collections.collection import CollectionGraph

class RRDSmokepingGraph(CollectionGraph):

    def get_destination_parameters(self, urlparts):
        params = {}
        if len(urlparts) == 1:
            params['source'] = None
        else:
            params['source'] = urlparts[1]

        return params

    def get_stream_parameters(self, urlparts):
        params = {}
        if len(urlparts) > 1:
            params['source'] = urlparts[1]
        if len(urlparts) > 2:
            params['host'] = urlparts[2]

        return params

    def format_data(self, data):
        # Turn preprocessing off in the graph and we can return useful
        # data to flotr rather than the braindead approach envision wants.
        # It still has to be an array of various bits in special locations
        # though, if you give it an object with nice names it interprets
        # each object as a series - what about an object, with a list of
        # objects within it? that might work, though it seems like it
        # might cause difficulties for auto axis detection etc.
        results = []
        for datapoint in data:
            result = [datapoint["timestamp"] * 1000]
            if "median" in datapoint:
                result.append(datapoint["median"])
            else:
                result.append(None)

            if "loss" not in datapoint or datapoint["loss"] is None:
                result.append(None)
            else:
                # format_data() in smokeping enforces and hardcodes 20 pings so
                # we will do the same here. Convert it to a percentage.
                result.append(float(datapoint["loss"]) / 20.0 * 100)

            if "pings" in datapoint:
                for ping in datapoint["pings"]:
                    result.append(ping)
            results.append(result)
        return results

    def get_dropdowns(self, NNTSCConn, streamid, streaminfo):
        sources = []
        destinations = []
        dropdowns = []
        
        sources = NNTSCConn.get_selection_options("rrd-smokeping", {})

        if streaminfo == {}:
            selected = ""
        else:
            selected = streaminfo['source']
        ddsource = {'ddlabel': 'Display from: ',
                'ddidentifier': "drpSource", 'ddcollection':'rrd-smokeping',
                'dditems':sources, 'disabled':False, 'ddselected':selected}
        dropdowns.append(ddsource)

        destdisabled = True
        selected = ""
        if streaminfo != {}:
            params = {'source': streaminfo["source"]}
            destinations = NNTSCConn.get_selection_options("rrd-smokeping",
                    params)
            destdisabled = False
            selected = streaminfo['host']

        dddest = {'ddlabel': 'to: ',
                'ddidentifier':'drpDest', 'ddcollection':'rrd-smokeping',
                'dditems':destinations, 'disabled':destdisabled,
                'ddselected':selected}
        dropdowns.append(dddest)

        return dropdowns

    def get_collection_name(self):
        return "rrd-smokeping"

    def get_default_title(self):
        return "CUZ - Smokeping Graphs"

    def get_event_label(self, event):
        label = "Smokeping: " + event["event_time"].strftime("%H:%M:%S")
        label += " %s in %s " % (event["type_name"], event["metric_name"])
        label += "from %s to %s" % (event["source_name"], event["target_name"])
        label += ", severity level = %s/100" % event["severity"]
        return label

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
