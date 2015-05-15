from ampweb.views.collections.collection import CollectionGraph


class AmpHttpGraph(CollectionGraph):

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

    def format_data(self, data):
        results = {}
        for streamid, streamdata in data.iteritems():
            results[streamid] = []
            for dp in streamdata:
                result = self._convert_raw(dp)
                results[streamid].append(result)
        return results

    def getMatrixTabs(self):
        return [
            { 'id': 'http-tab', 'descr': 'Web page fetch times',
               'title': "HTTP" }
        ]

    def getMatrixCellDuration(self):
        return 60 * 60

    def getMatrixCellDurationOptionName(self):
        return 'ampweb.matrixperiod.http'

    def generateSparklineData(self, dp, test):
        if 'duration' not in dp or dp['duration'] is None:
            return None
        if dp['duration'] < 0:
            return None
        return int(round(dp['duration']))

    def formatTooltipText(self, result, test):
        if result is None:
            return "Unknown"

        formatted = {"pft": "No data"}
        
        for label, dp in result.iteritems():
            if len(dp) > 0 and 'duration' in dp[0]:
                value = float(dp[0]['duration'])
                formatted['pft'] = '%.2f secs' % (value / 1000.0)
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
            return {'both':-1}

        result = {'both':view_id, 'ipv4': -1, 'ipv6': -1}
        if len(recent[key]) > 0:
            result['ipv4'] = [1, self._convert_raw(recent[key][0])[1]]

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

    def get_browser_collections(self):
        return [
        {   "family" : "AMP",
            "label": "HTTP",
            "description": "Measure time taken to fetch all elements on a web page",
            "link": "view/amp-http"
        },]
        

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
