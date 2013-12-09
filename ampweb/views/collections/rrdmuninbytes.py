import sys, string

from ampy import ampdb
from ampweb.views.collections.collection import CollectionGraph

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
        results = {}
        for stream_id,stream_data in data.iteritems():
            results[stream_id] = []
            for datapoint in stream_data:
                result = [datapoint["timestamp"] * 1000]
                if "mbps" in datapoint and datapoint["mbps"] != None:
                    result.append(float(datapoint["mbps"]))
                else:
                    result.append(None)
                results[stream_id].append(result)
        return results

    def get_collection_name(self):
        return "rrd-muninbytes"

    def get_default_title(self):
        return "CUZ - Muninbytes Graphs"

    def get_dropdowns(self, NNTSCConn, streamid, streaminfo):
        dropdowns = []
        switches = []
        interfaces = []
        directions = []

        switches = NNTSCConn.get_selection_options("rrd-muninbytes", {})
        if streaminfo == {}:
            selected = ""
        else:
            selected = streaminfo['switch']

        ddswitch = {'ddlabel': 'Switch: ',
                'ddidentifier': "drpSwitch",
                'ddcollection':'rrd-muninbytes',
                'dditems':switches,
                'ddselected':selected,
                'disabled':False}
        dropdowns.append(ddswitch)

        ifacedisabled = True
        selected = ""
        if streaminfo != {}:
            params = {'switch': streaminfo["switch"]}
            interfaces = NNTSCConn.get_selection_options("rrd-muninbytes", params)
            ifacedisabled = False
            selected = streaminfo['interfacelabel']
        ddinterface = {'ddlabel': 'Interface: ',
                'ddidentifier': 'drpInterface',
                'ddcollection':'rrd-muninbytes',
                'dditems':interfaces,
                'ddselected':selected,
                'disabled':ifacedisabled}
        dropdowns.append(ddinterface)

        dirdisabled = True
        selected = ""
        if streaminfo != {}:
            params = {'switch': streaminfo["switch"],
                    'interface':streaminfo["interfacelabel"]}
            directions = NNTSCConn.get_selection_options("rrd-muninbytes", params)
            selected = streaminfo['direction']
            dirdisabled = False
        dddir = {'ddlabel': 'Direction: ',
                'ddidentifier': 'drpDirection',
                'ddcollection':'rrd-muninbytes',
                'dditems':directions,
                'ddselected':selected,
                'disabled': dirdisabled}
        dropdowns.append(dddir)

        return dropdowns

    def get_event_label(self, event):
        target = event["target_name"].split("|")
        label = "Munin: " + event["event_time"].strftime("%H:%M:%S")
        label += " %s " % event["type_name"]
        label += "in bytes %s on %s:%s" % (target[1], event["source_name"],
                target[0])
        label += ", severity level = %s/100" % event["severity"]
        return label


    def get_event_tooltip(self, event):
        target = event["target_name"].split("|")

        label = "Bytes %s, %s:%s" % (target[1], event["source_name"], 
                target[0])
        return label

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
