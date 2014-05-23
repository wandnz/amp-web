import time

def _get_family(label):
    if label.endswith("_ipv4"):
        return "ipv4"
    if label.endswith("_ipv6"):
        return "ipv6"
    return "unknown"


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
        if len(datapoint) > 0 and "rtt" in datapoint[0]:
            value = datapoint[0]["rtt"]
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
        if len(datapoint) > 0 and "loss" in datapoint[0]:
            value = datapoint[0]["loss"]
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
        if len(datapoint) > 0 and "length" in datapoint[0]:
            value = datapoint[0]["length"]
            family = _get_family(label)
            formatted[family] = "%d hops" % round(value)
    return "%s / %s" % (formatted["ipv4"], formatted["ipv6"])

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
            "description": info["description"]
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
    binsize = 1800
    sparklines = {}
    maximum = -1

    now = int(time.time())
    start = now - duration

    if metric not in ['latency', 'loss', 'hops']:
        return {}
        
    data = ampy.get_historic_data(collection, view_id, start, now,
             binsize, "matrix")

    if data is None:
        print "Error fetching historic data for plotting %s sparklines" % (metric)
        return None

    if metric == "latency":
        for label, datapoints in data.iteritems():
            if len(datapoints) == 0:
                continue
            sparkline = []
            for datapoint in datapoints:
                if "rtt_avg" in datapoint and datapoint["rtt_avg"] >= 0:
                    # should be able to use binstart here without tracking
                    # the timestamp because the user never actually sees the
                    # times displayed
                    sparkline.append([datapoint["binstart"],
                            int(round(datapoint["rtt_avg"]))])
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
            for datapoint in datapoints:
                if "loss_avg" in datapoint:
                    sparkline.append([datapoint["timestamp"],
                            int(round(datapoint["loss_avg"] * 100))])
                else:
                    sparkline.append([datapoint["timestamp"], None])
            sparklines[label] = sparkline
            if len(sparkline) > 0:
                linemax = max(x[1] for x in sparkline)
                if linemax > maximum:
                    maximum = linemax

    elif metric == "hops":
        # TODO mark cells where the traceroute didn't complete properly
        for label, datapoints in data.iteritems():
            sparkline = []
            for datapoint in datapoints:
                if "length" in datapoint and datapoint["length"] > 0:
                    sparkline.append([datapoint["timestamp"],
                            int(round(datapoint["length"]))])
                else:
                    sparkline.append([datapoint["timestamp"], None])
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

    if "test" not in urlparts:
        return {}

    test = urlparts["test"]
    format_function = None
    subtype = ""
    if test == "latency":
        collection = "amp-icmp"
        subtype = "84"
        format_function = get_formatted_latency
    elif test == "loss":
        collection = "amp-icmp"
        subtype = "84"
        format_function = get_formatted_loss
    elif test == "hops":
        collection = "amp-traceroute"
        format_function = get_formatted_hopcount
        subtype = "60"
    elif test == "mtu":
        collection = "amp-traceroute"
        subtype = "60"
        format_function = None
        return {}

    ampy.create_parser(collection)
    cell_id = urlparts['id']
    # Remove the src__ and dst__ tags, as they're only needed on the client side
    cell_id = cell_id.replace("src__", "").replace("dst__", "")

    # if there is only a single name, return a tooltip for a site
    if cell_id.find("__to__") == -1:
        return site_info_tooltip(ampy, cell_id)

    # If there are two names then return a detailed tooltip and sparkline data
    # Split the ID into the src and dst ID's
    site_names = cell_id.split("__to__", 1)
    src = site_names[0]
    dst = site_names[1]
    # XXX why dont we get the matrix to give us the view_id directly?
    options = [src, dst, subtype, "FAMILY"]
    view_id = ampy.modify_view(collection, -1, "add", options)

    if view_id is None:
        print "Unable to generate view for tooltip"
        return None

    data = build_data_tooltip(ampy, collection, view_id, src, dst, test,
            format_function)
    if data is None:
        print "Unable to create tooltip for matrix cell"
    return data

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
