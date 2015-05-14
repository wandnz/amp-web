from ampweb.views.collections.collection import CollectionGraph

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
            return {'both': -1}

        result = {'both': view_id, 'up':-1, 'down':-1}
        if keyup in recent:
            result['up'] = [1, self._convert_raw(recent[keyup][0])[1]]
        if keydown in recent:
            result['down'] = [1, self._convert_raw(recent[keydown][0])[1]]
        
        return result


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
