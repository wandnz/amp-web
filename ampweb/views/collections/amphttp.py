from ampweb.views.collections.collection import CollectionGraph


class AmpHttpGraph(CollectionGraph):

    def format_data(self, data):
        results = {}
        for streamid, streamdata in data.iteritems():
            results[streamid] = []
            for dp in streamdata:
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

                results[streamid].append(result)
        return results

    def getMatrixTabs(self):
        return [
            { 'id': 'http-tab', 'descr': 'Web page fetch times',
               'title': "HTTP" }
        ]

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
