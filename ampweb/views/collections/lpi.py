import sys, string

from ampy import ampdb
from ampweb.views.collections.collection import CollectionGraph

# I've put the Graph classes for all of the LPI metrics in this one file,
# because there is a lot of shared code between them and it didn't seem
# sensible to make another source file with common LPI code in it

def lpibasic_destination_parameters(urlparts):
    params = {}

    if len(urlparts) < 2:
        params['source'] = None
    else:
        params['source'] = urlparts[1]

    if len(urlparts) < 3:
        params['protocol'] = None
    else:
        params['protocol'] = urlparts[2]

    if len(urlparts) < 4:
        params['direction'] = None
    else:
        params['direction'] = urlparts[3]

    params['_requesting'] = 'users'
    return params

def lpibasic_stream_parameters(urlparts):
    params = {}
    if len(urlparts) > 1:
        params['source'] = urlparts[1]
    if len(urlparts) > 2:
        params['user'] = urlparts[2]
    if len(urlparts) > 3:
        params['protocol'] = urlparts[3]
    if len(urlparts) > 4:
        params['direction'] = urlparts[4]
    return params

def lpi_dropdown_source(collection, NNTSCConn, streaminfo):

    params = {'_requesting':'sources'}
    sources = NNTSCConn.get_selection_options(collection, params)

    if streaminfo == {}:
        selected = ""
    else:
        selected = streaminfo['source']

    ddsrc = {'ddlabel': 'Source: ',
            'ddidentifier': "drpSource",
            'ddcollection': collection,
            'dditems':sources,
            'ddselected':selected,
            'disabled':False}

    return ddsrc

def lpi_dropdown_proto(collection, NNTSCConn, streaminfo):

    params = {'_requesting':'protocols'}
    protos = NNTSCConn.get_selection_options(collection, params)
    if streaminfo == {}:
        selected = ""
    else:
        selected = streaminfo['protocol']

    ddproto = {'ddlabel': 'Protocol: ',
            'ddidentifier': "drpProtocol",
            'ddcollection': collection,
            'dditems':protos,
            'ddselected': selected,
            'disabled':False}

    return ddproto

def lpi_dropdown_direction(collection, NNTSCConn, streaminfo):

    params = {'_requesting':'directions'}
    dirs = NNTSCConn.get_selection_options(collection, params)
    if streaminfo == {}:
        selected = ""
    else:
        selected = streaminfo['dir']

    dddir = {'ddlabel': 'Direction: ',
            'ddidentifier': "drpDirection",
            'ddcollection': collection,
            'dditems':dirs,
            'ddselected': selected,
            'disabled':False}

    return dddir

def lpi_dropdown_user(collection, NNTSCConn, streaminfo):

    users = []
    userdisabled = True
    selected = ""

    if streaminfo != {}:
        params = {'_requesting':'users', 'source': streaminfo['source'],
                'protocol': streaminfo["protocol"],
                'direction': streaminfo["dir"]}
        users = NNTSCConn.get_selection_options(collection, params)
        userdisabled = False
        selected = streaminfo['user']

    dduser = {'ddlabel': 'User: ',
            'ddidentifier': "drpUser",
            'ddcollection': collection,
            'dditems':users,
            'ddselected':selected,
            'disabled':userdisabled}

    return dduser


class LPIBytesGraph(CollectionGraph):
    def get_destination_parameters(self, urlparts):
        return lpibasic_destination_parameters(urlparts)

    def get_stream_parameters(self, urlparts):
        params = lpibasic_stream_parameters(urlparts)
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

    def get_dropdowns(self, NNTSCConn, streamid, streaminfo):
        NNTSCConn.create_parser("lpi-bytes");
        dropdowns = []
        name = self.get_collection_name()

        ddsrc = lpi_dropdown_source(name, NNTSCConn, streaminfo)
        dropdowns.append(ddsrc)

        ddproto = lpi_dropdown_proto(name, NNTSCConn, streaminfo)
        dropdowns.append(ddproto)

        dddir = lpi_dropdown_direction(name, NNTSCConn, streaminfo)
        dropdowns.append(dddir)

        dduser = lpi_dropdown_user(name, NNTSCConn, streaminfo)
        dropdowns.append(dduser)

        return dropdowns

    def get_collection_name(self):
        return "lpi-bytes"

    def get_default_title(self):
        return "CUZ - Libprotoident Graphs"

    def get_event_label(self, event):
        info = event["target_name"].split('|')

        label = "LPI: " + event["event_time"].strftime("%H:%M:%S")
        label += " %s " % event["type_name"]
        label += "on '%s bytes %s' measured at %s for user %s" % \
                (info[2], info[1], event["source_name"], info[0])
        label += ", severity level = %s/100" % event["severity"]
        return label


