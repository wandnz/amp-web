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

    def getMatrixCellDuration(self):
        return 60 * 60 * 2

    def getMatrixCellDurationOptionName(self):
        return 'ampweb.matrixperiod.tput'

    def formatTooltipText(self, result, test):
        if result is None:
            return "Unknown / Unknown"

        formatted = {"Download" : "No data", "Upload" : "No data" }
        for label, dp in result.iteritems():
            if len(dp) < 0 or "runtime" not in dp[0] or "bytes" not in dp[0]:
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
        if keyup in recent:
            result['up'] = [1, self._convert_raw(recent[keyup][0])[1]]
        if keydown in recent:
            result['down'] = [1, self._convert_raw(recent[keydown][0])[1]]
        
        return result


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
