from ampweb.views.collections.collection import CollectionGraph

import datetime

class AmpLatencyGraph(CollectionGraph):

    def format_data(self, data):
        results = {}

        for line, datapoints in data.iteritems():
            results[line] = []
            for datapoint in datapoints:
                result = [datapoint["timestamp"] * 1000]
                median = None
                rttcol = "rtts"

                if "median" in datapoint and datapoint['median'] is not None:
                    median = float(datapoint["median"]) / 1000.0
                    rttcol = "rtts"
                elif "rtt" in datapoint and datapoint['rtt'] is not None:
                    count = len(datapoint["rtt"])
                    if count > 0 and count % 2:
                        median = float(datapoint["rtt"][count/2]) / 1000.0
                    elif count > 0:
                        median = (float(datapoint["rtt"][count/2]) +
                                float(datapoint["rtt"][count/2 - 1]))/2.0/1000.0
                    rttcol = "rtt"

                result.append(median)

                if "loss" in datapoint and "results" in datapoint:
                    losspct = float(datapoint["loss"] / datapoint["results"]) \
                            * 100.0
                    result.append(losspct)
                else:
                    result.append(0)

                if rttcol in datapoint and datapoint[rttcol] is not None:
                    for value in datapoint[rttcol]:
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

    def get_event_label(self, event, streamprops):
        dt = datetime.datetime.fromtimestamp(event["ts_started"])
        label = dt.strftime("%H:%M:%S")
        return label + "   Unknown Latency Event"

    def get_browser_collection(self):
        return [
            { "family":"AMP",
              "label": "Latency",
              "description": "This probably shouldn't be here!",
              "link":"view/amp-latency"
            },
        ]


class AmpIcmpGraph(AmpLatencyGraph):
    def get_event_graphstyle(self):
        return "amp-icmp"

    def get_event_label(self, event, streamprops):
        dt = datetime.datetime.fromtimestamp(event["ts_started"])
        label = dt.strftime("%H:%M:%S")
        label += "  ICMP latency from %s to %s (%s)" % \
                (streamprops["source"], streamprops["destination"], \
                streamprops["family"])
        return label

    def get_browser_collections(self):
        return [
        { "family":"AMP",
          "label": "ICMP",
          "description": "Measure ICMP latency and loss from an AMP monitor to a target name or address.",
          "link":"view/amp-icmp"
        },
        ]


class AmpDnsGraph(AmpLatencyGraph):
    def get_event_graphstyle(self):
        return "amp-dns"

    def get_event_label(self, event, streamprops):

        dt = datetime.datetime.fromtimestamp(event["ts_started"])
        label = dt.strftime("%H:%M:%S")
        label += "  DNS latency from %s to %s requesting %s" % \
                (streamprops["source"], streamprops["destination"], 
                streamprops["query"])

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
    def get_event_graphstyle(self):
        return "amp-tcpping"

    def get_event_label(self, event, streamprops):

        dt = datetime.datetime.fromtimestamp(event["ts_started"])
        label = dt.strftime("%H:%M:%S")
        label += "  TCP latency from %s to %s:%s (%s)" % \
                (streamprops["source"], streamprops["destination"], 
                streamprops["port"], streamprops["family"])

        return label

    def get_browser_collections(self):
        return [
        { "family":"AMP",
          "label": "TCP Ping",
          "description": "Measure TCP handshake latency from an AMP monitor to a target name or address.",
          "link":"view/amp-tcpping"
        },
        ]


# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :


