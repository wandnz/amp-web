from ampweb.views.collections.collection import CollectionGraph

class AmpTracerouteHopsGraph(CollectionGraph):
    def __init__(self):
        self.minbin_option = "ampweb.minbin.traceroute"

    def _convert_raw(self, dp):
        result = [dp["timestamp"] * 1000]
        if "length" in dp:
            result += self._format_percentile(dp, "length")
        elif "path_length" in dp:
            result += self._format_percentile(dp, "path_length")

        return result

    def _convert_matrix(self, dp):
        result = [dp["timestamp"] * 1000]

        if 'path_length' in dp and dp['path_length'] is not None:
            if (dp['path_length'] * 2) % 2 == 1:
                result.append("Unreachable")
            else:
                result.append(int(dp['path_length']))
        else:
            result.append(-1)

        return result

    def format_data(self, data):
        """ Format the data appropriately for display in the web graphs """
        results = {}
        for line, datapoints in data.iteritems():
            groupresults = []
            for datapoint in datapoints:
                result = self._convert_raw(datapoint)
                if len(result) > 0:
                    groupresults.append(result)

            results[line] = groupresults
        return results

    def format_raw_data(self, descr, data, start, end):
        """ Format the data appropriately for raw download """
        results = []

        for line, datapoints in data.iteritems():
            gid = int(line.split("_")[1])
            # build the metadata block for each stream
            metadata = [("collection", descr[gid]["collection"]),
                        ("source", descr[gid]["source"]),
                        ("destination", descr[gid]["destination"]),
                        # prefer the family in the line info rather than the
                        # one listed in the "aggregation" field, as that could
                        # have a special value. The line id will always be the
                        # actual value.
                        ("family", line.split("_")[2].lower()),
                        ("packet_size", descr[gid]["packet_size"]),
                        ]

            thisline = []
            for datapoint in datapoints:
                if "timestamp" not in datapoint:
                    continue
                # the block caching will modify the range of data to match the
                # block boundaries, ignore data outside our query range
                if datapoint["timestamp"] < start or datapoint["timestamp"] > end:
                    continue

                # If responses is missing then it would appear this measurement
                # was fabricated to make the line graph properly break at this
                # point. Shouldn't be possible for a real measurement to be
                # missing the field.
                if "path_length" not in datapoint:
                    continue

                if datapoint['path_length'] is not None:
                    plen = int(datapoint[0]['path_length'])
                    if (datapoint[0]['path_length'] * 2) % 2 == 1:
                        completed = False
                    else:
                        completed = True

                result = {
                    "timestamp": datapoint["timestamp"],
                    "path_length": plen,
                    "completed": completed
                }
                thisline.append(result)

            # don't bother adding any lines that have no data
            if len(thisline) > 0:
                results.append({
                    "metadata": metadata,
                    "data": thisline,
                    "datafields":["timestamp", "path_length", "completed"]
                })
        return results

    def _format_percentile(self, datapoint, column):
        """ Format path length percentile values for smokeping style graphs """
        result = []

        median = None
        if column in datapoint and datapoint[column] is not None:
            count = len(datapoint[column])
            if count > 0 and count % 2:
                median = float(datapoint[column][count/2])
            elif count > 0:
                median = (float(datapoint[column][count/2]) +
                        float(datapoint[column][count/2 - 1]))/2.0
            # Remove any fractional components used to indicate incomplete paths
            median = int(median)
        result.append(median)
        # this is normally the loss value, could we use error codes here?
        result.append(0)

        if column in datapoint and datapoint[column] is not None:
            for value in datapoint[column]:
                if value is None:
                    result.append(None)
                else:
                    result.append(int(value))
        return result

    def getMatrixTabs(self):
        return [
            { 'id': 'hops-tab', 'descr': "Path Length", 'title': "Path Length"}
        ]

    def getMatrixCellDuration(self):
        return 60 * 10

    def getMatrixCellDurationOptionName(self):
        return 'ampweb.matrixperiod.hops'

    def formatTooltipText(self, result, test, metric):
        if result is None:
            return "Unknown / Unknown"

        formatted = { "ipv4": "No data", "ipv6": "No data" }

        for label, dp in result.iteritems():
            if label.lower().endswith("_ipv4"):
                key = 'ipv4'
            if label.lower().endswith("_ipv6"):
                key = 'ipv6'

            if len(dp) == 0:
                continue

            if 'path_length' in dp[0] and dp[0]['path_length'] is not None:

                if (dp[0]['path_length'] * 2) % 2 == 1:
                    formatted[key] = "%d hops*" % \
                            (int(dp[0]['path_length'] - 0.5))
                else:
                    formatted[key] = "%d hops" % (int(dp[0]['path_length']))

        return '%s / %s' % (formatted['ipv4'], formatted['ipv6'])

    def generateSparklineData(self, dp, test, metric):
        if 'path_length' not in dp or dp['path_length'] is None:
            return None

        return int(dp['path_length'])

    def generateMatrixCell(self, src, dst, urlparts, cellviews, recent,
            daydata=None):

        if (src, dst) in cellviews:
            view_id = cellviews[(src, dst)]
        else:
            view_id = -1

        keyv4 = "%s_%s_ipv4" % (src, dst)
        keyv6 = "%s_%s_ipv6" % (src, dst)
        if keyv4 not in recent and keyv6 not in recent:
            return {'view':-1}

        result = {'view':view_id, 'ipv4': -1, 'ipv6': -1}
        if keyv4 in recent and len(recent[keyv4]) > 0:
            result['ipv4'] = [1, self._convert_matrix(recent[keyv4][0])[1]]

            if daydata and keyv4 in daydata and len(daydata[keyv4]) > 0:
                result['ipv4'].append(self._convert_matrix(daydata[keyv4][0])[1])
            else:
                result['ipv4'].append(-1)


        if keyv6 in recent and len(recent[keyv6]) > 0:
            result['ipv6'] = [1, self._convert_matrix(recent[keyv6][0])[1]]
            if daydata and keyv6 in daydata and len(daydata[keyv6]) > 0:
                result['ipv6'].append(self._convert_matrix(daydata[keyv6][0])[1])
            else:
                result['ipv6'].append(-1)
        return result

    def get_collection_name(self):
        return "amp-traceroute_pathlen"

    def get_default_title(self):
        return "AMP Traceroute Hops Graphs"

    def get_matrix_viewstyle(self):
        return "amp-traceroute_pathlen"

    def get_event_label(self, streamprops):
        """ Return a formatted event label for traceroute events """
        label = "  AMP AS Traceroute from %s to " % (streamprops["source"])
        label += "%s (%s)" % (streamprops["destination"], streamprops["family"])

        return label

    def get_event_sources(self, streamprops):
        return [streamprops['source']]

    def get_event_targets(self, streamprops):
        return [streamprops['destination']]

    def _parse_ippath(self, pathstring):
        # Unfortunately postgres tends to give us our path array as a
        # hideous string that needs to be parsed

        if pathstring[0] != '{' or pathstring[-1] != '}':
            # Not valid
            return None

        pathstring = pathstring[1:-1]
        return pathstring.split(',')

    def get_browser_collections(self):
        # Return empty list to avoid duplicates from amp-traceroute
        return []


class AmpTracerouteGraph(AmpTracerouteHopsGraph):
    def _format_ippath_summary_data(self, data):

        results = {}
        for line, datapoints in data.iteritems():
            groupresults = []

            for dp in datapoints:
                if 'path_id' in dp:
                    groupresults.append([dp['timestamp'] * 1000, dp['path_id']])
                else:
                    groupresults.append([dp['timestamp'] * 1000, None])

            results[line] = groupresults

        return results

    def format_data(self, data):
        results = {}
        for line, datapoints in data.iteritems():
            groupresults = []
            paths = {}

            # Dirty little check for 'ippath-summary' data
            if len(datapoints) > 0 and 'path_id' in datapoints[0] and \
                    'path' not in datapoints[0]:
                return self._format_ippath_summary_data(data)

            for datapoint in datapoints:
                if 'aspath' not in datapoint:
                    continue
                if 'path' not in datapoint or datapoint['path'] is None:
                    continue
                if 'path_id' not in datapoint or datapoint['path_id'] is None:
                    continue

                ippath = self._parse_ippath(datapoint['path'])
                if ippath is None:
                    continue
                pathid = datapoint['path_id']

                if 'path_count' in datapoint:
                    freq = datapoint['path_count']
                else:
                    freq = 0

                if 'error_type' in datapoint:
                    errtype = datapoint['error_type']
                else:
                    errtype = None

                if 'error_code' in datapoint:
                    errcode = datapoint['error_code']
                else:
                    errcode = None

                if pathid not in paths:
                    paths[pathid] = {
                            'path':ippath,
                            'freq':freq,
                            'errtype':errtype,
                            'errcode':errcode,
                            'aspath':datapoint['aspath'],
                            'mints':datapoint['min_timestamp'],
                            'maxts':datapoint['timestamp']
                    }
                else:
                    paths[pathid]['freq'] += freq

                    if errtype > paths[pathid]['errtype']:
                        paths[pathid]['errtype'] = errtype
                    if errcode > paths[pathid]['errcode']:
                        paths[pathid]['errcode'] = errcode
                    if paths[pathid]['aspath'] is None:
                        paths[pathid]['aspath'] = datapoint['aspath']

                    if datapoint['min_timestamp'] < paths[pathid]['mints']:
                        paths[pathid]['mints'] = datapoint['min_timestamp']
                    if datapoint['timestamp'] > paths[pathid]['maxts']:
                        paths[pathid]['maxts'] = datapoint['timestamp']

            for p in paths.values():
                ippath = p['path']
                if p['aspath'] is None:
                    fullpath = zip([0] * len(ippath), ippath)
                else:
                    aspath = []
                    astext = []
                    for x in p['aspath']:
                        aspath.append(x[2])
                        astext.append(x[0])

                    aspath = [ x[2] for x in p['aspath']]
                    astext = [ x[0] for x in p['aspath']]
                    fullpath = zip(aspath, ippath, astext)

                groupresults.append([p['mints'] * 1000, p['maxts'] * 1000, \
                        fullpath, p['errtype'], p['errcode'], p['freq']])

            results[line] = groupresults
        return results

    def get_collection_name(self):
        return "amp-traceroute"

    def get_default_title(self):
        return "AMP Traceroute Graphs"

    def get_browser_collections(self):
        # Put all of our supported graphs in the base collection
        return [
        {
          "family": "AMP",
          "label": "Traceroute Map",
          "description": "Visualise all traceroute paths from an AMP monitor to a target name.",
          "link": "view/amp-traceroute"
        },

        { "family":"AMP",
          "label": "AS Traceroute Path",
          "description": "Measure the autonomous systems in the path from an AMP monitor to a target name.",
          "link":"view/amp-astraceroute"
        },

        { "family":"AMP",
          "label": "Traceroute Hop Count",
          "description":"Measure the path length from an AMP monitor to a target name.",
          "link":"view/amp-traceroute-hops"
        },
        ]


class AmpAsTracerouteGraph(AmpTracerouteHopsGraph):
    def format_data(self, data):
        """ Format the data appropriately for display in the web graphs """
        results = {}
        for line, datapoints in data.iteritems():
            groupresults = []
            for datapoint in datapoints:
                if "timestamp" not in datapoint:
                    continue
                result = [datapoint["timestamp"] * 1000]
                # we are able to have two different sorts of traceroute data
                # and they need to be formatted slightly differently depending
                # on how they are going to be graphed
                if "aspath" in datapoint or "path" in datapoint:
                    result += self._format_path(datapoint)
                elif "responses" in datapoint:
                    result += self._format_percentile(datapoint, "responses")

                if len(result) > 0:
                    groupresults.append(result)

            results[line] = groupresults
        return results

    def format_raw_data(self, descr, data, start, end):
        """ Format the data appropriately for raw download """
        results = []

        for line, datapoints in data.iteritems():
            gid = int(line.split("_")[1])
            # build the metadata block for each stream
            metadata = [("collection", descr[gid]["collection"]),
                        ("source", descr[gid]["source"]),
                        ("destination", descr[gid]["destination"]),
                        # prefer the family in the line info rather than the
                        # one listed in the "aggregation" field, as that could
                        # have a special value. The line id will always be the
                        # actual value.
                        ("family", line.split("_")[2].lower()),
                        ("packet_size", descr[gid]["packet_size"]),
                        ]

            thisline = []
            for datapoint in datapoints:
                if "timestamp" not in datapoint:
                    continue
                # the block caching will modify the range of data to match the
                # block boundaries, ignore data outside our query range
                if datapoint["timestamp"] < start or datapoint["timestamp"] > end:
                    continue

                if "aspath" not in datapoint:
                    continue

                pathlen = 0
                aspath = []

                for asn in datapoint['aspath']:
                    # This is all very similar to the work done in ampy, but
                    # we don't want to do the lookups for AS names etc. We
                    # also want to be able to use different labels here.
                    asnsplit = asn.split('.')
                    if len(asnsplit) != 2:
                        continue

                    if asnsplit[1] == "-2":
                        aslabel = "rfc1918"
                    elif asnsplit[1] == "-1":
                        aslabel = ""
                    elif asnsplit[1] == "0":
                        aslabel = "unknown"
                    else:
                        aslabel = asnsplit[1]

                    repeats = int(asnsplit[0])
                    pathlen += repeats

                    for i in range(0, repeats):
                        aspath.append(aslabel)

                result = {
                    "timestamp": datapoint["timestamp"],
                    "hop_count": pathlen,
                    "aspath": ",".join(aspath),
                }
                thisline.append(result)

            # don't bother adding any lines that have no data
            if len(thisline) > 0:
                results.append({
                    "metadata": metadata,
                    "data": thisline,
                    "datafields":["timestamp", "hop_count", "aspath"]
                })
        return results

    def get_collection_name(self):
        return "amp-astraceroute"

    def get_default_title(self):
        return "AMP AS Traceroute Graphs"

    def get_browser_collections(self):
        # Return empty list to avoid duplicates from amp-traceroute
        return []

    def _format_path(self, datapoint):
        """ Format full path descriptions for rainbow style graphs """
        result = []

        if "aspath" in datapoint:
            result.append(datapoint['aspath'])
        else:
            result.append([])

        if 'aspathlen' in datapoint:
            result.append(datapoint['aspathlen'])
        else:
            result.append(0)

        return result

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
