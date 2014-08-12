from ampweb.views.collections.ampicmp import AmpIcmpGraph

class AmpTracerouteGraph(AmpIcmpGraph):

    def format_data(self, data):
        """ Format the data appropriately for display in the web graphs """
        results = {}
        for line, datapoints in data.iteritems():
            groupresults = []
            for datapoint in datapoints:
                result = [datapoint["timestamp"] * 1000]
                if "length" in datapoint:
                    result += self._format_percentile(datapoint)
                
                if (len(result) > 0):
                    groupresults.append(result)

            results[line] = groupresults
        return results

    def _format_percentile(self, datapoint):
        """ Format path length percentile values for smokeping style graphs """
        result = []
        
        median = None
        if "length" in datapoint and datapoint["length"] is not None:
            count = len(datapoint["length"])
            if count > 0 and count % 2:
                median = float(datapoint["length"][count/2]);
            elif count > 0:
                median = (float(datapoint["length"][count/2]) +
                        float(datapoint["length"][count/2 - 1]))/2.0
        result.append(median)
        # this is normally the loss value, could we use error codes here?
        result.append(0)
        
        if "length" in datapoint and datapoint["length"] is not None:
            for value in datapoint["length"]:
                result.append(float(value))
        return result

    def get_collection_name(self):
        return "amp-traceroute"

    def get_default_title(self):
        return "AMP Traceroute Graphs"

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

    def get_browser_collections(self):
        # Need a collection for rainbow as well as standard traceroute graphs

        return [
        { "family":"AMP",
          "label": "Traceroute Hop Count",
          "description":"Measure the path length from an AMP monitor to a target name or address.",
          "link":"view/amp-traceroute"
        },
        ]


class AmpAsTracerouteGraph(AmpTracerouteGraph):
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
                elif "length" in datapoint:
                    result += self._format_percentile(datapoint)
                
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

    def get_browser_collections(self):
        # Need a collection for rainbow as well as standard traceroute graphs

        return [
        { "family":"AMP",
          "label": "AS Traceroute Path",
          "description": "Measure the autonomous systems in the path from an AMP monitor to a target address.",
          "link":"view/amp-astraceroute"
        },
        {
          "family": "AMP",
          "label": "Traceroute Map",
          "description": "Visualise traceroute paths in a network",
          "link": "view/amp-traceroute-map"
        }
        ]

    def _format_path(self, datapoint):
        """ Format full path descriptions for rainbow style graphs """
        result = []

        if "path" in datapoint:
            # XXX Parsing IP path for backwards compatibility
            # length, list of (address, latency) pairs
            result.append(len(datapoint["path"]))
            result.append(zip(datapoint["path"],
                        [0]*len(datapoint["path"])))

        elif "aspath" in datapoint:
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

            result.append(pathlen)
            result.append(aspath)
        else:
            result.append(0)
            result.append([])
        return result


# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :


