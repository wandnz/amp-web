import time

def _get_family(label):
    if label.lower().endswith("_ipv4"):
        return "ipv4"
    if label.lower().endswith("_ipv6"):
        return "ipv6"
    return "unknown"

def _get_direction(label):
    if label.lower().endswith("_in_ipv4"):
        return "Upload"
    if label.lower().endswith("_in_ipv6"):
        return "Upload"
    if label.lower().endswith("_out_ipv4"):
        return "Download"
    if label.lower().endswith("_out_ipv6"):
        return "Download"

    return "Unknown"

# TODO make it more obvious if a measurement is for ipv4 or ipv6?
def get_formatted_latency(ampy, collection, view_id, duration):
    """ Fetch the average latency and format it for printing with units """
    resulttuple = ampy.get_recent_data(collection, view_id, duration, "basic")
    if resulttuple is None:
        print "Error while fetching formatted latency for view %s" % (view_id)
        return "Unknown / Unknown"

    result, timeouts = resulttuple

    formatted = { "ipv4": "No data", "ipv6": "No data" }
    for label, datapoint in result.iteritems():
        if len(datapoint) == 0:
            continue

        if 'median' in datapoint[0]:
            rttcol = "median"
        else:
            rttcol = "rtt"
        
        if rttcol in datapoint[0]:
            value = datapoint[0][rttcol]
            if value >= 0:
                family = _get_family(label)
                if value < 1000:
                    formatted[family] = "%dus" % round(value)
                formatted[family] = "%dms" % round(float(value)/1000.0)
    return "%s / %s" % (formatted["ipv4"], formatted["ipv6"])

def get_formatted_loss(ampy, collection, view_id, duration):
    """ Fetch the average loss and format it for printing with units """
    resulttuple = ampy.get_recent_data(collection, view_id, duration, "basic")
    if resulttuple is None:
        print "Error while fetching formatted loss for view %s" % (view_id)
        return "Unknown / Unknown"

    result, timeouts = resulttuple
    
    formatted = { "ipv4": "No data", "ipv6": "No data" }
    for label, datapoint in result.iteritems():
        if len(datapoint) == 0:
            continue
        if "loss" in datapoint[0] and "results" in datapoint[0]:
            value = float(datapoint[0]["loss"]) / datapoint[0]["results"]
            family = _get_family(label)
            formatted[family] = "%d%%" % round(value * 100)
    return "%s / %s" % (formatted["ipv4"], formatted["ipv6"])

def get_formatted_hopcount(ampy, collection, view_id, duration):
    """ Fetch the average hopcount and format it for printing with units """
    resulttuple = ampy.get_recent_data(collection, view_id, duration, "matrix")
    if resulttuple is None:
        print "Error while fetching formatted hops for view %s" % (view_id)
        return "Unknown / Unknown"

    result, timeouts = resulttuple
    
    formatted = { "ipv4": "No data", "ipv6": "No data" }
    for label, datapoint in result.iteritems():
        if len(datapoint) > 0 and "responses" in datapoint[0]:
            value = datapoint[0]["responses"]
            family = _get_family(label)
            formatted[family] = "%d hops" % round(value)
    return "%s / %s" % (formatted["ipv4"], formatted["ipv6"])

def get_formatted_http(ampy, collection, view_id, duration):

    resulttuple = ampy.get_recent_data(collection, view_id, duration, "matrix")
    
    if resulttuple is None:
        print "Error while fetching formatted hops for view %s" % (view_id)
        return "Unknown"

    result, timeouts = resulttuple
    
    formatted = { "Page Fetch Time": "No data" }
    for label, datapoint in result.iteritems():
        if len(datapoint) > 0 and "duration" in datapoint[0]:
            value = float(datapoint[0]["duration"])
            formatted["Page Fetch Time"] = "%.2f secs" % (value / 1000.0)
    return "%s" % (formatted["Page Fetch Time"])

def get_formatted_bps(ampy, collection, view_id, duration):
    
    resulttuple = ampy.get_recent_data(collection, view_id, duration, "matrix")

    if resulttuple is None:
        print "Error while fetching formatted hops for view %s" % (view_id)
        return "Unknown / Unknown"

    result, timeouts = resulttuple
    formatted = { "Download" : "No data", "Upload": "No data" }
    for label, dp in result.iteritems():
        if len(dp) > 0 and "runtime" in dp[0] and "bytes" in dp[0]:
            if dp[0]["runtime"] is None or dp[0]["bytes"] is None:
                continue
            if dp[0]["runtime"] == 0:
                continue

            bps = (float(dp[0]["bytes"]) / dp[0]["runtime"]) * 8.0 / 1000.0
            direction = _get_direction(label)
            formatted[direction] = "%.1f Mbps" % (bps)
    
    return "%s / %s" % (formatted["Download"], formatted["Upload"])


