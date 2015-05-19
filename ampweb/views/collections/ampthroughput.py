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

    def format_raw_data(self, descr, data):
        results = {}
        resultstr = "# source,destination,family,direction,duration,writesize,tcpreused,timestamp,rate_mbps\n"

        for line, datapoints in data.iteritems():
            gid = int(line.split("_")[1])
            source = descr[gid]["source"]
            destination = descr[gid]["destination"]
            duration = descr[gid]["duration"]
            writesize = descr[gid]["writesize"]
            tcpreused = descr[gid]["tcpreused"]

            if descr[gid]["family"] == "BOTH":
                family = line.split("_")[3].lower()
            else:
                family = descr[gid]["family"].lower()

            # BOTH means upload and download for throughput data
            if descr[gid]["direction"] == "BOTH":
                direction = line.split("_")[2]
            else:
                direction = descr[gid]["direction"].lower()

            results[line] = []
            for dp in datapoints:
                if "timestamp" not in dp or "bytes" not in dp or "runtime" not in dp:
                    continue
                result = [source, destination, family, direction, duration, writesize, tcpreused, dp["timestamp"]]
                Mbps = None

                if dp['bytes'] is not None and dp['runtime'] is not None:
                    MBs = float(dp['bytes']) * 8.0 / 1000 / 1000
                    Mbps = MBs / (dp['runtime'] / 1000.0)

                result.append(Mbps)
                results[line].append(",".join(str(i) for i in result))

        # don't care about timestamp order between different groups?
        for key,value in results.iteritems():
            if len(value) > 0:
                resultstr += "\n".join(value) + "\n"
        return resultstr

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
