from ampweb.views.collections.amplatency import AmpLatencyGraph

import datetime


class AmpLossGraph(AmpLatencyGraph):
    def __init__(self, metric):
        super(AmpLossGraph, self).__init__()
        self.metric = metric

    def format_data(self, data):
        results = {}

        for line, datapoints in data.iteritems():
            results[line] = []
            for datapoint in datapoints:
                if "timestamp" not in datapoint:
                    continue
                result = [datapoint["timestamp"] * 1000]

                if "loss" in datapoint and "results" in datapoint:
                    losspct = (float(datapoint["loss"]) /
                            float(datapoint["results"]) * 100.0)
                    result.append(losspct)
                else:
                    result.append(0)

                results[line].append(result)
        return results

    def getMatrixTabs(self):
        return [
            { 'id': 'loss-tab', 'descr': 'Loss', 'title': 'Loss' },
        ]

    def get_collection_name(self):
        return self.get_event_graphstyle()

    def get_default_title(self):
        return "AMP Loss Graphs"

    def get_event_graphstyle(self):
        if self.metric == "icmp":
            return "amp-icmp"
        if self.metric == "dns":
            return "amp-dns"
        if self.metric == "tcpping":
            return "amp-tcpping"

        return "amp-latency"

    def generateSparklineData(self, dp, test):
        if 'loss_sum' in dp and 'results_sum' in dp:
            if dp['results_sum'] == 0:
                return None
            if dp['loss_sum'] is None or dp['results_sum'] is None:
                return None

            return (dp['loss_sum'] / float(dp['results_sum'])) * 100.0

        if 'timestamp_count' in dp and 'rtt_count' in dp:
            if dp['timestamp_count'] is None or dp['rtt_count'] is None:
                return None
            if dp['timestamp_count'] == 0:
                return None

            value = float(dp['timestamp_count'] - dp['rtt_count'])
            return (value / dp['timestamp_count']) * 100.0

        return None

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

            if 'loss' in dp[0] and 'results' in dp[0]:
                value = float(dp[0]['loss']) / dp[0]['results']
                formatted[key] = "%d%%" % (round(value * 100))

            if 'timestamp_count' in dp[0] and 'rtt_count' in dp[0]:
                if dp[0]['timestamp_count'] == 0:
                    value = 1.0
                else:
                    value = float(dp[0]['timestamp_count'] - dp[0]['rtt_count'])
                    value = value / dp[0]['timestamp_count']

                formatted[key] = "%d%%" % (round(value * 100))

        return "%s / %s" % (formatted['ipv4'], formatted['ipv6'])


    def _format_lossmatrix_data(self, recent):
        lossprop = 0.0

        if len(recent) == 0:
            return [1, -1]

        recent = recent[0]

        if "loss_sum" in recent and "results_sum" in recent:
            lossprop = recent['loss_sum'] / float(recent['results_sum'])
        if "timestamp_count" in recent and "rtt_count" in recent:
            if recent['timestamp_count'] == 0:
                lossprop = 1.0
            else:
                lossprop = (recent['timestamp_count'] - recent['rtt_count'])
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
            return {'view':-1}

        result = {'view':view_id, 'ipv4': -1, 'ipv6': -1}

        # Loss matrix uses very different metrics to the latency matrix
        if keyv4 in recent:
            result['ipv4'] = self._format_lossmatrix_data(recent[keyv4])
        if keyv6 in recent:
            result['ipv6'] = self._format_lossmatrix_data(recent[keyv6])
        return result


    def get_event_label(self, streamprops):
        return "   Unknown Loss Event"

    def get_browser_collections(self):
        return [
            { "family":"AMP",
              "label": "Loss",
              "description": "Measure ICMP, TCP or DNS packet loss from an AMP monitor to a target name or address",
              "link":"view/amp-loss"
            },
        ]



# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :


