import sys, string

from ampweb.views.collections.collection import CollectionGraph

class CeiloCpuGraph(CollectionGraph):
    def format_data(self, data):
        results = {}

        for sid, sdata in data.iteritems():
            results[sid] = []
            for dp in sdata:
                r = [dp['timestamp'] * 1000]
                if 'cpu' in dp and dp['cpu'] is not None:
                    r.append(float(dp['cpu']))
                else:
                    r.append(None)
                results[sid].append(r)
        return results

    def format_raw_data(self, descr, data, start, end):
        results = []
        for line, dps in data.iteritems():
            gid = int(line.split("_")[1])
            metadata = [("collection", descr[gid]["collection"]),
                        ("name", descr[gid]["name"]),
                        ("guid", descr[gid]["guid"])
                       ]

            thisline = []
            for dp in dps:
                if "timestamp" not in dp:
                    continue
                if dp["timestamp"] < start or dp["timestamp"] > end:
                    continue

                if "cpu" not in dp:
                    continue
                value = float(dp["cpu"])

                result = {"timestamp":dp["timestamp"], "cpu":value}
                thisline.append(result)

            if len(thisline) > 0:
                results.append({
                    "metadata": metadata,
                    "data": thisline,
                    "datafields":["timestamp", "cpu"]
                })
        return results

    def get_collection_name(self):
        return "ceilo-cpu"

    def get_default_title(self):
        return "Ceilometer CPU Usage Graphs"

    def get_event_label(self, event):
        return "Unknown CPU event"

    def get_event_tooltip(self, event):
        return "Unknown CPU event"

    def get_event_graphstyle(self):
        return "ceilo-cpu"

    def get_browser_collections(self):
        return [
        { "family": "Ceilometer",
          "label": "CPU Usage",
          "description": "CPU Utilisation by an OpenStack VM",
          "link": "view/ceilo-cpu"
        },
        ]


# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :

