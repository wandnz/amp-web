from ampweb.views.collections.collection import CollectionGraph

class AmpTracerouteHopsGraph(CollectionGraph):

    def format_data(self, data):
        """ Format the data appropriately for display in the web graphs """
        results = {}
        for line, datapoints in data.iteritems():
            groupresults = []
            for datapoint in datapoints:
                result = [datapoint["timestamp"] * 1000]
                if "length" in datapoint:
                    result += self._format_percentile(datapoint, "length")
                elif "responses" in datapoint:
                    result += self._format_percentile(datapoint, "responses")
                
                if (len(result) > 0):
                    groupresults.append(result)

            results[line] = groupresults
        return results

    def _format_percentile(self, datapoint, column):
        """ Format path length percentile values for smokeping style graphs """
        result = []
        
        median = None
        if column in datapoint and datapoint[column] is not None:
            count = len(datapoint[column])
            if count > 0 and count % 2:
                median = float(datapoint[column][count/2]);
            elif count > 0:
                median = (float(datapoint[column][count/2]) +
                        float(datapoint[column][count/2 - 1]))/2.0
        result.append(median)
        # this is normally the loss value, could we use error codes here?
        result.append(0)
        
        if column in datapoint and datapoint[column] is not None:
            for value in datapoint[column]:
                result.append(float(value))
        return result

    def get_collection_name(self):
        return "amp-astraceroute"

    def get_default_title(self):
        return "AMP Traceroute Hops Graphs"

    def get_event_label(self, event):
        """ Return a formatted event label for traceroute events """
        # TODO Include the address in the event text
        target = event["target_name"].split("|")

        label = event["event_time"].strftime("%H:%M:%S")
        label += "  AMP Traceroute from %s to " % (event["source_name"])
        label += "%s" % (target[0])

        return label

    def get_event_tooltip(self, event):
        target = event["target_name"].split("|")

        label = "%s to %s %s, %s bytes" % \
                (event["source_name"], target[0], target[2], target[1])
        return label

    def _parse_aspath(self, datapoint):
        pathlen = 0
        aspath = []
        for asn in datapoint['aspath']:
            asnsplit = asn.split('.')
            if len(asnsplit) != 2:
                continue

            if asnsplit[1] == "-2":
                aslabel = "RFC 1918"
            elif asnsplit[1] == "-1":
                aslabel = "No response"
            elif asnsplit[1] == "0":
                aslabel = "Unknown"
            else:
                aslabel = "AS " + asnsplit[1]

            repeats = int(asnsplit[0])
            pathlen += repeats
            
            for i in range(0, repeats):
                aspath.append([aslabel, 0])

        return pathlen, aspath
    
    def _parse_ippath(self, pathstring):
        # Unfortunately postgres tends to give us our path array as a
        # hideous string that needs to be parsed

        if pathstring[0] != '{' or pathstring[-1] != '}':
            # Not valid
            return None

        pathstring = pathstring[1:-1]
        return pathstring.split(',')

    def get_browser_collections(self):
        # Return empty list to avoid duplicates from amp-traceroute
        return []