class LPIPacketsGraph(CollectionGraph):
    def get_destination_parameters(self, urlparts):
        return lpibasic_destination_parameters(urlparts)

    def get_stream_parameters(self, urlparts):
        params = lpibasic_stream_parameters(urlparts)
        return params

    def format_data(self, data):
        results = {}
        for stream_id,stream_data in data.iteritems():
            results[stream_id] = []
            for datapoint in stream_data:
                result = [datapoint["timestamp"] * 1000]
                if "packets" in datapoint and datapoint["packets"] != None:
                    result.append(float(datapoint["packets"]))
                else:
                    result.append(None)
                results[stream_id].append(result)
        return results

    def get_dropdowns(self, NNTSCConn, streamid, streaminfo):
        NNTSCConn.create_parser("lpi-packets");
        dropdowns = []
        name = self.get_collection_name()

        ddsrc = lpi_dropdown_source(name, NNTSCConn, streaminfo)
        dropdowns.append(ddsrc)

        ddproto = lpi_dropdown_proto(name, NNTSCConn, streaminfo)
        dropdowns.append(ddproto)

        dddir = lpi_dropdown_direction(name, NNTSCConn, streaminfo)
        dropdowns.append(dddir)

        dduser = lpi_dropdown_user(name, NNTSCConn, streaminfo)
        dropdowns.append(dduser)

        return dropdowns

    def get_collection_name(self):
        return "lpi-packets"

    def get_default_title(self):
        return "CUZ - Libprotoident Graphs"

    def get_event_label(self, event):
        info = event["target_name"].split('|')

        label = "LPI: " + event["event_time"].strftime("%H:%M:%S")
        label += " %s " % event["type_name"]
        label += "on '%s packets %s' measured at %s for user %s" % \
                (info[1], info[2], event["source_name"], info[3])
        label += ", severity level = %s/100" % event["severity"]
        return label


class LPIFlowsGraph(CollectionGraph):
    def get_destination_parameters(self, urlparts):
        return lpibasic_destination_parameters(urlparts)

    def get_stream_parameters(self, urlparts):
        params = lpibasic_stream_parameters(urlparts)
        if len(urlparts) > 5:
            params['metric'] = urlparts[5]
        return params

    def format_data(self, data):
        results = {}
        for stream_id,stream_data in data.iteritems():
            results[stream_id] = []
            for datapoint in stream_data:
                result = [datapoint["timestamp"] * 1000]
                if "flows" in datapoint and datapoint["flows"] != None:
                    result.append(float(datapoint["flows"]))
                else:
                    result.append(None)
                results[stream_id].append(result)
        return results

    def get_dropdowns(self, NNTSCConn, streamid, streaminfo):
        NNTSCConn.create_parser("lpi-flows");
        dropdowns = []
        name = self.get_collection_name()

        ddsrc = lpi_dropdown_source(name, NNTSCConn, streaminfo)
        dropdowns.append(ddsrc)

        ddproto = lpi_dropdown_proto(name, NNTSCConn, streaminfo)
        dropdowns.append(ddproto)

        dddir = lpi_dropdown_direction(name, NNTSCConn, streaminfo)
        dropdowns.append(dddir)

        dduser = lpi_dropdown_user(name, NNTSCConn, streaminfo)
        dropdowns.append(dduser)

        return dropdowns

    def get_collection_name(self):
        return "lpi-flows"

    def get_default_title(self):
        return "CUZ - Libprotoident Graphs"

    def get_event_label(self, event):
        info = event["target_name"].split('|')

        label = "LPI: " + event["event_time"].strftime("%H:%M:%S")
        label += " %s " % event["type_name"]
        label += "on '%s %s flows %s' measured at %s for user %s" % \
                (info[1], info[4], info[2], event["source_name"], info[3])
        label += ", severity level = %s/100" % event["severity"]
        return label


class LPIUsersGraph(CollectionGraph):
    def get_destination_parameters(self, urlparts):
        return {}

    def get_stream_parameters(self, urlparts):
        params = {}
        if len(urlparts) > 1:
            params['source'] = urlparts[1]
        if len(urlparts) > 2:
            params['protocol'] = urlparts[2]
        if len(urlparts) > 3:
            params['metric'] = urlparts[3]
        return params

    def format_data(self, data):
        results = {}
        for stream_id,stream_data in data.iteritems():
            results[stream_id] = []
            for datapoint in stream_data:
                result = [datapoint["timestamp"] * 1000]
                if 'users' in datapoint:
                    result.append(float(datapoint['users']))
                else:
                    result.append(None)
                results[stream_id].append(result)
        return results

    def get_dropdowns(self, NNTSCConn, streamid, streaminfo):
        NNTSCConn.create_parser("lpi-users")
        dropdowns = []
        name = self.get_collection_name()

        ddsrc = lpi_dropdown_source(name, NNTSCConn, streaminfo)
        dropdowns.append(ddsrc)

        ddproto = lpi_dropdown_proto(name, NNTSCConn, streaminfo)
        dropdowns.append(ddproto)

        return dropdowns

    def get_collection_name(self):
        return "lpi-users"

    def get_default_title(self):
        return "CUZ - Libprotoident Graphs"

    def get_event_label(self, event):
        info = event["target_name"].split('|')

        label = "LPI: " + event["event_time"].strftime("%H:%M:%S")
        label += " %s " % event["type_name"]
        label += "on '%s %s users' measured at %s" % \
                (info[1], info[2], event["source_name"])
        label += ", severity level = %s/100" % event["severity"]
        return label


# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
