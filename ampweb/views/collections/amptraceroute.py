from ampweb.views.collections.ampicmp import AmpIcmpGraph

class AmpTracerouteGraph(AmpIcmpGraph):

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
                if "path" in datapoint:
                    result += self._format_path(datapoint)
                elif "length" in datapoint:
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

    def _format_path(self, datapoint):
        """ Format full path descriptions for rainbow style graphs """
        result = []
        if "error_type" in datapoint:
            result.append(datapoint["error_type"])
            if "error_code" in datapoint:
                result.append(datapoint["error_code"])
            else:
                result.append(0)
        else:
            result.append(0)
            result.append(0)

        if "path" in datapoint:
            # length, list of (address, latency) pairs
            result.append(len(datapoint["path"]))
            result.append(zip(datapoint["path"],
                        [0]*len(datapoint["path"])))
        else:
            result.append(0)
            result.append([])
        return result

    def get_collection_name(self):
        return "amp-traceroute"

    def get_default_title(self):
        return "AMP Traceroute Graphs"

    def get_event_graphstyle(self):
        # Show events using a rainbow graph
        return "amp-traceroute-rainbow"

    def get_event_label(self, event):
        """ Return a formatted event label for traceroute events """
        # TODO Include the address in the event text
        target = event["target_name"].split("|")

        label = event["event_time"].strftime("%H:%M:%S")
        label += "  AMP Traceroute from %s to " % (event["source_name"])
        label += "%s" % (target[0])

        #label = "AMP Traceroute: " + event["event_time"].strftime("%H:%M:%S")
        #label += " %s " % event["type_name"]
        #label += "from %s to " % (event["source_name"])
        #label += "%s at %s (%s bytes)" % (target[0], target[2], target[1])
        #label += ", severity level = %s/100" % event["severity"]
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
        { "family":"AMP",
          "label": "Traceroute Path",
          "description": "Measure the hosts in the path from an AMP monitor to a target address.",
          "link":"view/amp-traceroute-rainbow"
        },
        ]



# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :


