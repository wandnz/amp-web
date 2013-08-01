import sys, string

from ampy import ampdb
from ampweb.views.collections.collection import CollectionGraph
from ampweb.views.collections.util import populateDropdown

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

def lpibasic_javascripts():
    return ["nntscgraph.js", "dropdown_lpibasic.js", 
        "graphtemplates/basicts.js"]

def lpi_dropdown_metric(collection, streaminfo):
    ddmetric = {'ddlabel': 'Metric: ', 
            'ddidentifier': "drpMetric", 
            'ddcollection':'lpi', 
            'dditems':[], 
            'disabled':False}

    if collection == "lpi-bytes":
        ddmetric['dditems'].append({'name':'bytes', 'selected':True})
    else:
        ddmetric['dditems'].append({'name':'bytes', 'selected':False})

    if collection == "lpi-packets":
        ddmetric['dditems'].append({'name':'packets', 'selected':True})
    else:
        ddmetric['dditems'].append({'name':'packets', 'selected':False})

    if collection == "lpi-flows":
        if streaminfo != {} and streaminfo['metric'] == "peak":
            ddmetric['dditems'].append({'name':'peak flows', 'selected':True})
            ddmetric['dditems'].append({'name':'new flows', 'selected':False})
        else:
            ddmetric['dditems'].append({'name':'peak flows', 'selected':False})
            ddmetric['dditems'].append({'name':'new flows', 'selected':True})
    else:
        ddmetric['dditems'].append({'name':'peak flows', 'selected':False})
        ddmetric['dditems'].append({'name':'new flows', 'selected':False})

    if collection == "lpi-users":
        if streaminfo != {} and streaminfo['metric'] == "active":
            ddmetric['dditems'].append({'name':'active users', 'selected':True})
            ddmetric['dditems'].append({'name':'observed users', 'selected':False})
        else:
            ddmetric['dditems'].append({'name':'active users', 'selected':False})
            ddmetric['dditems'].append({'name':'observed users', 'selected':True})
    else:
        ddmetric['dditems'].append({'name':'active users', 'selected':False})
        ddmetric['dditems'].append({'name':'observed users', 'selected':False})


    return ddmetric

def lpi_dropdown_source(collection, NNTSCConn, streaminfo):

    params = {'_requesting':'sources'}
    selopts = NNTSCConn.get_selection_options(collection, params) 
    sources = populateDropdown(selopts, streaminfo, "source")

    ddsrc = {'ddlabel': 'Source: ', 
            'ddidentifier': "drpSource", 
            'ddcollection': collection, 
            'dditems':sources, 
            'disabled':False}

    return ddsrc

def lpi_dropdown_proto(collection, NNTSCConn, streaminfo):

    params = {'_requesting':'protocols'}
    selopts = NNTSCConn.get_selection_options(collection, params) 
    protos = populateDropdown(selopts, streaminfo, "protocol")

    ddproto = {'ddlabel': 'Protocol: ', 
            'ddidentifier': "drpProtocol", 
            'ddcollection': collection, 
            'dditems':protos, 
            'disabled':False}

    return ddproto

def lpi_dropdown_direction(collection, NNTSCConn, streaminfo):

    params = {'_requesting':'directions'}
    selopts = NNTSCConn.get_selection_options(collection, params) 
    dirs = populateDropdown(selopts, streaminfo, "dir")

    dddir = {'ddlabel': 'Direction: ', 
            'ddidentifier': "drpDirection", 
            'ddcollection': collection, 
            'dditems':dirs, 
            'disabled':False}

    return dddir

def lpi_dropdown_user(collection, NNTSCConn, streaminfo):

    users = []
    userdisabled = True

    if streaminfo != {}:
        params = {'_requesting':'users', 'source': streaminfo['source'],
                'protocol': streaminfo["protocol"],
                'direction': streaminfo["dir"]}
        selopts = NNTSCConn.get_selection_options(collection, params) 
        users = populateDropdown(selopts, streaminfo, "user")
        userdisabled = False        

    dduser = {'ddlabel': 'User: ', 
            'ddidentifier': "drpUser", 
            'ddcollection': collection, 
            'dditems':users, 
            'disabled':userdisabled}

    return dduser


class LPIBytesGraph(CollectionGraph):
    def get_destination_parameters(self, urlparts):
        return lpibasic_destination_parameters(urlparts)

    def get_stream_parameters(self, urlparts):
        params = lpibasic_stream_parameters(urlparts)
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
        return lpibasic_javascripts()

    def get_dropdowns(self, NNTSCConn, streamid, streaminfo):
        dropdowns = []
        name = self.get_collection_name()

        ddmetric = lpi_dropdown_metric(name, streaminfo)
        dropdowns.append(ddmetric)

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


class LPIPacketsGraph(CollectionGraph):
    def get_destination_parameters(self, urlparts):
        return lpibasic_destination_parameters(urlparts)

    def get_stream_parameters(self, urlparts):
        params = lpibasic_stream_parameters(urlparts)
        return params

    def format_data(self, data):
        results = []
        for datapoint in data:
            result = [datapoint["timestamp"] * 1000]
            if "packets" in datapoint and datapoint["packets"] != None:
                result.append(float(datapoint["packets"]))
            else:
                result.append(None)
            results.append(result)
        return results

    def get_javascripts(self):
        return lpibasic_javascripts()

    def get_dropdowns(self, NNTSCConn, streamid, streaminfo):
        dropdowns = []
        name = self.get_collection_name()

        ddmetric = lpi_dropdown_metric(name, streaminfo)
        dropdowns.append(ddmetric)

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

class LPIFlowsGraph(CollectionGraph):
    def get_destination_parameters(self, urlparts):
        return lpibasic_destination_parameters(urlparts)

    def get_stream_parameters(self, urlparts):
        params = lpibasic_stream_parameters(urlparts)
        if len(urlparts) > 5:
            params['metric'] = urlparts[5]
        return params

    def format_data(self, data):
        results = []
        for datapoint in data:
            result = [datapoint["timestamp"] * 1000]
            if "flows" in datapoint and datapoint["flows"] != None:
                result.append(float(datapoint["flows"]))
            else:
                result.append(None)
            results.append(result)
        return results

    def get_javascripts(self):
        return lpibasic_javascripts()

    def get_dropdowns(self, NNTSCConn, streamid, streaminfo):
        dropdowns = []
        name = self.get_collection_name()

        ddmetric = lpi_dropdown_metric(name, streaminfo)
        dropdowns.append(ddmetric)

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
        results = []
        for datapoint in data:
            result = [datapoint["timestamp"] * 1000]
            if 'users' in datapoint:
                result.append(float(datapoint['users']))
            else:
                result.append(None)

            results.append(result)
        return results

    def get_javascripts(self):
        return [
                "dropdown_lpiuser.js",
                "nntscgraph.js",
                "graphtemplates/basicts.js"
        ]

    def get_dropdowns(self, NNTSCConn, streamid, streaminfo):
        
        dropdowns = []
        name = self.get_collection_name()

        ddmetric = lpi_dropdown_metric(name, streaminfo)
        dropdowns.append(ddmetric)

        ddsrc = lpi_dropdown_source(name, NNTSCConn, streaminfo)
        dropdowns.append(ddsrc)

        ddproto = lpi_dropdown_proto(name, NNTSCConn, streaminfo)
        dropdowns.append(ddproto)

        return dropdowns

    def get_collection_name(self):
        return "lpi-users"

    def get_default_title(self):
        return "CUZ - Libprotoident Graphs"


# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
