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
        return results

    def getMatrixTabs(self):
        return [
            { 'id': 'latency-tab', 'descr': 'Latency relative to the mean',
              'title': 'Latency' },
            { 'id': 'absolute-latency-tab', 
              'descr': 'Absolute Latency',
              'title': 'Absolute Latency' },
            { 'id': 'loss-tab', 'descr': 'Loss', 'title': 'Loss' },
        ]

    def get_collection_name(self):
        return "amp-latency"

    def get_default_title(self):
        return "AMP Latency Graphs"

    def getMatrixCellDuration(self):
        return 60 * 10

    def getMatrixCellDurationOptionName(self):
        return 'ampweb.matrixperiod.latency'

    def _format_matrix_data(self, recent, daydata=None):
        if 'median_avg' in recent:
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

    def _format_lossmatrix_data(self, recent):
        lossprop = 0.0

        if "loss_sum" in recent and "results_sum" in recent:
            lossprop = recent['loss_sum'] / float(recent['results_sum'])
        if "timestamp_count" in recent and "rtt_count" in recent:
            lossprop = (recent['timestamp_count'] - recent['rttcount'])
            lossprop = lossprop / float(recent['timestamp_count'])

        return [1, int(round(lossprop * 100))]

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

        # Loss matrix uses very different metrics to the latency matrix
        if urlparts['testType'] == "loss":
            if keyv4 in recent and len(recent[keyv4]) > 0:
                result['ipv4'] = self._format_lossmatrix_data(recent[keyv4][0])
            if keyv6 in recent and len(recent[keyv6]) > 0:
                result['ipv6'] = self._format_lossmatrix_data(recent[keyv6][0])
        else:
            if keyv4 in recent and len(recent[keyv4]) > 0:
                if daydata and keyv4 in daydata and len(daydata[keyv4]) > 0:
                    day = daydata[keyv4][0]
                else:
                    day = None
                result['ipv4'] = self._format_matrix_data(recent[keyv4][0], day)
            if keyv6 in recent and len(recent[keyv6]) > 0:
                if daydata and keyv6 in daydata and len(daydata[keyv6]) > 0:
                    day = daydata[keyv6][0]
                else:
                    day = None
                result['ipv6'] = self._format_matrix_data(recent[keyv6][0], day)

        return result
        


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
    
    def getMatrixCellDuration(self):
        return 60 * 30

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


