import sys, string

from ampy import ampdb
from ampweb.views.collections.collection import CollectionGraph
from ampweb.views.collections.util import populateDropdown

class RRDMuninbytesGraph(CollectionGraph):
    def get_destination_parameters(self, urlparts):
        params = {}

        if len(urlparts) < 2:
            params['switch'] = None
        else:
            params['switch'] = urlparts[1]

        if len(urlparts) >= 3:
            params['interface'] = urlparts[2]

        return params

    def get_stream_parameters(self, urlparts):
        params = {}
        if len(urlparts) > 1:
            params['switch'] = urlparts[1]
        if len(urlparts) > 2:
            params['interface'] = urlparts[2]
        if len(urlparts) > 3:
            params['direction'] = urlparts[3]

        return params

    def format_data(self, data):
        results = []
        for datapoint in data:
            result = [datapoint["timestamp"] * 1000]
            if "mbps" in datapoint and datapoint["mbps"] != None:
                result.append(float(datapoint["mbps"]))
            else:
                result.append(None)
            results.append(result)
        return results

    def get_javascripts(self):
        return [
            "graphtemplates/basicts.js",
            "betternntscgraph.js",
            "dropdowns/dropdown_munin.js",
            "graphobjects/rrdmuninbytes.js"
        ]

    def get_collection_name(self):
        return "rrd-muninbytes"

    def get_default_title(self):
        return "CUZ - Muninbytes Graphs"

    def get_dropdowns(self, NNTSCConn, streamid, streaminfo):
        dropdowns = []
        switches = []
        interfaces = []
        directions = []

        selopts = NNTSCConn.get_selection_options("rrd-muninbytes", {})
        switches = populateDropdown(selopts, streaminfo, "switch")
        ddswitch = {'ddlabel': 'Switch: ', 
                'ddidentifier': "drpSwitch", 
                'ddcollection':'rrd-muninbytes', 
                'dditems':switches, 
                'disabled':False}
        dropdowns.append(ddswitch)

        ifacedisabled = True
        if streaminfo != {}:
            params = {'switch': streaminfo["switch"]}
            selopts = NNTSCConn.get_selection_options("rrd-muninbytes", params)
            interfaces = populateDropdown(selopts, streaminfo, "interfacelabel")
            ifacedisabled = False
        ddinterface = {'ddlabel': 'Interface: ', 
                'ddidentifier': 'drpInterface', 
                'ddcollection':'rrd-muninbytes', 
                'dditems':interfaces, 
                'disabled':ifacedisabled}
        dropdowns.append(ddinterface)

        dirdisabled = True
        if streaminfo != {}:
            params = {'switch': streaminfo["switch"], 
                    'interface':streaminfo["interfacelabel"]}
            selopts = NNTSCConn.get_selection_options("rrd-muninbytes", params)
            directions = populateDropdown(selopts, streaminfo, "direction")
            dirdisabled = False
        dddir = {'ddlabel': 'Direction: ', 
                'ddidentifier': 'drpDirection', 
                'ddcollection':'rrd-muninbytes', 
                'dditems':directions, 
                'disabled': dirdisabled}
        dropdowns.append(dddir)

        return dropdowns

    def get_event_label(self, event):
        label = "Munin: " + event["event_time"].strftime("%H:%M:%S")
        label += " %s " % event["type_name"]
        label += "from %s to %s" % (event["source_name"], event["target_name"])
        label += ", severity level = %s/100" % event["severity"]
        return label
 

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
