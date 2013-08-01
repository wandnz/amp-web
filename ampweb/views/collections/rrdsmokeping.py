import sys, string

from ampy import ampdb
from ampweb.views.collections.collection import CollectionGraph
from ampweb.views.collections.util import populateDropdown

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
                result.append(float(str(datapoint["loss"])))

            if "pings" in datapoint:
                for ping in datapoint["pings"]:
                    result.append(ping)
            results.append(result)
        return results

    def get_javascripts(self):
        return [
            "dropdown_smokeping.js",
            "nntscgraph.js",
            "graphtemplates/basicts.js",
            "smokeping.js"
        ]

    def get_dropdowns(self, NNTSCConn, streamid, streaminfo):
        sources = []
        destinations = []
        dropdowns = []

        selopts = NNTSCConn.get_selection_options("rrd-smokeping", {})
        sources = populateDropdown(selopts, streaminfo, "source")
        ddsource = {'ddlabel': 'Display from: ', 'ddidentifier': "drpSource", 'ddcollection':'rrd-smokeping', 'dditems':sources, 'disabled':False}
        dropdowns.append(ddsource)

        destdisabled = True
        if streaminfo != {}:
            params = {'source': streaminfo["source"]}
            selopts = NNTSCConn.get_selection_options("rrd-smokeping", params)
            destinations = populateDropdown(selopts, streaminfo, "host")        
            destdisabled = False
    
        dddest = {'ddlabel': 'to: ', 'ddidentifier':'drpDest', 'ddcollection':'rrd-smokeping', 'dditems':destinations, 'disabled':destdisabled}
        dropdowns.append(dddest)

        return dropdowns

    def get_collection_name(self):
        return "rrd-smokeping"

    def get_default_title(self):
        return "CUZ - Smokeping Graphs"
        

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
