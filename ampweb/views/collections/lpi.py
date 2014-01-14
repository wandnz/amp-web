import sys, string

from ampy import ampdb
from ampweb.views.collections.collection import CollectionGraph

# I've put the Graph classes for all of the LPI metrics in this one file,
# because there is a lot of shared code between them and it didn't seem
# sensible to make another source file with common LPI code in it

def lpibasic_destination_parameters(urlparts):
    params = {}
    if len(urlparts) < 2:
        params['_requesting'] = "source"
    elif len(urlparts) < 3:
        params['_requesting'] = "protocol"
        params['source'] = urlparts[1]
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

def lpibasic_event_label(event, proto, metric, user):

    label = event["event_time"].strftime("%H:%M:%S")
    label += "  LPI %s %s measured at %s" % \
            (proto, metric, event["source_name"])

    if user is not None:
        label += " for user %s" % (user)
    return label


class LPIBytesGraph(CollectionGraph):
    def get_destination_parameters(self, urlparts):
        params = {}
        if len(urlparts) < 3:
            params = lpibasic_destination_parameters(urlparts)
        else:
            params['_requesting'] = "user"
            params['source'] = urlparts[1]
            params['protocol'] = urlparts[2]
        return params

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


    def get_collection_name(self):
        return "lpi-bytes"

    def get_default_title(self):
        return "CUZ - Libprotoident Graphs"

    def get_event_label(self, event):
        info = event["target_name"].split('|')
      
        return lpibasic_event_label(event, info[2], "bytes " + info[1], info[0])  

    def get_event_tooltip(self, event):
        info = event["target_name"].split('|')
       
        label = "%s bytes %s at %s" % (info[2], info[1], event["source_name"])
        return label 

    def get_browser_collections(self):
        return [
        { "family":"Libprotoident",
          "label": "Bytes",
          "description":"Measure application protocol traffic volumes using libprotoident",
          "link":"view/lpi-bytes"
        },
        ]


class LPIPacketsGraph(CollectionGraph):
    def get_destination_parameters(self, urlparts):
        params = {}
        if len(urlparts) < 3:
            params = lpibasic_destination_parameters(urlparts)
        else:
            params['_requesting'] = "user"
            params['source'] = urlparts[1]
            params['protocol'] = urlparts[2]
        return params

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

    def get_collection_name(self):
        return "lpi-packets"

    def get_default_title(self):
        return "CUZ - Libprotoident Graphs"

    def get_event_label(self, event):
        info = event["target_name"].split('|')
        return lpibasic_event_label(event, info[2], "packets " + info[1], info[0])  

    def get_event_tooltip(self, event):
        info = event["target_name"].split('|')
       
        label = "%s packets %s at %s" % (info[2], info[1], event["source_name"])
        return label 
    
    def get_browser_collections(self):
            return [
            { "family":"Libprotoident",
              "label": "Packets",
              "description":"Measure application protocol packet counts using libprotoident",
              "link":"view/lpi-packets"
            },
            ]

class LPIFlowsGraph(CollectionGraph):
    def get_destination_parameters(self, urlparts):
        params = {}
        if len(urlparts) < 3:
            params = lpibasic_destination_parameters(urlparts)
        elif len(urlparts) < 4:
            params['_requesting'] = "user"
            params['source'] = urlparts[1]
            params['protocol'] = urlparts[2]
        else:
            params['_requesting'] = "metric"
            params['source'] = urlparts[1]
            params['protocol'] = urlparts[2]
            params['user'] = urlparts[3]
        return params

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

    def get_collection_name(self):
        return "lpi-flows"

    def get_default_title(self):
        return "CUZ - Libprotoident Graphs"

    def get_event_label(self, event):
        info = event["target_name"].split('|')
        
        return lpibasic_event_label(event, info[2], info[3] + " flows " + info[1], info[0])  

    def get_event_tooltip(self, event):
        info = event["target_name"].split('|')
       
        label = "%s %s flows %s at %s" % (info[2], info[3], info[1], \
                event["source_name"])
        return label 
    def get_browser_collections(self):
        return [
        { "family":"Libprotoident",
          "label": "Flows",
          "description":"Measure application protocol flows using libprotoident",
          "link":"view/lpi-flows"
        },
        ]

class LPIUsersGraph(CollectionGraph):
    def get_destination_parameters(self, urlparts):
        params = {}
        if len(urlparts) < 3:
            params = lpibasic_destination_parameters(urlparts)
        else:
            params['_requesting'] = "metric"
            params['source'] = urlparts[1]
            params['protocol'] = urlparts[2]
        return params

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

    def get_collection_name(self):
        return "lpi-users"

    def get_default_title(self):
        return "CUZ - Libprotoident Graphs"

    def get_event_label(self, event):
        info = event["target_name"].split('|')

        return lpibasic_event_label(event, info[1], info[0] + " users", None)  

    def get_event_tooltip(self, event):
        info = event["target_name"].split('|')
       
        label = "%s %s users at %s" % (info[1], info[0], event["source_name"])
        return label 
    
    def get_browser_collections(self):
        return [
        { "family":"Libprotoident",
          "label": "Users",
          "description":"Measure application protocol users using libprotoident",
          "link":"view/lpi-users"
        },
        ]

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
