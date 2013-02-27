from pyramid.view import view_config
from ampy import ampdb
from time import time
from TraceMap import return_JSON
import json

@view_config(route_name='api', renderer='json')
def api(request):
    urlparts = request.matchdict['params']

    # Dictionary of possible internal API metods we support
    apidict = {
        'graph': graph,
        'matrix': matrix,
        'matrix_axis': matrix_axis,
        'tooltip': tooltip
    }

    # Call off to the correct API method
    if len(urlparts) > 0:
        if urlparts[0][:1] == "_":
            if urlparts[0][1:] in apidict:
                return apidict[urlparts[0][1:]](request)
            else:
                return {"error": "Unsupported API method"}

    return public(request)

def public(request):
    """ Public API """
    urlparts = request.matchdict['params']

    db = ampdb.create()

    source = None
    dest = None
    test = None
    options = None
    start = None
    end = None
    binsize = 60

    # What type of response is it
    rtype = {0 : "sites",
            1 : "sites",
            2 : "tests",
            3 : "subtypes",
            4 : "data",
            5 : "data",
            6 : "data",
            7 : "data",
           }

    # Keep reading until we run out of arguments
    try:
        source = urlparts[0]
        dest = urlparts[1]
        test = urlparts[2]
        options = urlparts[3]
        start = int(urlparts[4])
        end = int(urlparts[5])
        binsize = int(urlparts[6])
    except:
        pass

    response = {}
    try:
        data = db.get(source, dest, test, options, start, end, binsize)
    except:
        response["error"] = "Incorrect number of arguments"
    else:
        response["response"] = {}
        response["response"][rtype[len(urlparts)]] = []
        for d in data:
            response["response"][rtype[len(urlparts)]].append(d)

    return response

def graph(request):
    """ Internal graph specific API """
    urlparts = request.matchdict['params'][1:]
    db = ampdb.create()

    # Returns Destinations for a given Source
    if urlparts[0] == "dest":
        return db.get(urlparts[1])

    # Returns the traceroute tree for the path analysis graph
    if urlparts[0] == "tracemap":
        return return_JSON(urlparts[1], urlparts[2])

    if urlparts[0] == "highres":
        graphtype = urlparts[1]
        if graphtype == "latency":
            graphtype = "mean"
        source = urlparts[2]
        dest = urlparts[3]
        lowresstarttime = int(urlparts[4])
        highresstarttime = int(urlparts[5])
        highresendtime = int(urlparts[6])
        lowresendtime = int(urlparts[7])
        highresbinsize = int((highresendtime - highresstarttime) / 300)
        lowresbinsize = 4800

        rawlowresdata = db.get(source, dest, "icmp", "0084", lowresstarttime, lowresendtime, lowresbinsize)
        rawhighresdata = db.get(source, dest, "icmp", "0084", highresstarttime, highresendtime, highresbinsize)
       
        lx = []
        ly = []
        lowres = [lx, ly]

        # Basic low res setup
        for datapoint in rawlowresdata.data:
            lx.append(datapoint["time"] * 1000)
            ly.append(datapoint["rtt_ms"][graphtype])

        hx = []
        hy = []
        highres = [hx, hy]

        #Basic high res setup
        for datapoint in rawhighresdata.data:
            hx.append(datapoint["time"] * 1000)
            hy.append(datapoint["rtt_ms"][graphtype])

        # Splice in high res data
        allx = []
        ally = []
        total = [allx, ally]

        # Loop through low res data and splice in high res
        i = 0
        while i < len(lowres[0]):
            if len(highres[0]) > 0:
                if highres[0][0] < lowres[0][i]:
                    allx.append(highres[0][0])
                    ally.append(highres[1][0])
                    highres[0].pop(0)
                    highres[1].pop(0)
                    i -= 1

                elif highres[0][0] == lowres[0][i]:
                    allx.append(highres[0][0])
                    ally.append(highres[1][0])
                    highres[0].pop(0)
                    highres[1].pop(0)

                elif highres[0][0] > lowres[0][i]:
                    allx.append(lowres[0][i])
                    ally.append(lowres[1][i])
            else:
                allx.append(lowres[0][i])
                ally.append(lowres[1][i])
            i += 1

        # Any high res left over
        for i in range(0, len(highres[0])):
            allx.append(highres[0][i])
            ally.append(highres[1][i])
        
        # Return the data
        return total

    if urlparts[0] == "lowres":
        datatype = urlparts[1]
        source = urlparts[2]
        dest = urlparts[3]
        starttime = urlparts[4]
        endtime = urlparts[5]
        if len(urlparts) >= 7:
            binsize = int(urlparts[6])
        else:
            binsize = 2400
        rawdata = db.get(source, dest, "icmp", "0084", starttime, endtime, binsize)

        # If no data, return blank
        if rawdata.data == []:
            return [[0], [0]]
        
        x = []
        y = []
        toreturn = [x, y]

        for datapoint in rawdata.data:
            x.append(datapoint["time"] * 1000)
            y.append(datapoint["rtt_ms"][datatype])

        return toreturn
    return False