class AmpTracerouteGraph(AmpTracerouteHopsGraph):
    def format_data(self, data):
        results = {}
        for line, datapoints in data.iteritems():
            groupresults = []
            paths = {}
            for datapoint in datapoints:
                if 'aspath' not in datapoint:
                    continue
                if 'path' not in datapoint or datapoint['path'] == None:
                    continue
                if 'path_id' not in datapoint or datapoint['path_id'] is None:
                    continue
             
                ippath = self._parse_ippath(datapoint['path'])
                if ippath is None:
                    continue
                pathid = datapoint['path_id']

                if 'path_count' in datapoint:
                    freq = datapoint['path_count']
                else:
                    freq = 0
                
                if 'error_type' in datapoint:
                    errtype = datapoint['error_type']
                else:
                    errtype = None

                if 'error_code' in datapoint:
                    errcode = datapoint['error_code']
                else:
                    errcode = None
                

                if pathid not in paths:
                    paths[pathid] = {
                            'path':ippath, 
                            'freq':freq,
                            'errtype':errtype,
                            'errcode':errcode,
                            'aspath':datapoint['aspath'],
                            'mints':datapoint['min_timestamp'],
                            'maxts':datapoint['timestamp']
                    }
                else:
                    paths[pathid]['freq'] += freq

                    if errtype > paths[pathid]['errtype']:
                        paths[pathid]['errtype'] = errtype
                    if errcode > paths[pathid]['errcode']:
                        paths[pathid]['errcode'] = errcode
                    if paths[pathid]['aspath'] is None:
                        paths[pathid]['aspath'] = datapoint['aspath']
                    
                    if datapoint['min_timestamp'] < paths[pathid]['mints']:
                        paths[pathid]['mints'] = datapoint['min_timestamp']                            
                    if datapoint['timestamp'] > paths[pathid]['maxts']:
                        paths[pathid]['maxts'] = datapoint['timestamp']                            

            for p in paths.values():
                ippath = p['path']
                if p['aspath'] is None:
                    fullpath = zip([0] * len(ippath), ippath)
                else:
                    aspathlen, aspath = self._parse_aspath(p)
                    aspath = [x[0] for x in aspath]
                    fullpath = zip(aspath, ippath)

                groupresults.append([p['mints'] * 1000, p['maxts'] * 1000, \
                        fullpath, p['errtype'], p['errcode'], p['freq']])

               
            results[line] = groupresults
        return results

    def get_collection_name(self):
        return "amp-traceroute"

    def get_default_title(self):
        return "AMP Traceroute Graphs"

    def get_browser_collections(self):
        # Put all of our supported graphs in the base collection

        return [
        
        {
          "family": "AMP",
          "label": "Traceroute Map",
          "description": "Visualise all traceroute paths from an AMP monitor to a target name",
          "link": "view/amp-traceroute"
        },

        { "family":"AMP",
          "label": "AS Traceroute Path",
          "description": "Measure the autonomous systems in the path from an AMP monitor to a target name.",
          "link":"view/amp-astraceroute"
        },
        
        { "family":"AMP",
          "label": "Traceroute Hop Count",
          "description":"Measure the path length from an AMP monitor to a target name",
          "link":"view/amp-traceroute-hops"
        },
        ]
            


class AmpAsTracerouteGraph(AmpTracerouteHopsGraph):
    def format_data(self, data):
        """ Format the data appropriately for display in the web graphs """
        results = {}
        for line, datapoints in data.iteritems():
            groupresults = []
            for datapoint in datapoints:
                result = [datapoint["timestamp"] * 1000]
                # we are able to have two different sorts of traceroute data
                # and they need to be formatted slightly differently depending
                # on how they are going to be graphed
                if "aspath" in datapoint or "path" in datapoint:
                    result += self._format_path(datapoint)
                elif "responses" in datapoint:
                    result += self._format_percentile(datapoint, "responses")
                
                if (len(result) > 0):
                    groupresults.append(result)

            results[line] = groupresults
        return results
    
    def get_collection_name(self):
        return "amp-astraceroute"

    def get_default_title(self):
        return "AMP AS Traceroute Graphs"

    def get_event_label(self, event):
        """ Return a formatted event label for traceroute events """
        # TODO Include the address in the event text
        target = event["target_name"].split("|")

        label = event["event_time"].strftime("%H:%M:%S")
        label += "  AMP AS Traceroute from %s to " % (event["source_name"])
        label += "%s" % (target[0])

        return label

    def get_event_tooltip(self, event):
        target = event["target_name"].split("|")

        label = "%s to %s %s, %s bytes" % \
                (event["source_name"], target[0], target[2], target[1])
        return label

        return [
        ]
    
    def get_browser_collections(self):
        # Return empty list to avoid duplicates from amp-traceroute
        return []

    def _format_path(self, datapoint):
        """ Format full path descriptions for rainbow style graphs """
        result = []

        if "aspath" in datapoint:
            pathlen, aspath = self._parse_aspath(datapoint)
            result.append(aspath)
            result.append(pathlen)
        else:
            result.append(0)
            result.append([])
        return result


# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :


