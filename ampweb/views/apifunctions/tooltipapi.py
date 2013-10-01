import time
import json

def _get_active_streams(NNTSCConn, collection, stream_ids, duration):
    """ Determine which streams in a list could possibly be active """
    required = []
    now = int(time.time())
    start = now - duration
    # XXX stream info is cached for 24 hours, so lasttimestamp might not always
    # be up to date. Ideally this value wouldn't be hardcoded...
    cachetime = now - (60 * 60 * 24)
    for stream_id in stream_ids:
        info = NNTSCConn.get_stream_info(collection, stream_id)
        # check if this stream is known to have sent data in the desired
        # period, or has sent data recently enough that lasttimestamp could
        # be obscured by caching
        if info["lasttimestamp"] > start or info["lasttimestamp"] > cachetime:
            required.append(stream_id)
    return required

def get_formatted_latency(NNTSCConn, collection, stream_ids, duration):
    """ Fetch the average latency and format it for printing with units """
    required = _get_active_streams(NNTSCConn, collection, stream_ids, duration)
    result = NNTSCConn.get_recent_data(collection, required, duration, "basic")
    # TODO more checks on data quality?
    if len(result) > 0 and "rtt" in result.values()[0][0]:
        value = result.values()[0][0]["rtt"]
        if value >= 0:
            if value < 1000:
                return "%dus" % round(value)
            return "%dms" % round(float(value)/1000.0)
    return "No data"

def get_formatted_loss(NNTSCConn, collection, stream_ids, duration):
    """ Fetch the average loss and format it for printing with units """
    required = _get_active_streams(NNTSCConn, collection, stream_ids, duration)
    result = NNTSCConn.get_recent_data(collection, required, duration, "basic")
    # TODO more checks on data quality?
    if len(result) > 0 and "loss" in result.values()[0][0]:
        return "%d%%" % round(result.values()[0][0]["loss"] * 100)
    return "No data"

# XXX this is all quite different and needs to be made more like latency
# and use a basic, really aggregated query
def get_formatted_hopcount(NNTSCConn, collection, stream_ids, duration):
    """ Fetch the average hopcount and format it for printing with units """
    result = NNTSCConn.get_recent_data(collection, stream_ids, duration, "full")
    #print result
    # XXX this is just taking the first value
    if len(result) > 0:
        for stream_id,datapoint in result.iteritems():
            if stream_id in stream_ids:
                if len(datapoint) > 0:
                    data = datapoint[0]["length_avg"]
                    return "%d hops" % round(data)
    return "No data"

def stats_tooltip(src, dst, rows, sparklines):
    """ Generate the HTML for a tooltip showing aggregate statistics """
    # Build header with source an destination names
    html = '<table class="tooltip">'
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
            "site": "true", # why not a boolean True?
            # TODO only add description if there is one? formatting? bold?
            "site_info": "<p>%s (%s)</p><p>%s</p>" % (
                    info["longname"],
                    info["location"],
                    info["description"])
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

def get_sparkline_data(NNTSCConn, collection, stream_ids, metric):
    """ Get highly aggregated data from the last 24 hours for sparklines """
    duration = 60 * 60 * 24
    binsize = 1800
    sparklines = {}
    maximum = -1

    now = int(time.time())
    start = now - duration

    # limit it to only stream ids with recent data
    required = _get_active_streams(NNTSCConn, collection, stream_ids, duration)

    if metric == "latency":
        data = NNTSCConn.get_period_data(collection, required, start, now,
                 binsize, "matrix")

        for stream_id,datapoints in data.iteritems():
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
            sparklines[stream_id] = sparkline
            sparkline_ints = [x[1] for x in sparkline if isinstance(x[1], int)]
            if len(sparkline_ints) > 0:
                linemax = max(sparkline_ints)
                if linemax > maximum:
                    maximum = linemax

    elif metric == "loss":
        data = NNTSCConn.get_period_data(collection, queries, start, now,
                binsize, "full")
        for stream_id,datapoints in data.iteritems():
            if len(datapoints) == 0:
                continue
            sparkline = []
            for datapoint in datapoints:
                if "loss" in datapoint:
                    sparkline.append([datapoint["timestamp"],
                            int(round(datapoint["loss"] * 100))])
                else:
                    sparkline.append([datapoint["timestamp"], None])
            sparklines[stream_id] = sparkline
            if len(sparkline) > 0:
                linemax = max(x[1] for x in sparkline)
                if linemax > maximum:
                    maximum = linemax

    elif metric == "hops":
        # TODO mark cells where the traceroute didn't complete properly
        data = NNTSCConn.get_period_data(collection, stream_ids, start, now,
                binsize, "full")
        for stream_id,datapoints in data.iteritems():
            sparkline = []
            for datapoint in datapoints:
                if "length_avg" in datapoint and datapoint["length_avg"] > 0:
                    sparkline.append([datapoint["timestamp"],
                            int(round(datapoint["length_avg"]))]);
                else:
                    sparkline.append([datapoint["timestamp"], None])
            sparklines[stream_id] = sparkline
            sparkline_ints = [x[1] for x in sparkline if isinstance(x[1], int)]
            if len(sparkline_ints) > 0:
                linemax = max(sparkline_ints)
                if linemax > maximum:
                    maximum = linemax
    else:
        return {}

    # pick the best and worst values in each bin to display as two sparklines
    # TODO do we want to do something with min/median/max/stddev instead?
    best = {}
    worst = {}
    for stream_id,line in sparklines.iteritems():
        for timestamp,value in line:
            if value is None:
                continue
            if timestamp not in best or best[timestamp] > value:
                best[timestamp] = value
            if timestamp not in worst or worst[timestamp] < value:
                worst[timestamp] = value

    timestamps = best.keys()
    timestamps.sort()
    twolines = { 0:[], 1:[] }
    for timestamp in timestamps:
        twolines[0].append([timestamp, best[timestamp]])
        twolines[1].append([timestamp, worst[timestamp]])


    return {
        "sparklineDataMax": maximum,
        "sparklineData": twolines,
    }

def build_data_tooltip(NNTSCConn, collection, stream_ids, src, dst, metric,
        data_func):
    """ Build a tooltip showing data between a pair of sites for one metric """
    # ideally the bits of sparkline data shouldn't be at the top level?
    data = get_sparkline_data(NNTSCConn, collection, stream_ids, metric)
    rows = get_tooltip_data(NNTSCConn, collection, stream_ids, data_func)
    data['tableData'] = stats_tooltip(get_full_name(NNTSCConn, src),
            get_full_name(NNTSCConn, dst), rows, data["sparklineData"])
    data['test'] = metric
    data['site'] = "false"
    return data

def tooltip(NNTSCConn, request):
    """ Internal tooltip specific API """
    urlparts = request.GET

    if "test" not in urlparts:
        return json.dumps({})

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
        return json.dumps({})

    NNTSCConn.create_parser(collection)
    cell_id = urlparts['id']
    # Remove the src__ and dst__ tags, as they're only needed on the client side
    cell_id = cell_id.replace("src__", "").replace("dst__", "")

    # if there is only a single name, return a tooltip for a site
    if cell_id.find("__to__") == -1:
        return json.dumps(site_info_tooltip(NNTSCConn, cell_id))

    # If there are two names then return a detailed tooltip and sparkline data
    # Split the ID into the src and dst ID's
    site_names = cell_id.split("__to__", 1)
    src = site_names[0]
    dst = site_names[1]
    stream_ids = NNTSCConn.get_stream_id(collection, {
        "source": src,
        "destination": dst,
        "packet_size": subtype,
    })

    data = build_data_tooltip(NNTSCConn, collection, stream_ids, src, dst, test,
            format_function)
    return json.dumps(data)

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