def get_formatted_latency(conn, src, dst, duration):
    """ Fetch the average latency and format it for printing with units """
    result = conn.get_recent_data(src, dst, "icmp", "0084", duration)
    if result.count() > 0:
        value = result.fetchone()["rtt_ms"]["mean"]
        if value >= 0:
            return "%dms" % round(value)
    return "No data"

def get_formatted_loss(conn, src, dst, duration):
    """ Fetch the average loss and format it for printing with units """
    result = conn.get_recent_data(src, dst, "icmp", "0084", duration)
    if result.count() > 0:
        data = result.fetchone()
        missing = data["rtt_ms"]["missing"]
        present = data["rtt_ms"]["count"]
        loss = 100.0 * missing / (missing + present)
        return "%d%%" % round(loss)
    return "No data"

def get_formatted_hopcount(conn, src, dst, duration):
    """ Fetch the average hopcount and format it for printing with units """
    result = conn.get_recent_data(src, dst, "trace", "trace", duration)
    if result.count() > 0:
        data = result.fetchone()
        if data["path"] is not False:
            return "%d hops" % (len(data["path"]) + 1)
    return "No data"


def stats_tooltip(src, dst, rows, summary, graphdata):
    """ Generate the HTML for a tooltip showing summary statistics """
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

    if graphdata:
        html += '<tr><td colspan="2" id="tooltip_sparkline_descrip">'
        #html += 'Highest value in 24 hours: %dms<br />' % summary["max"]
        #html += 'Lowest value in 24 hours: %dms' %  summary["min"]
        html += 'Last 24 hours:'
        html += '</td></tr>'
        html += '<tr><td colspan="2" id="tooltip_sparkline"></td></tr>'
    else:
        html += '<tr><td colspan="2" id="tooltip_sparkline_none">'
        html += 'No data available for the last 24 hours'
        html += '</td></tr>'

    html += "</table>"
    return html


def site_info_tooltip(site):
    """ Generate the HTML for a tooltip describing a single site """
    conn = ampdb.create()
    info = conn.get_site_info(site)
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


def get_full_name(conn, site):
    """ Get the full name of a site """
    info = conn.get_site_info(site)
    if len(info) > 0:
        return info["longname"]
    return site


def get_tooltip_data(conn, src, dst, data_func):
    """ Get the tooltip data for different time periods over the last week """
    return [
        {
            "label": "Current",
            "value": data_func(conn, src, dst, 60*10),
            "classes": "top"
        },
        {
            "label": "1 hour average",
            "value": data_func(conn, src, dst, 60*60),
            "classes": ""
        },
        {
            "label": "24 hour average",
            "value": data_func(conn, src, dst, 60*60*24),
            "classes": ""
        },
        {
            "label": "7 day average",
            "value": data_func(conn, src, dst, 60*60*24*7),
            "classes": "bottom"
        },
    ]

def get_sparkline_data(conn, src, dst, metric):
    """ Get highly aggregated data from the last 24 hours for sparklines """
    duration = 60 * 60 * 24
    binsize = 1800
    sparkline = []
    mean = 0
    minimum = 0
    maximum = 0

    if metric == "latency":
        data = conn.get_recent_data(src, dst, "icmp", "0084", duration, binsize)
        for datapoint in data:
            if datapoint["rtt_ms"]["mean"] >= 0:
                sparkline.append(int(round(datapoint["rtt_ms"]["mean"])))
            else:
                sparkline.append("null")
        sparkline_ints = [x for x in sparkline if isinstance(x, int)]
        if len(sparkline_ints) > 0:
            minimum = min(sparkline_ints)
            maximum = max(sparkline_ints)
            #mean =

    elif metric == "loss":
        data = conn.get_recent_data(src, dst, "icmp", "0084", duration, binsize)
        for datapoint in data:
            missing = datapoint["rtt_ms"]["missing"]
            present = datapoint["rtt_ms"]["count"]
            sparkline.append(int(round(100.0 * missing / (missing + present))))
        maximum = max(sparkline)
        minimum = min(sparkline)
        #mean =

    elif metric == "hops":
        # TODO mark cells where the traceroute didn't complete properly
        data = conn.get_recent_data(src, dst, "trace", "trace", duration,
                binsize)
        for datapoint in data:
            if datapoint["path"]:
                sparkline.append(len(datapoint["path"]))
            else:
                sparkline.append("null")
        sparkline_ints = [x for x in sparkline if isinstance(x, int)]
        if len(sparkline_ints) > 0:
            minimum = min(sparkline_ints)
            maximum = max(sparkline_ints)
            #mean =
    else:
        return {}

    return {
        "sparklineDataMin": minimum,
        "sparklineDataMax": maximum,
        #"sparklineDataMean": mean,
        "sparklineData": sparkline,
    }


def build_data_tooltip(src, dst, metric, data_func):
    conn = ampdb.create()
    summary = {} # TODO need summary?
    # ideally the bits of sparkline data shouldn't be at the top level?
    data = get_sparkline_data(conn, src, dst, metric)
    rows = get_tooltip_data(conn, src, dst, data_func)
    data['tableData'] = stats_tooltip(get_full_name(conn, src),
            get_full_name(conn, dst), rows, summary, True)
    data['test'] = metric
    data['site'] = "false"
    return data



# TODO move all the tooltip functions out into their own source file
def tooltip(request):
    """ Internal tooltip specific API """
    urlparts = request.GET
    cell_id = urlparts['id']
    # Remove the src__ and dst__ tags, as they're only needed on the client side
    cell_id = cell_id.replace("src__", "").replace("dst__", "")

    # if there is only a single name, return a tooltip for a site
    if cell_id.find("__to__") == -1:
        return json.dumps(site_info_tooltip(cell_id))

    # If there are two names then return a detailed tooltip and sparkline data
    # Split the ID into the src and dst ID's
    site_names = cell_id.split("__to__", 1)
    src = site_names[0]
    dst = site_names[1]

    data = {}
    if "test" in urlparts:
        test = urlparts["test"]
        if test == "latency":
            data = build_data_tooltip(src, dst, test, get_formatted_latency)
        elif test == "loss":
            data = build_data_tooltip(src, dst, test, get_formatted_loss)
        elif test == "hops":
            data = build_data_tooltip(src, dst, test, get_formatted_hopcount)
        # TODO: Mtu tooltip information
        elif test == "mtu":
            data = {}
    return json.dumps(data)

def matrix(request):
    """ Internal matrix specific API """
    urlparts = request.GET
    conn = ampdb.create()

    ampyTest = None
    subtest = None
    index = None
    sub_index = None
    src_mesh = "nz"
    dst_mesh = "nz"
    test = "latency"

    # Keep reading until we run out of arguments
    try:
        test = urlparts['testType'] 
        src_mesh = urlparts['source']
        dst_mesh = urlparts['destination']
    except:
        pass

    # Display a 10 minute average in the main matrix cells: 60s * 10min.
    duration = 60 * 10

    if test == "latency":
        ampyTest = "icmp"
        subtest = "0084"
        index = "rtt_ms"
        sub_index = "mean"
    elif test == "loss":
        ampyTest = "icmp"
        subtest = "0084"
        index = "rtt_ms"
    elif test == "hops":
        ampyTest = "trace"
        subtest = "trace"
    elif test == "mtu":
        # TODO add MTU data
        return {}

    srcList = conn.get_sources(mesh=src_mesh)

    tableData = []
    # Query for data between every source and destination
    for src in srcList:
        rowData = [src]
        # Get all the destinations that are in this mesh. We can't exclude
        # the site we are testing from because otherwise the table won't
        # line up properly - it expects every cell to have data
        dstList = conn.get_destinations(mesh=dst_mesh)
        for dst in dstList:
            # Get IPv4 data
            result4 = conn.get_recent_data(src, dst, ampyTest, subtest, duration)
            if result4.count() > 0:
                queryData = result4.fetchone()
                if test == "latency":
                    recent = int(round(queryData[index][sub_index]))
                    # Get the last weeks average for the dynamic scale
                    result_24_hours = conn.get_recent_data(src, dst, ampyTest, subtest, 86400)
                    dayData = result_24_hours.fetchone()
                    week = int(round(dayData[index]["min"]))
                    value = [recent, week]
                elif test == "loss":
                    missing = queryData[index]["missing"]
                    present = queryData[index]["count"]
                    loss = 100.0 * missing / (missing + present)
                    value = int(round(loss))
                elif test == "hops":
                    if queryData["path"] is not False:
                        value = len(queryData["path"]) + 1
                    else:
                        value = -1
                rowData.append(value)
            else:
                # This value marks src/dst combinations that do not have data.
                # eg testing to self, or to a dest that isn't tested to from this
                # particular source (but is still in the same mesh).
                rowData.append("X")
            # Get IPv6 data
            # src6 = src + ":v6"
            # dst6 = dst + ":v6"
            # result6 = conn.get_recent_data(src6, dst6, ampyTest, subtest, duration)
            # if result6.count() > 0:
                # queryData = result6.fetchone()
                # if test == "latency":
                    # value = int(round(queryData[index][sub_index]))
                # elif test == "loss":
                    # missing = queryData[index]["missing"]
                    # present = queryData[index]["count"]
                    # loss = 100.0 * missing / (missing + present)
                    # value = int(round(loss))
                # rowData.append(value)
            # else:
                # rowData.append("X")
        tableData.append(rowData)

    # Create a dictionary so that the data is stored in a way that DataTables expects
    data_list_dict = {}
    data_list_dict.update({'aaData': tableData})
    return data_list_dict

def matrix_axis(request):
    """ Internal matrix thead specific API """
    urlparts = request.GET
    conn = ampdb.create()

    # Get the list of source and destination nodes and return it
    src_mesh = urlparts['srcMesh']
    dst_mesh = urlparts['dstMesh']
    result_src = conn.get_sources(mesh=src_mesh)
    result_dst = conn.get_destinations(mesh=dst_mesh)
    result = {'src': result_src, 'dst': result_dst}
    return result

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