def site_info_tooltip(ampy, site):
    """ Generate the HTML for a tooltip describing a single site """
    info = ampy.get_amp_site_info(site)
    if info is None:
        print "Error while fetching AMP site info"
        return {}

    if len(info) > 0:
        return {
            "site": True,
            "longname": info["longname"],
            "location": info["location"],
            "description": info["description"],
            "ampname": info["ampname"],
        }
    return {}

def get_full_name(ampy, site):
    """ Get the full name of a site """
    info = ampy.get_amp_site_info(site)
    if info is None:
        print "Error while fetching AMP site info"
        return "Unknown"
    
    if len(info) > 0:
        return info["longname"]
    return site


def get_tooltip_data(ampy, collection, stream_ids, data_func):
    """ Get the tooltip data for different time periods over the last week """
    
    if collection == "amp-http" or collection == "amp-throughput":
        return [
            {
                "label": "2 hour average",
                "value": data_func(ampy, collection, stream_ids, 60*60*2),
                "classes": ""
            },
            {
                "label": "6 hour average",
                "value": data_func(ampy, collection, stream_ids, 60*60*6),
                "classes": ""
            },
            {
                "label": "24 hour average",
                "value": data_func(ampy, collection, stream_ids, 60*60*24),
                "classes": "bottom"
            },
        ]
    
    return [
        {
            "label": "10 minute average",
            "value": data_func(ampy, collection, stream_ids, 60*10),
            "classes": ""
        },
        {
            "label": "1 hour average",
            "value": data_func(ampy, collection, stream_ids, 60*60),
            "classes": ""
        },
        {
            "label": "24 hour average",
            "value": data_func(ampy, collection, stream_ids, 60*60*24),
            "classes": "bottom"
        },
    ]

def get_sparkline_data(ampy, collection, view_id, metric):
    """ Get highly aggregated data from the last 24 hours for sparklines """
    duration = 60 * 60 * 24
    sparklines = {}
    maximum = -1

    now = int(time.time())
    start = now - duration

    if metric not in ['latency', 'loss', 'hops', 'duration', 'bps']:
        return {}
        
    data = ampy.get_historic_data(collection, view_id, start, now, "matrix")

    if data is None:
        print "Error fetching historic data for plotting %s sparklines" % (metric)
        return None

    if metric == "latency":
        for label, datapoints in data.iteritems():
            if len(datapoints) == 0:
                continue
            sparkline = []
            for datapoint in datapoints:
                if "median_avg" in datapoint:
                    field = "median_avg"
                else:
                    field = "rtt_avg"
                if field in datapoint and datapoint[field] >= 0:
                    # should be able to use binstart here without tracking
                    # the timestamp because the user never actually sees the
                    # times displayed
                    sparkline.append([datapoint["binstart"],
                            int(round(datapoint[field]))])
                else:
                    sparkline.append([datapoint["binstart"], None])
            sparklines[label] = sparkline
            sparkline_ints = [x[1] for x in sparkline if isinstance(x[1], int)]
            if len(sparkline_ints) > 0:
                linemax = max(sparkline_ints)
                if linemax > maximum:
                    maximum = linemax

    elif metric == "loss":
        for label, datapoints in data.iteritems():
            if len(datapoints) == 0:
                continue
            sparkline = []
            for dp in datapoints:
                if "loss_sum" in dp and "results_sum" in dp:
                    if dp['results_sum'] == 0:
                        sparkline.append([dp["timestamp"], None])
                    else:
                        lp = dp['loss_sum'] / float(dp['results_sum'])
                        sparkline.append([dp["timestamp"], \
                                int(round(lp * 100))])
                else:
                    sparkline.append([dp["timestamp"], None])
            sparklines[label] = sparkline
            if len(sparkline) > 0:
                linemax = max(x[1] for x in sparkline)
                if linemax > maximum:
                    maximum = linemax

    elif metric == "duration":
        for label, datapoints in data.iteritems():
            if len(datapoints) == 0:
                continue
            sparkline = []
            for datapoint in datapoints:
                if "duration" in datapoint and datapoint["duration"] >= 0:
                    # should be able to use binstart here without tracking
                    # the timestamp because the user never actually sees the
                    # times displayed
                    sparkline.append([datapoint["binstart"],
                            int(round(datapoint["duration"]))])
                else:
                    sparkline.append([datapoint["binstart"], None])
            sparklines[label] = sparkline
            sparkline_ints = [x[1] for x in sparkline if isinstance(x[1], int)]
            if len(sparkline_ints) > 0:
                linemax = max(sparkline_ints)
                if linemax > maximum:
                    maximum = linemax

    elif metric == "hops":
        # TODO mark cells where the traceroute didn't complete properly
        for label, datapoints in data.iteritems():
            sparkline = []
            for datapoint in datapoints:
                if "responses" in datapoint and datapoint["responses"] > 0:
                    sparkline.append([datapoint["timestamp"],
                            int(round(datapoint["responses"]))])
                else:
                    sparkline.append([datapoint["timestamp"], None])
            sparklines[label] = sparkline
            sparkline_ints = [x[1] for x in sparkline if isinstance(x[1], int)]
            if len(sparkline_ints) > 0:
                linemax = max(sparkline_ints)
                if linemax > maximum:
                    maximum = linemax

    elif metric == "bps":
        for label, datapoints in data.iteritems():
            sparkline = []

            for dp in datapoints:
                if "runtime" not in dp or dp["runtime"] is None:
                    sparkline.append([dp["binstart"], None])
                elif "bytes" not in dp or dp["bytes"] is None:
                    sparkline.append([dp["binstart"], None])
                else:
                    bps = (float(dp['bytes']) / dp['runtime']) * 8.0 / 1000.0
                    sparkline.append([dp['binstart'], int(bps)])
            sparklines[label] = sparkline
            sparkline_ints = [x[1] for x in sparkline if isinstance(x[1], int)]
            if len(sparkline_ints) > 0:
                linemax = max(sparkline_ints)
                if linemax > maximum:
                    maximum = linemax
    else:
        return {}

    return {
        "sparklineDataMax": maximum,
        "sparklineData": sparklines,
    }

