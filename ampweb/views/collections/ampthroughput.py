from ampweb.views.collections.collection import CollectionGraph

class AmpThroughputGraph(CollectionGraph):
    def format_data(self, data):
        results = {}

        for line, datapoints in data.iteritems():
            results[line] = []
            for dp in datapoints:
                res = [dp["timestamp"] * 1000]
                Mbps = None
                pps = None

                if "bytes" in dp and "runtime" in dp:
                    if dp['bytes'] is not None and dp['runtime'] is not None:
                        MBs = float(dp['bytes']) * 8.0 / 1000 / 1000
                        Mbps = MBs / (dp['runtime'] / 1000.0)

                if 'packets' in dp and 'runtime' in dp:
                    if dp['packets'] is not None and dp['runtime'] is not None:
                        pps = float(dp['packets']) / (dp['runtime'] / 1000.0)

                res.append(Mbps)
                res.append(pps)

                results[line].append(res)

        return results

    def get_collection_name(self):
        return "amp-throughput"

    def get_default_title(self):
        return "AMP Throughput Graphs"

    def get_event_label(self, event):
        # TODO Write this when we add event detection for throughput
        
        target = event["target_name"].split("|")
        label = event["event_time"].strftime("%H:%M:%S")

        label += "  AMP Throughput"
        return label

    def get_browser_collections(self):
        return [
        { "family":"AMP",
          "label": "Throughput",
          "description": "Measure achievable throughput between two AMP monitors",
          "link":"view/amp-throughput"
        },
        ]
                
                  
                

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
