from ampweb.views.collections.collection import CollectionGraph

import datetime


class AmpLatencyGraph(CollectionGraph):

    def format_data(self, data):
        results = {}

        for line, datapoints in data.iteritems():
            results[line] = []
            for datapoint in datapoints:
                if "timestamp" not in datapoint:
                    continue
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
                    losspct = (float(datapoint["loss"]) /
                            float(datapoint["results"]) * 100.0)
                    result.append(losspct)
                elif "results" not in datapoint:
                    result.append(None)
                else:
                    result.append(0)

                if rttcol in datapoint and datapoint[rttcol] is not None:
                    for value in datapoint[rttcol]:
                        if value is not None:
                            result.append(float(value) / 1000.0)
                        else:
                            result.append(None)

                results[line].append(result)
        return results

    def format_raw_data(self, descr, data, start, end):
        results = []

        for line, datapoints in data.iteritems():
            gid = int(line.split("_")[1])
            # build the metadata block for each stream
            metadata = [("collection", descr[gid]["collection"]),
                        ("source", descr[gid]["source"]),
                        ("destination", descr[gid]["destination"]),
                        # prefer the family in the line info rather than the
                        # one listed in the "aggregation" field, as that could
                        # have a special value. The line id will always be the
                        # actual value.
                        ("family", line.split("_")[2].lower())
                        ]

            # these stream properties may not be part of every latency
            # collection, so only add those that are present
            for item in ["packet_size", "query", "query_class", "query_type",
                    "udp_payload_size", "flags"]:
                if item in descr[gid]:
                    metadata.append((item, descr[gid][item]))

            thisline = []
            for datapoint in datapoints:
                if "timestamp" not in datapoint:
                    continue
                # the block caching will modify the range of data to match the
                # block boundaries, ignore data outside our query range
                if datapoint["timestamp"] < start or datapoint["timestamp"] > end:
                    continue

                median = None
                if "loss" in datapoint:
                    loss = datapoint["loss"]
                else:
                    loss = None

                if "results" in datapoint:
                    count = datapoint["results"]
                else:
                    count = None



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
                result = {"timestamp": datapoint["timestamp"], "rtt_ms": median,
                        "loss": loss, "results": count}
                thisline.append(result)

            # don't bother adding any lines that have no data
            if len(thisline) > 0:
                results.append({
                    "metadata": metadata,
                    "data": thisline,
                    "datafields":["timestamp", "rtt_ms", "loss", "results"]
                })

        return results

    def getMatrixTabs(self):
        return [
            { 'id': 'latency-tab', 'descr': 'Latency relative to the mean',
              'title': 'Latency' },
            { 'id': 'absolute-latency-tab', 
              'descr': 'Absolute Latency',
              'title': 'Absolute Latency' },
        ]

    def get_collection_name(self):
        return "amp-latency"

    def get_default_title(self):
        return "AMP Latency Graphs"

    def getMatrixCellDuration(self):
        return 60 * 10

    def getMatrixCellDurationOptionName(self):
        return 'ampweb.matrixperiod.latency'

    def _generateLatencySparkline(self, dp):
        if 'median_avg' in dp and dp['median_avg'] is not None:
            return int(round(dp['median_avg']))

        if 'rtt_avg' in dp and dp['rtt_avg'] is not None:
            return int(round(dp['rtt_avg']))

        return None


    def generateSparklineData(self, data, test):
        return self._generateLatencySparkline(data)

    def formatTooltipText(self, result, test):
        
        if result is None:
            return "Unknown / Unknown"

        formatted = { "ipv4": "No data", "ipv6": "No data" }
        for label, dp in result.iteritems():
            if len(dp) == 0:
                continue
            
            if label.lower().endswith("_ipv4"):
                key = "ipv4"
            elif label.lower().endswith("_ipv6"):
                key = "ipv6"
            else:
                key = "unknown"

            if 'rtt_avg' in dp[0]:
                value = dp[0]['rtt_avg']
                if value >= 0 and value < 1000:
                    formatted[key] = "%dus" % round(value)
                elif value >= 1000:
                    formatted[key] = "%dms" % round(float(value) / 1000.0)

            if 'median' in dp[0]:
                value = dp[0]['median']
                if value >= 0 and value < 1000:
                    formatted[key] = "%dus" % round(value)
                elif value >= 1000:
                    formatted[key] = "%dms" % round(float(value) / 1000.0)

        return "%s / %s" % (formatted['ipv4'], formatted['ipv6'])


    def _format_matrix_data(self, recent, daydata=None):
        if recent is None:
            return [1, -1, -1, -1]
        
        if recent.get('median_avg') is not None:
            rttfield = 'median_avg'
            stddev = 'median_stddev'
        else:
            rttfield = 'rtt_avg'
            stddev = 'rtt_stddev'

        if recent.get(rttfield) is not None:
            recent_rtt = int(round(recent[rttfield]))
        else:
            recent_rtt = -1

        if daydata is None:
            day_rtt = -1
            day_stddev = -1
        else:
            if daydata.get(stddev) is not None:
                day_stddev = round(daydata[stddev])
            else:
                day_stddev = 0
            
            if daydata.get(rttfield) is not None:
                day_rtt = int(round(daydata[rttfield]))
            else:
                day_rtt = -1

        return [1, recent_rtt, day_rtt, day_stddev]

    def generateMatrixCell(self, src, dst, urlparts, cellviews, recent, 
            daydata=None):

        if (src, dst) in cellviews:
            view_id = cellviews[(src, dst)]
        else:
            view_id = -1

        keyv4 = "%s_%s_ipv4" % (src, dst)
        keyv6 = "%s_%s_ipv6" % (src, dst)
        if keyv4 not in recent and keyv6 not in recent:
            return {'view':-1}

        result = {'view':view_id, 'ipv4': -1, 'ipv6': -1}

        if keyv4 in recent:
            if len(recent[keyv4]) == 0:
                result['ipv4'] = self._format_matrix_data(None)
            else:
                if daydata and keyv4 in daydata and len(daydata[keyv4]) > 0:
                    day = daydata[keyv4][0]
                else:
                    day = None
                result['ipv4'] = self._format_matrix_data(recent[keyv4][0],
                        day)
        if keyv6 in recent:
            if len(recent[keyv6]) == 0:
                result['ipv6'] = self._format_matrix_data(None)

            else:
                if daydata and keyv6 in daydata and len(daydata[keyv6]) > 0:
                    day = daydata[keyv6][0]
                else:
                    day = None
                result['ipv6'] = self._format_matrix_data(recent[keyv6][0],
                        day)

        return result


    def get_event_label(self, streamprops):
        return "   Unknown Latency Event"

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


    def get_event_label(self, streamprops):
        label = "  ICMP latency from %s to %s (%s)" % \
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
    
    def getMatrixCellDuration(self):
        return 60 * 30

    def get_event_label(self, streamprops):

        label = "  DNS latency from %s to %s requesting %s" % \
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

    def get_event_label(self, streamprops):

        label = "  TCP latency from %s to %s:%s (%s)" % \
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


