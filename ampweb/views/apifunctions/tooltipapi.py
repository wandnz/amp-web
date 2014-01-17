import time

def _get_family(label):
    if label.endswith("_ipv4"):
        return "ipv4"
    if label.endswith("_ipv6"):
        return "ipv6"
    return "unknown"


# TODO make it more obvious if a measurement is for ipv4 or ipv6?
def get_formatted_latency(NNTSCConn, collection, view_id, duration):
    """ Fetch the average latency and format it for printing with units """
    result = NNTSCConn.get_recent_view_data(collection, view_id, duration, "basic")
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

def get_formatted_loss(NNTSCConn, collection, view_id, duration):
    """ Fetch the average loss and format it for printing with units """
    result = NNTSCConn.get_recent_view_data(collection, view_id, duration, "basic")
    formatted = { "ipv4": "No data", "ipv6": "No data" }
    for label, datapoint in result.iteritems():
        if len(datapoint) > 0 and "loss" in datapoint[0]:
            value = datapoint[0]["loss"]
            family = _get_family(label)
            formatted[family] = "%d%%" % round(value * 100)
    return "%s / %s" % (formatted["ipv4"], formatted["ipv6"])

def get_formatted_hopcount(NNTSCConn, collection, view_id, duration):
    """ Fetch the average hopcount and format it for printing with units """
    result = NNTSCConn.get_recent_view_data(collection, view_id, duration, "matrix")
    formatted = { "ipv4": "No data", "ipv6": "No data" }
    for label, datapoint in result.iteritems():
        if len(datapoint) > 0 and "length" in datapoint[0]:
            value = datapoint[0]["length"]
            family = _get_family(label)
            formatted[family] = "%d hops" % round(value)
    return "%s / %s" % (formatted["ipv4"], formatted["ipv6"])

def stats_tooltip(src, dst, rows, sparklines):
    """ Generate the HTML for a tooltip showing aggregate statistics """
    # Build header with source an destination names
    html = '<table>'
    html += '<tr><td class="tooltip_title" colspan="2">'
    html += '<b>%s</b><br> to <br><b>%s</b>' % (src, dst)
    html += '</td></tr>'

    # TODO make the "top" style actually do something (bold)
    for row in rows:
        html += '<tr><td class="tooltip_metric %s">' % row["classes"]
        html += '%s:</td>' % row["label"]
        html += '<td class="tooltip_period_value %s">' % row["classes"]
        html += '%s' % row["value"]
        html += '</td></tr>'

    if sparklines:
        html += '<tr><td colspan="2" id="tooltip_sparkline_descrip">'
        #html += 'Highest value in 24 hours: %dms<br />' % summary["max"]
        #html += 'Lowest value in 24 hours: %dms' %  summary["min"]
        html += 'Last 24 hours:'
        html += '</td></tr>'
        # create a cell to display the sparkline in
        html += '<tr><td colspan="2" id="tooltip_sparkline_combined"></td></tr>'
    else:
        html += '<tr><td colspan="2" id="tooltip_sparkline_none">'
        html += 'No data available for the last 24 hours'
        html += '</td></tr>'

    html += "</table>"
    return html


def site_info_tooltip(NNTSCConn, site):
    """ Generate the HTML for a tooltip describing a single site """
    info = NNTSCConn.get_selection_options("amp-icmp",
            {"_requesting":"site_info", "site":site})
    if len(info) > 0:
        return {
            "site": True,
            "longname": info["longname"],
            "location": info["location"],
            "description": info["description"]
        }
    return {}

def get_full_name(NNTSCConn, site):
    """ Get the full name of a site """
    info = NNTSCConn.get_selection_options("amp-icmp",
            {"_requesting":"site_info", "site":site})
    if len(info) > 0:
        return info["longname"]
    return site


def get_tooltip_data(NNTSCConn, collection, stream_ids, data_func):
    """ Get the tooltip data for different time periods over the last week """
    return [
        {
            "label": "10 minute average",
            "value": data_func(NNTSCConn, collection, stream_ids, 60*10),
            "classes": "top"
        },
        {
            "label": "1 hour average",
            "value": data_func(NNTSCConn, collection, stream_ids, 60*60),
            "classes": ""
        },
        {
            "label": "24 hour average",
            "value": data_func(NNTSCConn, collection, stream_ids, 60*60*24),
            "classes": ""
        },
        {
            "label": "7 day average",
            "value": data_func(NNTSCConn, collection, stream_ids, 60*60*24*7),
            "classes": "bottom"
        },
    ]

def get_sparkline_data(NNTSCConn, collection, view_id, metric):
    """ Get highly aggregated data from the last 24 hours for sparklines """
    duration = 60 * 60 * 24
    binsize = 1800
    sparklines = {}
    maximum = -1

    now = int(time.time())
    start = now - duration

    if metric == "latency":
        data = NNTSCConn.get_period_view_data(collection, view_id, start, now,
                 binsize, "matrix")

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
        data = NNTSCConn.get_period_view_data(collection, view_id, start, now,
                binsize, "matrix")
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
        data = NNTSCConn.get_period_view_data(collection, view_id, start, now,
                binsize, "matrix")
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

def build_data_tooltip(NNTSCConn, collection, view_id, src, dst, metric,
        data_func):
    """ Build a tooltip showing data between a pair of sites for one metric """
    # ideally the bits of sparkline data shouldn't be at the top level?
    data = get_sparkline_data(NNTSCConn, collection, view_id, metric)
    rows = get_tooltip_data(NNTSCConn, collection, view_id, data_func)
    data['tableData'] = stats_tooltip(get_full_name(NNTSCConn, src),
            get_full_name(NNTSCConn, dst), rows, data["sparklineData"])
    data['test'] = metric
    data['site'] = "false"
    return data

def tooltip(NNTSCConn, request):
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

    NNTSCConn.create_parser(collection)
    cell_id = urlparts['id']
    # Remove the src__ and dst__ tags, as they're only needed on the client side
    cell_id = cell_id.replace("src__", "").replace("dst__", "")

    # if there is only a single name, return a tooltip for a site
    if cell_id.find("__to__") == -1:
        return site_info_tooltip(NNTSCConn, cell_id)

    # If there are two names then return a detailed tooltip and sparkline data
    # Split the ID into the src and dst ID's
    site_names = cell_id.split("__to__", 1)
    src = site_names[0]
    dst = site_names[1]
    # XXX why dont we get the matrix to give us the view_id directly?
    options = [src, dst, subtype, "FAMILY"]
    view_id = NNTSCConn.view.create_view(collection, -1, "add", options)

    data = build_data_tooltip(NNTSCConn, collection, view_id, src, dst, test,
            format_function)
    return data

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
