from ampweb.views.collections.collection import CollectionGraph

class AmpUdpstreamGraph(CollectionGraph):

    def _convert_raw(self, dp):
        res = [dp['timestamp'] * 1000]

        if 'min_jitter' in dp and dp['min_jitter'] is not None:
            res.append(dp['min_jitter'] / 1000.0)
        else:
            res.append(None)

        for pct in range(10, 101, 10):
            field = 'jitter_percentile_%d' % (pct)

            if field in dp and dp[field] is not None:
                res.append(dp[field] / 1000.0)
            else:
                res.append(None)

        return res


    def format_data(self, data):
        results = {}

        for line, datapoints in data.iteritems():
            results[line] = []
            for dp in datapoints:
                res = self._convert_raw(dp)
                results[line].append(res)

        return results

    def getMatrixTabs(self):
        return []

    def get_collection_name(self):
        return "amp-udpstream"

    def get_default_title(self):
        return "AMP UDPStream Delay Variation Graphs"

    def get_event_graphstyle(self):
        return "amp-udpstream"

    def generateSparklineData(self, dp, test):
        return None

    def formatTooltipText(self, result, test):
        return "TODO / TODO"

    def generateMatrixCell(self, src, dst, urlparts, cellviews, recent,
            daydata=None):

        return {'view': -1}

    def get_event_label(self, streamprops):
        return "   Unknown UDP Stream Jitter Event"

    def get_event_sources(self, streamprops):
        return [streamprops['source']]

    def get_event_targets(self, streamprops):
        return [streamprops['destination']]

    def get_browser_collections(self):
        return [
            { "family": "AMP",
              "label": "UDPStream",
              "description": "Measure packet delay variation while sending a burst of equally-spaced UDP packets",
              "link": "view/amp-udpstream"
            },
            { "family": "AMP",
              "label": "UDPStream Latency",
              "description": "Measure latency observed for a burst of equally-sized UDP packets",
              "link": "view/amp-udpstream-latency"
            }
        ]


# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
