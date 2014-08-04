from ampweb.views.collections.collection import CollectionGraph

class AmpLatencyGraph(CollectionGraph):

    def format_data(self, data):
        results = {}

        for line, datapoints in data.iteritems():
            results[line] = []
            for datapoint in datapoints:
                result = [datapoint["timestamp"] * 1000]
                median = None
                if "rtt" in datapoint and datapoint["rtt"] is not None:
                    count = len(datapoint["rtt"])
                    if count > 0 and count % 2:
                        median = float(datapoint["rtt"][count/2]) / 1000.0
                    elif count > 0:
                        median = (float(datapoint["rtt"][count/2]) +
                                float(datapoint["rtt"][count/2 - 1]))/2.0/1000.0
                result.append(median)

                if "loss" in datapoint:
                    result.append(float(datapoint["loss"]) * 100.0)
                else:
                    result.append(0)

                if "rtt" in datapoint and datapoint["rtt"] is not None:
                    for value in datapoint["rtt"]:
                        if value is not None:
                            result.append(float(value) / 1000.0)
                        else:
                            result.append(None)
                results[line].append(result)
        #print results
        return results

    def get_collection_name(self):
        return "amp-latency"

    def get_default_title(self):
        return "AMP Latency Graphs"

    def get_event_label(self, event):
        label = event["event_time"].strftime("%H:%M:%S")
        return label + "   Unknown Latency Event"

    def get_browser_collection(self):
        return [
            { "family":"AMP",
              "label": "Latency",
              "description": "This probably shouldn't be here!",
              "link":"view/amp-latency"
            },
        ]

    def get_event_tooltip(self, event):
        return "Unknown Latency Event"

class AmpIcmpGraph(AmpLatencyGraph):

    def get_event_label(self, event):
        target = event["target_name"].split("|")
        label = event["event_time"].strftime("%H:%M:%S")
        
        label += "  ICMP latency from %s to %s (%s)" % \
                (event["source_name"], target[0], target[2].strip())
        return label

    def get_browser_collections(self):
        return [
        { "family":"AMP",
          "label": "ICMP",
          "description": "Measure ICMP latency and loss from an AMP monitor to a target name or address.",
          "link":"view/amp-icmp"
        },
        ]

    def get_event_tooltip(self, event):
        target = event["target_name"].split("|")
        
        label = "%s from %s to %s %s, %s bytes" % \
                (event["metric_name"], event["source_name"], 
                 target[0], target[2], target[1])
        return label


class AmpDnsGraph(AmpLatencyGraph):

    def get_event_label(self, event):
        target = event["target_name"].split("|")

        label = event["event_time"].strftime("%H:%M:%S")
        label += "  DNS latency from %s to %s requesting %s" % \
                (event["source_name"], target[0], target[2])

        return label

    def get_event_tooltip(self, event):
        target = event["target_name"].split("|")

        label = "%s requesting %s from %s (%s)" % (event["source_name"],
                target[2], target[0], target[1])
        return label

    def get_browser_collections(self):
        return [
        { "family":"AMP",
          "label": "DNS",
          "description": "Measure query response latency from an AMP monitor to a target DNS server.",
          "link":"view/amp-dns"
        },
        ]


class AmpTcppingGraph(AmpLatencyGraph):

    def get_event_label(self, event):
        target = event["target_name"].split("|")

        label = event["event_time"].strftime("%H:%M:%S")
        label += "  TCP latency from %s to %s:%s (%s)" % \
                (event["source_name"], target[0], target[1], \
                target[3].strip())

        return label

    def get_event_tooltip(self, event):
        target = event["target_name"].split("|")

        label = "%s from %s to %s:%s %s, %s bytes" % \
                (event["metric_name"], event["source_name"],
                 target[0], target[1], target[3], target[2]) 
    
    def get_browser_collections(self):
        return [
        { "family":"AMP",
          "label": "TCP Ping",
          "description": "Measure TCP handshake latency from an AMP monitor to a target name or address.",
          "link":"view/amp-tcpping"
        },
        ]


# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :


