#
# This file is part of amp-web.
#
# Copyright (C) 2013-2017 The University of Waikato, Hamilton, New Zealand.
#
# Authors: Shane Alcock
#          Brendon Jones
#
# All rights reserved.
#
# This code has been developed by the WAND Network Research Group at the
# University of Waikato. For further information please see
# http://www.wand.net.nz/
#
# amp-web is free software; you can redistribute it and/or modify
# it under the terms of the GNU General Public License version 2 as
# published by the Free Software Foundation.
#
# amp-web is distributed in the hope that it will be useful, but
# WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
# General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with amp-web; if not, write to the Free Software Foundation, Inc.
# 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
#
# Please report any bugs, questions or comments to contact@wand.net.nz
#

from ampweb.views.collections.collection import CollectionGraph

class AmpLatencyGraph(CollectionGraph):
    def __init__(self, metric):
        self.metric = metric
        self.minbin_option = "ampweb.minbin.latency"

    def _get_dns_requests_column(self, dp):
        # NNTSC running Influx gives us a different column name for the
        # the request counting than an older entirely-postgres NNTSC so
        # we need to check which one we are using.
        if "timestamp_count" in dp:
            dns_req_col = "timestamp_count"
        elif "requests_count" in dp:
            dns_req_col = "requests_count"
        else:
            dns_req_col = None
        return dns_req_col

    def _is_udpstream_datapoint(self, dp):
        if 'packets_sent' not in dp:
            return False
        if 'packets_recvd' not in dp:
            return False
        if dp['packets_sent'] == 0:
            return False
        if dp['packets_sent'] is None or dp['packets_recvd'] is None:
            return False
        return True

    def format_data(self, data):
        results = {}

        for line, datapoints in data.iteritems():
            results[line] = []
            for datapoint in datapoints:
                if "timestamp" not in datapoint:
                    continue
                result = [datapoint["timestamp"] * 1000]
                median = None
                rttcol = "rtts"

                if "median" in datapoint and datapoint['median'] is not None:
                    median = float(datapoint["median"]) / 1000.0
                    rttcol = "rtts"
                elif "rtt_smoke" in datapoint and datapoint['rtt_smoke'] is not None:
                    count = len(datapoint["rtt_smoke"])
                    if count > 0 and count % 2:
                        median = float(datapoint["rtt_smoke"][count/2]) / 1000.0
                    elif count > 0:
                        median = (float(datapoint["rtt_smoke"][count/2]) +
                                float(datapoint["rtt_smoke"][count/2 - 1]))/2.0/1000.0
                    rttcol = "rtt_smoke"
                elif self._is_udpstream_datapoint(datapoint):
                    # yeah yeah, I know median != mean
                    if datapoint["mean_rtt"] is not None:
                        median = float(datapoint["mean_rtt"]) / 1000.0

                result.append(median)

                dns_req_col = self._get_dns_requests_column(datapoint)
                if "loss" in datapoint and "results" in datapoint:
                    losspct = (float(datapoint["loss"]) /
                            float(datapoint["results"]) * 100.0)
                    result.append(losspct)
                elif self._is_udpstream_datapoint(datapoint):
                    result.append(float(datapoint['packets_sent'] - \
                            datapoint['packets_recvd']) / \
                            float(datapoint['packets_sent']) * 100.0)
                elif dns_req_col is not None and 'rtt_count' in datapoint:
                    if datapoint['rtt_count'] > datapoint[dns_req_col]:
                        result.append(None)
                    elif datapoint[dns_req_col] == 0:
                        result.append(100.0)
                    elif datapoint[dns_req_col] is None or datapoint['rtt_count'] is None:
                        result.append(None)
                    else:
                        lost = float(datapoint[dns_req_col] - datapoint['rtt_count'])
                        result.append((lost / datapoint[dns_req_col]) * 100.0)
                elif 'lossrate' in datapoint and datapoint['lossrate'] is not None:
                    result.append(datapoint['lossrate'] * 100.0)
                else:
                    result.append(None)

                if rttcol in datapoint and datapoint[rttcol] is not None:
                    for value in datapoint[rttcol]:
                        if value is not None:
                            result.append(float(value) / 1000.0)
                        else:
                            result.append(None)

                results[line].append(result)
        return results

    def format_raw_data(self, descr, data, start, end):
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
                        ("family", line.split("_")[2].lower())
                        ]

            # these stream properties may not be part of every latency
            # collection, so only add those that are present
            for item in ["dscp", "packet_size", "packet_spacing", "packet_count",
                    "query", "query_class", "query_type",
                    "udp_payload_size", "flags"]:
                if item in descr[gid]:
                    metadata.append((item, descr[gid][item]))

            thisline = []
            for datapoint in datapoints:
                if "timestamp" not in datapoint:
                    continue
                # the block caching will modify the range of data to match the
                # block boundaries, ignore data outside our query range
                if datapoint["timestamp"] < start or datapoint["timestamp"] > end:
                    continue

                median = None
                if "loss" in datapoint:
                    loss = datapoint["loss"]
                elif self._is_udpstream_datapoint(datapoint):
                    loss = datapoint['packets_sent'] - datapoint['packets_recvd']
                elif 'rtt' in datapoint:
                    if datapoint['rtt'] is None:
                        loss = 1
                    else:
                        loss = 0
                elif 'lossrate' in datapoint:
                    loss = datapoint['lossrate'] * 100.0
                else:
                    loss = None

                if "results" in datapoint:
                    count = datapoint["results"]
                elif self._is_udpstream_datapoint(datapoint):
                    count = datapoint['packets_sent']
                elif 'rtt' in datapoint and datapoint['rtt'] is not None:
                    count = 1
                else:
                    count = None



                if "median" in datapoint and datapoint['median'] is not None:
                    median = float(datapoint["median"]) / 1000.0
                elif "rtt" in datapoint and datapoint['rtt'] is not None:
                    median = float(datapoint['rtt']) / 1000.0
                    # XXX are we ever going to get a list of rtts here or is
                    # it always going to be a single value because we don't
                    # use the aggregation functions?
                    #count = len(datapoint["rtt"])
                    #if count > 0 and count % 2:
                    #    median = float(datapoint["rtt"][count/2]) / 1000.0
                    #elif count > 0:
                    #    median = (float(datapoint["rtt"][count/2]) +
                    #            float(datapoint["rtt"][count/2 - 1]))/2.0/1000.0
                elif self._is_udpstream_datapoint(datapoint):
                    median = float(datapoint['mean_rtt']) / 1000.0
                result = {"timestamp": datapoint["timestamp"], "rtt_ms": median,
                        "loss": loss, "results": count}
                thisline.append(result)

            # don't bother adding any lines that have no data
            if len(thisline) > 0:
                results.append({
                    "metadata": metadata,
                    "data": thisline,
                    "datafields":["timestamp", "rtt_ms", "loss", "results"]
                })

        return results

    def getMatrixTabs(self):
        return [{
                'id': 'latency-tab',
                'descr': 'Latency',
                'title': 'Latency'
            }]

    def get_collection_name(self):
        if self.metric == "icmp":
            return "amp-icmp"
        if self.metric == "dns":
            return "amp-dns"
        if self.metric == "tcp":
            return "amp-tcpping"
        if self.metric == "udpstream":
            return "amp-udpstream"
        if self.metric == "fastping":
            return "amp-fastping"
        return "amp-latency"

    def get_selection_options(self, ampy, selected, term, page):
        # If we're getting 'source's or 'destination's, we need to
        # combine all valid choices across our latency metrics.

        if len(selected) >= 2:
            return ampy.get_selection_options(self.get_collection_name(),
                    selected, term, page)

        # Need to do our own pagination
        icmpsel = ampy.get_selection_options("amp-icmp", selected, term, "1",
                1000000)
        dnssel = ampy.get_selection_options("amp-dns", selected, term, "1",
                1000000)
        tcpsel = ampy.get_selection_options("amp-tcpping", selected, term, "1",
                1000000)
        udpsel = ampy.get_selection_options("amp-udpstream", selected, term,
                "1", 1000000)
        fastpingsel = ampy.get_selection_options("amp-fastping", selected,
                term, "1", 1000000)

        sources = set()
        dests = set()

        if icmpsel is not None and 'source' in icmpsel:
            for item in icmpsel['source']['items']:
                sources.add(item['text'])

        if dnssel is not None and 'source' in dnssel:
            for item in dnssel['source']['items']:
                sources.add(item['text'])

        if tcpsel is not None and 'source' in tcpsel:
            for item in tcpsel['source']['items']:
                sources.add(item['text'])

        if udpsel is not None and 'source' in udpsel:
            for item in udpsel['source']['items']:
                sources.add(item['text'])

        if fastpingsel is not None and 'source' in fastpingsel:
            for item in fastpingsel['source']['items']:
                sources.add(item['text'])

        selopts = {}
        if len(sources) > 0:
            sources = list(sources)
            sources.sort()
            firstsrc = (int(page) - 1) * 30
            lastsrc = (int(page) * 30)

            newlist = []
            for source in sources[firstsrc:lastsrc]:
                newlist.append({'text': source, 'id': source})
            selopts['source'] = {'items': newlist, 'maxitems': len(sources)}

        if len(sources) > 1:
            return selopts

        # Horribly repetitive code... :(

        if icmpsel is not None and 'destination' in icmpsel:
            for item in icmpsel['destination']['items']:
                dests.add(item['text'])

        if dnssel is not None and 'destination' in dnssel:
            for item in dnssel['destination']['items']:
                dests.add(item['text'])

        if tcpsel is not None and 'destination' in tcpsel:
            for item in tcpsel['destination']['items']:
                dests.add(item['text'])

        if udpsel is not None and 'destination' in udpsel:
            for item in udpsel['destination']['items']:
                dests.add(item['text'])

        if fastpingsel is not None and 'destination' in fastpingsel:
            for item in fastpingsel['destination']['items']:
                dests.add(item['text'])

        if len(dests) > 0:
            dests = list(dests)
            dests.sort()
            firstd = (int(page) - 1) * 30
            lastd = (int(page) * 30)
            newlist = []
            for destination in dests[firstd:lastd]:
                newlist.append({'text': destination, 'id': destination})
            selopts['destination'] = {'items': newlist, 'maxitems': len(dests)}

        if len(dests) == 1 and len(sources) == 1:
            selected = [sources[0], dests[0]]
            # when an amp-latency graph is reloaded it loses the actual metric
            # that was involved and can default back to icmp (which may not be
            # correct). Let it skip ones that aren't tested so it can try other
            # latency metrics and hopefully find at least one valid one.
            options = ampy.get_selection_options(self.get_collection_name(),
                    selected, "", "1")
            if options:
                for k, v in options.iteritems():
                    selopts[k] = v

        return selopts

    def get_default_title(self):
        return "AMP Latency Graphs"

    def get_matrix_viewstyle(self):
        return "amp-latency"

    def getMatrixCellDuration(self):
        return 60 * 10

    def getMatrixCellDurationOptionName(self):
        return 'ampweb.matrixperiod.latency'

    def _generateLatencySparkline(self, dp):
        if 'median' in dp and dp['median'] is not None:
            return int(round(dp['median']))

        if 'rtt_avg' in dp and dp['rtt_avg'] is not None:
            return int(round(dp['rtt_avg']))

        if 'mean_rtt_avg' in dp and dp['mean_rtt_avg'] is not None:
            return int(round(dp['mean_rtt_avg']))

        # TODO this is a mess, who knows what test types use any of these?
        if 'mean_rtt' in dp and dp['mean_rtt'] is not None:
            return int(round(dp['mean_rtt']))

        return None

    def generateSparklineData(self, data, test, metric):
        return self._generateLatencySparkline(data)

    def formatTooltipText(self, result, test, metric):
        if result is None:
            return "Unknown / Unknown"

        formatted = {"ipv4": "No data", "ipv6": "No data"}
        for label, dp in result.iteritems():
            if len(dp) == 0:
                continue

            if label.lower().endswith("_ipv4"):
                key = "ipv4"
            elif label.lower().endswith("_ipv6"):
                key = "ipv6"
            else:
                key = "unknown"

            value = None
            if 'rtt_avg' in dp[0]:
                value = dp[0]['rtt_avg']

            if 'median_avg' in dp[0]:
                value = dp[0]['median_avg']

            if 'mean_rtt' in dp[0]:
                value = dp[0]['mean_rtt']

            # TODO this is a mess, who knows what test types use any of these?
            if 'mean_rtt_avg' in dp[0]:
                value = dp[0]['mean_rtt_avg']

            if value is None:
                continue

            if value >= 0 and value < 1000:
                formatted[key] = "%dus" % round(value)
            elif value >= 1000:
                formatted[key] = "%dms" % round(float(value) / 1000.0)

        return "%s / %s" % (formatted['ipv4'], formatted['ipv6'])

    def _format_matrix_data(self, recent, daydata=None):
        if recent is None:
            return [1, -1, -1, -1]

        if recent.get('median_avg') is not None:
            rttfield = 'median_avg'
            stddev = 'median_stddev'
        elif recent.get('mean_rtt_avg') is not None:
            rttfield = "mean_rtt_avg"
            stddev = "mean_rtt_stddev"
        else:
            rttfield = 'rtt_avg'
            stddev = 'rtt_stddev'

        if recent.get(rttfield) is not None:
            recent_rtt = int(round(recent[rttfield]))
        else:
            recent_rtt = -1

        if daydata is None:
            day_rtt = -1
            day_stddev = -1
        else:
            if daydata.get(stddev) is not None:
                day_stddev = round(daydata[stddev])
            else:
                day_stddev = -1

            if daydata.get(rttfield) is not None:
                day_rtt = int(round(daydata[rttfield]))
            else:
                day_rtt = -1

        return [1, recent_rtt, day_rtt, day_stddev]

    def generateMatrixCell(self, src, dst, urlparts, cellviews, recent,
            daydata=None):

        if (src, dst) in cellviews:
            view_id = cellviews[(src, dst)]
        else:
            view_id = -1

        if 'direction' not in urlparts:
            keyv4 = "%s_%s_ipv4" % (src, dst)
            keyv6 = "%s_%s_ipv6" % (src, dst)
        else:
            keyv4 = "%s_%s_%s_ipv4" % (src, dst, urlparts['direction'])
            keyv6 = "%s_%s_%s_ipv6" % (src, dst, urlparts['direction'])

        if keyv4 not in recent and keyv6 not in recent:
            return {'view':-1}

        result = {'view':view_id, 'ipv4': -1, 'ipv6': -1}

        if keyv4 in recent:
            if len(recent[keyv4]) == 0:
                result['ipv4'] = self._format_matrix_data(None)
            else:
                if daydata and keyv4 in daydata and len(daydata[keyv4]) > 0:
                    day = daydata[keyv4][0]
                else:
                    day = None
                result['ipv4'] = self._format_matrix_data(recent[keyv4][0], day)
        if keyv6 in recent:
            if len(recent[keyv6]) == 0:
                result['ipv6'] = self._format_matrix_data(None)

            else:
                if daydata and keyv6 in daydata and len(daydata[keyv6]) > 0:
                    day = daydata[keyv6][0]
                else:
                    day = None
                result['ipv6'] = self._format_matrix_data(recent[keyv6][0], day)

        return result

    def get_event_label(self, streamprops):
        return "   Unknown Latency Event"

    def get_event_sources(self, streamprops):
        return [streamprops['source']]

    def get_event_targets(self, streamprops):
        return [streamprops['destination']]

    def get_browser_collection(self):
        return [{
            "family":"AMP",
            "label": "Latency",
            "description": "This probably shouldn't be here!",
            "link":"view/amp-latency"
        }]


class AmpIcmpGraph(AmpLatencyGraph):
    def __init__(self):
        super(AmpIcmpGraph, self).__init__("icmp")

    def get_event_graphstyle(self):
        return "amp-icmp"

    def get_event_label(self, streamprops):
        label = "  ICMP latency from %s to %s (%s)" % \
                (streamprops["source"], streamprops["destination"], \
                streamprops["family"])
        return label

    def get_browser_collections(self):
        return [{
            "family":"AMP",
            "label": "ICMP",
              "description": "Measure ICMP latency and loss from an AMP monitor to a target name or address.",
              "link":"view/amp-icmp"
        }]


class AmpDnsGraph(AmpLatencyGraph):
    def __init__(self):
        super(AmpDnsGraph, self).__init__("dns")

    def get_event_graphstyle(self):
        return "amp-dns"

    def getMatrixCellDuration(self):
        return 60 * 30

    def get_event_label(self, streamprops):

        label = "  DNS latency from %s to %s requesting %s" % \
                (streamprops["source"], streamprops["destination"],
                streamprops["query"])

        return label

    def get_browser_collections(self):
        return [{
            "family":"AMP",
            "label": "DNS",
            "description": "Measure query response latency from an AMP monitor to a target DNS server.",
            "link":"view/amp-dns"
        }]


class AmpUdpstreamLatencyGraph(AmpLatencyGraph):
    def __init__(self):
        super(AmpUdpstreamLatencyGraph, self).__init__("udpstream")

    def get_event_graphstyle(self):
        return "amp-udpstream-latency"

    def get_event_label(self, streamprops):

        label = "  UDPStream latency from %s to %s (%s)" % \
                (streamprops["source"], streamprops["destination"],
                 streamprops["family"])

        return label

    def get_browser_collections(self):
        return [{
            "family":"AMP",
            "label": "UDP Stream Latency",
            "description": "Measure average latency for a stream of equally-spaced UDP packets from one AMP monitor to another.",
            "link":"view/amp-udpstream-latency"
        }]


class AmpTcppingGraph(AmpLatencyGraph):
    def __init__(self):
        super(AmpTcppingGraph, self).__init__("tcp")

    def get_event_graphstyle(self):
        return "amp-tcpping"

    def get_event_label(self, streamprops):

        label = "  TCP latency from %s to %s:%s (%s)" % \
                (streamprops["source"], streamprops["destination"],
                streamprops["port"], streamprops["family"])

        return label

    def get_browser_collections(self):
        return [{
            "family":"AMP",
            "label": "TCP Ping",
            "description": "Measure TCP handshake latency from an AMP monitor to a target name or address.",
            "link":"view/amp-tcpping"
        }]


class AmpFastpingGraph(AmpLatencyGraph):
    def __init__(self):
        super(AmpFastpingGraph, self).__init__("fastping")

    def get_event_graphstyle(self):
        return "amp-fastping"

    def get_event_label(self, streamprops):
        label = "  ICMP Stream latency from %s to %s (%s)" % (
                streamprops["source"], streamprops["destination"],
                streamprops["family"])
        return label

    def get_browser_collections(self):
        return [{
            "family":"AMP",
            "label": "ICMP Stream Latency",
              "description": "Measure average latency for a stream of ICMP packets to a target.",
              "link":"view/amp-fastping"
        }]


# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
