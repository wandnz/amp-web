from ampweb.views.collections.collection import CollectionGraph

class AmpTracerouteHopsGraph(CollectionGraph):

    def _convert_raw(self, dp):
        result = [dp["timestamp"] * 1000]
        if "length" in dp:
            result += self._format_percentile(dp, "length")
        elif "responses" in dp:
            result += self._format_percentile(dp, "responses")

        return result

    def _convert_matrix(self, dp):
        result = [dp["timestamp"] * 1000]

        if "responses" in dp and dp['responses'] is not None:
            result.append(int(dp['responses']))
        else:
            result.append(-1)
        return result

    def format_data(self, data):
        """ Format the data appropriately for display in the web graphs """
        results = {}
        for line, datapoints in data.iteritems():
            groupresults = []
            for datapoint in datapoints:
                result = self._convert_raw(datapoint)
                        
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

    def getMatrixTabs(self):
        return [
            { 'id': 'hops-tab', 'descr': "Path Length", 'title': "Path Length"}
        ]

    def getMatrixCellDuration(self):
        return 60 * 10

    def getMatrixCellDurationOptionName(self):
        return 'ampweb.matrixperiod.hops'

    def generateMatrixCell(self, src, dst, urlparts, cellviews, recent, 
            daydata=None):

        if (src, dst) in cellviews:
            view_id = cellviews[(src, dst)]
        else:
            view_id = -1

        keyv4 = "%s_%s_ipv4" % (src, dst)
        keyv6 = "%s_%s_ipv6" % (src, dst)
        if keyv4 not in recent and keyv6 not in recent:
            return {'both':-1}

        result = {'both':view_id, 'ipv4': -1, 'ipv6': -1}
        if keyv4 in recent and len(recent[keyv4]) > 0:
            result['ipv4'] = [1, self._convert_matrix(recent[keyv4][0])[1]]
        if keyv6 in recent and len(recent[keyv6]) > 0:
            result['ipv6'] = [1, self._convert_matrix(recent[keyv6][0])[1]]
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
                    aspath = []
                    astext = []
                    for x in p['aspath']:
                        aspath.append(x[2])
                        astext.append(x[0])

                    aspath = [ x[2] for x in p['aspath']]
                    astext = [ x[0] for x in p['aspath']]
                    fullpath = zip(aspath, ippath, astext)

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
            result.append(datapoint['aspath'])
        else:
            result.append([])
        
        if 'aspathlen' in datapoint:
            result.append(datapoint['aspathlen'])
        else:
            result.append(0)

        return result


# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :


