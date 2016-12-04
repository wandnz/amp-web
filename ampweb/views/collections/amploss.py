from ampweb.views.collections.amplatency import AmpLatencyGraph

import datetime


class AmpLossGraph(AmpLatencyGraph):

    def getMatrixTabs(self):
        return [
            { 'id': 'loss-tab', 'descr': 'Loss', 'title': 'Loss' },
        ]

    def get_default_title(self):
        return "AMP Loss Graphs"

    def get_event_graphstyle(self):
        return "amp-loss"

    def get_matrix_data_collection(self):
        return self.get_collection_name()

    def generateSparklineData(self, dp, test):
        dns_req_col = self._get_dns_requests_column(dp)

        if 'loss' in dp and 'results' in dp:
            if dp['results'] == 0:
                return None
            if dp['loss'] is None or dp['results'] is None:
                return None

            return (dp['loss'] / float(dp['results'])) * 100.0

        if dns_req_col in dp and 'rtt_count' in dp:
            if dp[dns_req_col] is None or dp['rtt_count'] is None:
                return None
            if dp[dns_req_col] == 0 or dp['rtt_count'] > dp[dns_req_col]:
                return None

            value = float(dp[dns_req_col] - dp['rtt_count'])
            return (value / dp[dns_req_col]) * 100.0

        if 'packets_sent_sum' in dp and 'packets_recvd_sum' in dp:
            if dp['packets_sent_sum'] is None or dp['packets_recvd_sum'] is None:
                return None
            if dp['packets_sent_sum'] == 0 or \
                    dp['packets_sent_sum'] < dp['packets_recvd_sum']:
                return None

            value = float(dp['packets_sent_sum'] - dp['packets_recvd_sum'])
            return (value / dp['packets_sent_sum']) * 100.0


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

            dns_req_col = self._get_dns_requests_column(dp[0])

            if 'loss_sum' in dp[0] and 'results_sum' in dp[0]:
                value = float(dp[0]['loss_sum']) / dp[0]['results_sum']
                formatted[key] = "%d%%" % (round(value * 100))

            if self._is_udpstream_datapoint(dp[0]):
                if dp[0]['packets_sent'] < dp[0]['packets_recvd'] or \
                        dp[0]['packets_sent'] == 0:
                    formatted[key] = "Unknown"
                    continue

                value = float(dp[0]['packets_sent'] - dp[0]['packets_recvd'])
                value = value / dp[0]['packets_sent']
                formatted[key] = "%d%%" % (round(value * 100))


            if dns_req_col is not None and 'rtt_count' in dp[0]:
                if dp[0]['rtt_count'] > dp[0][dns_req_col]:
                    formatted[key] = "Unknown"
                    continue

                if dp[0][dns_req_col] == 0:
                    value = 1.0
                else:
                    value = float(dp[0][dns_req_col] - dp[0]['rtt_count'])
                    value = value / dp[0][dns_req_col]

                formatted[key] = "%d%%" % (round(value * 100))

        return "%s / %s" % (formatted['ipv4'], formatted['ipv6'])


    def _format_lossmatrix_data(self, recent):
        lossprop = 0.0

        if len(recent) == 0:
            return [1, -1]

        recent = recent[0]

        dns_req_col = self._get_dns_requests_column(recent)
    
        if "loss_sum" in recent and "results_sum" in recent:
            lossprop = recent['loss_sum'] / float(recent['results_sum'])
        elif "packets_sent" in recent and "packets_recvd" in recent:
            if recent["packets_sent"] is None or \
                    recent["packets_recvd"] is None:
                lossprop = 1.0
            elif recent["packets_sent"] == 0 or \
                    recent["packets_sent"] < recent["packets_recvd"]:
                lossprop = 1.0
            else:
                lossprop = (recent["packets_sent"] - recent["packets_recvd"])
                lossprop = lossprop / float(recent["packets_sent"])


        elif dns_req_col is not None and "rtt_count" in recent:
            if recent[dns_req_col] == 0 or recent['rtt_count'] > \
                        recent[dns_req_col]:
                lossprop = 1.0
            else:
                lossprop = (recent[dns_req_col] - recent['rtt_count'])
                lossprop = lossprop / float(recent[dns_req_col])
    

        return [1, int(round(lossprop * 100))]

    def generateMatrixCell(self, src, dst, urlparts, cellviews, recent, 
            daydata=None):

        if (src, dst) in cellviews:
            view_id = cellviews[(src, dst)]
        else:
            view_id = -1

        if 'direction' not in urlparts:
            keyv4 = "%s_%s_ipv4" % (src, dst)
            keyv6 = "%s_%s_ipv6" % (src, dst)
        else:
            keyv4 = "%s_%s_%s_ipv4" % (src, dst, urlparts['direction'])
            keyv6 = "%s_%s_%s_ipv6" % (src, dst, urlparts['direction'])

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
        if 'family' in streamprops:

            return "   Packet Loss observed between %s and %s (%s)" % \
                    (streamprops['source'], streamprops['destination'],
                     streamprops['family'])
        else:
            return "   Packet Loss observed between %s and %s" % \
                    (streamprops['source'], streamprops['destination'])


    def get_event_sources(self, streamprops):
        return [streamprops['source']]

    def get_event_targets(self, streamprops):
        return [streamprops['destination']]

    def get_browser_collections(self):
        return [
            { "family":"AMP",
              "label": "Loss",
              "description": "Measure ICMP, TCP, DNS or UDPStream packet loss from an AMP monitor to a target name or address.",
              "link":"view/amp-loss"
            },
        ]



# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :


