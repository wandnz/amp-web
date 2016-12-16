from ampweb.views.collections.collection import CollectionGraph

class AmpHttpGraph(CollectionGraph):
    def __init__(self):
        self.minbin_option = "ampweb.minbin.http"

    def _convert_raw(self, dp):
        result = [dp['timestamp'] * 1000]

        for k in ["duration", "server_count", "object_count", "bytes"]:
            if k in dp and dp[k] is not None:
                if k == "duration":
                    result.append(int(dp[k]) / 1000.0)
                elif k == "bytes":
                    result.append(int(dp[k]) / 1024.0)
                else:
                    result.append(dp[k])
            else:
                result.append(None)

        return result

    def _format_matrix_data(self, recent, daydata=None):
        if recent is None:
            return [1, -1, -1, -1, -1, -1, -1]

        if recent.get("duration_avg") is not None:
            recent_dur = recent["duration_avg"] / 1000.0
        else:
            recent_dur = -1

        if recent.get("bytes_max") is not None:
            recent_size = recent["bytes_max"] / 1024.0
        else:
            recent_size = -1

        day_size = -1
        day_size_sd = -1
        day_dur = -1
        day_dur_sd = -1

        if daydata:
            if daydata.get("duration_avg") is not None:
                day_dur = daydata["duration_avg"] / 1000.0

            if daydata.get("duration_stddev") is not None:
                day_dur_sd = daydata["duration_stddev"] / 1000.0

            if daydata.get("bytes_max") is not None:
                day_size = daydata["bytes_max"] / 1024.0

            if daydata.get("bytes_stddev") is not None:
                day_size_sd = daydata["bytes_stddev"] / 1024.0

        return [1, recent_dur, day_dur, day_dur_sd, recent_size, day_size, day_size_sd]

    def format_data(self, data):
        results = {}
        for streamid, streamdata in data.iteritems():
            results[streamid] = []
            for dp in streamdata:
                result = self._convert_raw(dp)
                results[streamid].append(result)
        return results

    def format_raw_data(self, descr, data, start, end):
        results = []
        header = ["collection", "source", "destination", "max_connections",
            "max_connections_per_server",
            "max_persistent_connections_per_server",
            "pipelining_max_requests", "persist", "pipelining", "caching"
        ]

        datacols = ["timestamp", "server_count", "object_count", "duration",
            "bytes"]

        for streamid, streamdata in data.iteritems():
            gid = int(streamid.split("_")[1])
            # build the metadata for each stream
            metadata = []
            for item in header:
                metadata.append((item, descr[gid][item]))

            thisline = []
            for dp in streamdata:
                if "timestamp" not in dp:
                    continue
                if dp["timestamp"] < start or dp["timestamp"] > end:
                    continue

                result = {}
                for k in datacols:
                    if k in dp:
                        result[k] = dp[k]
                    else:
                        # don't report any that don't have data, the timestamps
                        # will be wrong (binstart) so it's kinda pointless
                        break

                if len(result) == len(datacols):
                    thisline.append(result)

            # don't bother adding any lines that have no data
            if len(thisline) > 0:
                results.append({
                    "metadata": metadata,
                    "data": thisline,
                    "datafields": datacols
                })
        return results

    def getMatrixTabs(self):
        return [
            { 'id': 'http-tab', 'descr': 'Web page fetching',
               'title': "HTTP" }
        ]

    def get_matrix_viewstyle(self):
        return "amp-http"

    def getMatrixCellDuration(self):
        return 60 * 60

    def getMatrixCellDurationOptionName(self):
        return 'ampweb.matrixperiod.http'

    def generateSparklineData(self, dp, test, metric):
        if metric == "duration":
            col = "duration_avg"
        elif metric == "pagesize":
            col = "bytes_max"
        else:
            return None

        if col not in dp or dp[col] is None:
            return None
        if dp[col] < 0:
            return None
        return int(round(dp[col]))

    def formatTooltipText(self, result, test, metric):
        if result is None:
            return "Unknown"

        if metric == "duration":
            col = "duration_avg"
        elif metric == "pagesize":
            col = "bytes_max"
        else:
            return None

        formatted = {}
        for label, dp in result.iteritems():
            if len(dp) > 0 and col in dp[0] and \
                        dp[0][col] is not None:
                value = float(dp[0][col])
                if metric == "duration":
                    formatted['pft'] = '%.2f secs' % (value / 1000.0)
                elif metric == "pagesize":
                    formatted['pft'] = '%.1f KB' % (value / 1024.0)
                else:
                    formatted['pft'] = "Unknown"
                break

        return '%s' % (formatted['pft'])

    def generateMatrixCell(self, src, dst, urlparts, cellviews, recent,
            daydata=None):

        if (src, dst) in cellviews:
            view_id = cellviews[(src, dst)]
        else:
            view_id = -1

        # For now, all HTTP results come back as 'ipv4' as we don't make
        # any distinction between ipv4 and ipv6
        key = "%s_%s_ipv4" % (src, dst)
        if key not in recent:
            return {'view':-1}

        if daydata and key in daydata and len(daydata[key]) > 0:
            day = daydata[key][0]
        else:
            day = None

        result = {'view':view_id, 'ipv4': -1, 'ipv6': -1}
        if len(recent[key]) > 0:
            result['ipv4'] = self._format_matrix_data(recent[key][0], day)

            # XXX this should become redundant as I continue to rework all this
            # code
            result['ipv6'] = [1, result['ipv4'][1]]
        return result

    def get_collection_name(self):
        return "amp-http"

    def get_default_title(self):
        return "AMP HTTP Graphs"

    def get_event_label(self, event):
        # TODO Write this when we add event detection for amp-http

        return "Please write code for this!"

    def get_event_sources(self, streamprops):
        return []

    def get_event_targets(self, streamprops):
        return []

    def get_browser_collections(self):
        return [
        {   "family" : "AMP",
            "label": "HTTP",
            "description": "Measure time taken to fetch all elements on a web page.",
            "link": "view/amp-http"
        },
        {   "family" : "AMP",
            "label": "HTTP Page Size",
            "description": "Measure web page size.",
            "link": "view/amp-httppagesize"
        },]


class AmpHttpPageSizeGraph(AmpHttpGraph):
    def __init__(self):
        self.minbin_option = "ampweb.minbin.http"

    def _convert_raw(self, dp):
        result = [dp['timestamp'] * 1000]

        for k in ["bytes"]:
            if k in dp and dp[k] is not None:
                if k == "bytes":
                    result.append(int(dp[k]) / 1024.0)
            else:
                result.append(None)

        return result

    def getMatrixTabs(self):
        return [
        ]

    def format_data(self, data):
        results = {}
        for streamid, streamdata in data.iteritems():
            results[streamid] = []
            for dp in streamdata:
                result = self._convert_raw(dp)
                results[streamid].append(result)
        return results

    def format_raw_data(self, descr, data, start, end):
        results = []
        header = ["collection", "source", "destination", "max_connections",
            "max_connections_per_server",
            "max_persistent_connections_per_server",
            "pipelining_max_requests", "persist", "pipelining", "caching"
        ]

        datacols = ["timestamp", "bytes"]

        for streamid, streamdata in data.iteritems():
            gid = int(streamid.split("_")[1])
            # build the metadata for each stream
            metadata = []
            for item in header:
                metadata.append((item, descr[gid][item]))

            thisline = []
            for dp in streamdata:
                if "timestamp" not in dp:
                    continue
                if dp["timestamp"] < start or dp["timestamp"] > end:
                    continue

                result = {}
                for k in datacols:
                    if k in dp:
                        result[k] = dp[k]
                    else:
                        # don't report any that don't have data, the timestamps
                        # will be wrong (binstart) so it's kinda pointless
                        break

                if len(result) == len(datacols):
                    thisline.append(result)

            # don't bother adding any lines that have no data
            if len(thisline) > 0:
                results.append({
                    "metadata": metadata,
                    "data": thisline,
                    "datafields": datacols
                })
        return results

    def get_default_title(self):
        return "AMP HTTP Page Size Graphs"


# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
