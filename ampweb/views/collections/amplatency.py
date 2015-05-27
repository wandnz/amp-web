from ampweb.views.collections.collection import CollectionGraph

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

    def format_raw_data(self, descr, data, start, end):
        results = {}
        resultstr = ""
        previous = None

        for line, datapoints in data.iteritems():
            gid = int(line.split("_")[1])
            # these need to be updated for every line
            collection = descr[gid]["collection"]
            source = descr[gid]["source"]
            destination = descr[gid]["destination"]

            # prefer the family in the line info rather than the one listed in
            # the "aggregation" field, as that could be listed as a special
            # value like "FAMILY". The line id will always be the actual value
            family = line.split("_")[2].lower()

            # rebuild the header line every time the collection changes
            if previous == None or previous != collection:
                # every latency collection has at least these items
                header = "# metric,source,destination,family"
                static_opts = []
                # some latency collections have some of these fields
                for item in ["packet_size", "query", "query_class", "query_type", "udp_payload_size", "flags"]:
                    if item in descr[gid]:
                        static_opts.append(descr[gid][item])
                        header += "," + item
                # and every collection also has these fields
                header += ",timestamp,rtt_ms"
                resultstr += header + "\n"

            for datapoint in datapoints:
                if "timestamp" not in datapoint:
                    continue
                # the block caching will modify the range of data to match the
                # block boundaries, ignore data outside our query range
                if datapoint["timestamp"] < start or datapoint["timestamp"] > end:
                    continue
                # fill in all the known, constant values
                result = [collection, source, destination, family] + static_opts + [datapoint["timestamp"]]
                median = None

                if "median" in datapoint and datapoint['median'] is not None:
                    median = float(datapoint["median"]) / 1000.0
                elif "rtt" in datapoint and datapoint['rtt'] is not None:
                    median = float(datapoint['rtt']) / 1000.0
                    # XXX are we ever going to get a list of rtts here or is
                    # it always going to be a single value because we don't
                    # use the aggregation functions?
                    #count = len(datapoint["rtt"])
                    #if count > 0 and count % 2:
                    #    median = float(datapoint["rtt"][count/2]) / 1000.0
                    #elif count > 0:
                    #    median = (float(datapoint["rtt"][count/2]) +
                    #            float(datapoint["rtt"][count/2 - 1]))/2.0/1000.0
                result.append(median)
                resultstr += ",".join(str(i) for i in result) + "\n"
            previous = collection

        return resultstr

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
    def get_event_graphstyle(self):
        return "amp-icmp"

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
    def get_event_graphstyle(self):
        return "amp-dns"

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
    def get_event_graphstyle(self):
        return "amp-tcpping"

    def get_event_label(self, event):
        target = event["target_name"].split("|")

        label = event["event_time"].strftime("%H:%M:%S")
        label += "  TCP latency from %s to %s:%s (%s)" % \
                (event["source_name"], target[0], target[1], \
                target[3].strip())

        return label

    def get_event_tooltip(self, event):
        target = event["target_name"].split("|")

        target[1] = target[1].strip()

        if target[1].startswith("port"):
            port = target[1][len("port"):]
        else:
            port = target[1]

        label = "%s from %s to %s:%s %s, %s bytes" % \
                (event["metric_name"], event["source_name"],
                 target[0], port, target[3], target[2])
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