def build_data_tooltip(ampy, collection, view_id, src, dst, metric,
        data_func):
    """ Build a tooltip showing data between a pair of sites for one metric """
    # ideally the bits of sparkline data shouldn't be at the top level?
    data = get_sparkline_data(ampy, collection, view_id, metric)
    if data is None:
        return None

    stats = get_tooltip_data(ampy, collection, view_id, data_func)
    if stats is None:
        return None
    data['stats'] = stats

    source = get_full_name(ampy, src)
    if source is None:
        return None
    data['source'] = source

    dest = get_full_name(ampy, dst)
    if dest is None:
        return None
    data['destination'] = dest

    data['test'] = metric
    data['site'] = False
    return data

def tooltip(ampy, request):
    """ Internal tooltip specific API """
    urlparts = request.GET

    cell_id = urlparts['id']

    if cell_id.startswith("src__") or cell_id.startswith("dst__"):
        cell_id = cell_id.replace("src__", "").replace("dst__", "")
        return site_info_tooltip(ampy, cell_id);

    if "test" not in urlparts:
        return {}

    test = urlparts["test"]
    format_function = None
    subtype = ""
    if test == "latency":
        collection = "amp-latency"
        format_function = get_formatted_latency
        metric = "latency"
    elif test == "loss":
        collection = "amp-latency"
        format_function = get_formatted_loss
        metric = "loss"
    elif test == "hops":
        collection = "amp-astraceroute"
        format_function = get_formatted_hopcount
        metric = "hops"
    elif test == "mtu":
        collection = "amp-traceroute"
        format_function = None
        return {}
    elif test == "http":
        collection = "amp-http"
        format_function = get_formatted_http
        metric = "duration"
    elif test == "abs-dns" or test == "rel-dns":
        collection = "amp-latency"
        format_function = get_formatted_latency
        metric = "latency"
    elif test == "tput":
        collection = "amp-throughput"
        format_function = get_formatted_bps
        metric = "bps"
    else:
        return None

    idsplit = cell_id.split("__")
    view_id = idsplit[0]
    src = idsplit[1]
    dst = idsplit[2]

    data = build_data_tooltip(ampy, collection, view_id, src, dst, metric,
            format_function)
    if data is None:
        print "Unable to create tooltip for matrix cell"
    return data

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
