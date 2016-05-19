from ampweb.views.collections.collection import CollectionGraph
import re

class AmpThroughputGraph(CollectionGraph):
    
    def _convert_raw(self, dp):
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
        return [
            { 'id': 'tput-tab', 'descr': 'Throughput', 'title':'Throughput' }
        ]

    def get_matrix_viewstyle(self):
        return "amp-throughput"

    def getMatrixCellDuration(self):
        return 60 * 60 * 2

    def getMatrixCellDurationOptionName(self):
        return 'ampweb.matrixperiod.tput'

    def formatTooltipText(self, result, test):
        if result is None:
            return "Unknown / Unknown"

        formatted = {"Download" : "No data", "Upload" : "No data" }
        for label, dp in result.iteritems():
            if len(dp) == 0 or "runtime" not in dp[0] or "bytes" not in dp[0]:
                continue

            if dp[0]["runtime"] is None or dp[0]["bytes"] is None:
                continue
            if dp[0]["runtime"] == 0:
                continue

            if re.search('_in_IPv[46]$', label) != None:
                key = "Download"
            elif re.search('_out_IPv[46]$', label) != None:
                key = "Upload"
            else:
                continue

            bps = (float(dp[0]["bytes"]) / dp[0]["runtime"]) * 8.0 / 1000.0
            formatted[key] = "%.1f Mbps" % (bps)

        return "%s / %s" % (formatted["Download"], formatted["Upload"]) 


    def generateSparklineData(self, dp, test):
        if 'runtime' not in dp or 'bytes' not in dp:
            return None
        if dp['runtime'] is None or dp['bytes'] is None:
            return None
        if dp['runtime'] == 0:
            return None
        
        nextval =  (float(dp['bytes']) / dp['runtime']) * 8.0
        return int(nextval / 1000.0)




    def generateMatrixCell(self, src, dst, urlparts, cellviews, recent, 
            daydata = None):
       
        # Default to ipv4 unless specified otherwise in the request
        if 'family' in urlparts:
            family = urlparts['family']
        else:
            family = 'ipv4'
        
        if (src, dst, family) in cellviews:
            view_id = cellviews[(src, dst, family)]
        else:
            view_id = -1

        index = "%s_%s" % (src, dst)
        keyup = index + "_out_" + family
        keydown = index + "_in_" + family

        if keyup not in recent and keydown not in recent:
            return {'view': -1}

        result = {'view': view_id, 'up':-1, 'down':-1}
       
        if keyup in recent and recent[keyup] is not None:
            if len(recent[keyup]) > 0:
                result['up'] = [1, self._convert_raw(recent[keyup][0])[1]]
            else:
                result['up'] = [1, -1]
        if keydown in recent and recent[keydown] is not None:
            if len(recent[keydown]) > 0:
                result['down'] = [1, self._convert_raw(recent[keydown][0])[1]]
            else:
                result['down'] = [1, -1]

        return result


    def format_raw_data(self, descr, data, start, end):
        results = []

        for line, datapoints in data.iteritems():
            gid = int(line.split("_")[1])
            # build the metadata block for each stream
            metadata = [("collection", descr[gid]["collection"]),
                        ("source", descr[gid]["source"]),
                        ("destination", descr[gid]["destination"]),
                        ("family", line.split("_")[3].lower()),
                        ("direction", line.split("_")[2].lower()),
                        ("duration", descr[gid]["duration"]),
                        ("writesize", descr[gid]["writesize"]),
                        ("tcpreused", descr[gid]["tcpreused"])
                        ]

            thisline = []
            # add all the valid datapoints to the result data
            for dp in datapoints:
                if "timestamp" not in dp or "bytes" not in dp or "runtime" not in dp:
                    continue
                if dp["timestamp"] < start or dp["timestamp"] > end:
                    continue

                Mbps = None
                if dp['bytes'] is not None and dp['runtime'] is not None:
                    MBs = float(dp['bytes']) * 8.0 / 1000 / 1000
                    Mbps = MBs / (dp['runtime'] / 1000.0)

                result = {"timestamp": dp["timestamp"], "rate_mbps": Mbps}
                thisline.append(result)

            # don't bother adding any lines that have no data
            if len(thisline) > 0:
                results.append({
                    "metadata": metadata,
                    "data": thisline,
                    "datafields":["timestamp", "rate_mbps"]
                })
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

    def get_event_sources(self, streamprops):
        return [streamprops['source']]

    def get_event_targets(self, streamprops):
        return [streamprops['destination']]

    def get_browser_collections(self):
        return [
        { "family":"AMP",
          "label": "Throughput",
          "description": "Measure achievable throughput between two AMP monitors.",
          "link":"view/amp-throughput"
        },
        ]
                
                  
                

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
