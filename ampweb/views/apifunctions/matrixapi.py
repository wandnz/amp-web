import json

def _format_latency_values(recent_data, day_data):
    """ Format latency values for displaying a matrix cell """

    # XXX what if there were no measurements made?
    if recent_data.get("rtt_avg") is not None:
        recent_rtt = int(round(recent_data["rtt_avg"]))
    else:
        recent_rtt = -1

    if day_data.get("rtt_avg") is not None:
        day_rtt = int(round(day_data["rtt_avg"]))
    else:
        day_rtt = -1

    if day_data.get("rtt_stddev") is not None:
        day_stddev = round(day_data["rtt_stddev"])
    else:
        day_stddev = 0

    return [recent_rtt, day_rtt, day_stddev]

def _format_abs_latency_values(recent_data):
    if recent_data.get("rtt_avg") is not None:
        recent_rtt = int(round(recent_data["rtt_avg"]))
    else:
        recent_rtt = -1
   
    return [recent_rtt, -1, -1] 

def _format_loss_values(recent_data):
    """ Format loss values for displaying a matrix cell """
    # XXX what if there were no measurements made?
    return [int(round(recent_data.get("loss_avg") * 100))]

def _format_hops_values(recent_data):
    """ Format path length values for displaying a matrix cell """
    # XXX what if there were no measurements made?
    if recent_data["length"] is not None:
        return [int(round(recent_data.get("length")))]
    return [-1]

def matrix(ampy, request):
    """ Internal matrix specific API """
    urlparts = request.GET
    collection = None
    subtest = None
    index = None
    src_mesh = None
    dst_mesh = None
    test = None

    # Keep reading until we run out of arguments
    try:
        test = urlparts['testType']
        src_mesh = urlparts['source']
        dst_mesh = urlparts['destination']
    except IndexError:
        pass

    # Display a 10 minute average in the main matrix cells: 60s * 10min.
    duration = 60 * 10

    if test == "latency" or test == "absolute-latency":
        collection = "amp-icmp"
        options = [src_mesh, dst_mesh, "84"]
    elif test == "loss":
        collection = "amp-icmp"
        options = [src_mesh, dst_mesh, "84"]
    elif test == "hops":
        collection = "amp-traceroute"
        options = [src_mesh, dst_mesh, "60"]
    elif test == "mtu":
        # TODO add MTU data
        return {"error": "MTU matrix data is not currently supported"}

    tableData = []

    # Get all the destinations that are in this mesh. We can't exclude
    # the site we are testing from because otherwise the table won't
    # line up properly - it expects every cell to have data

    recent = ampy.get_matrix_data(collection, options, duration)
    if recent is None:
        return {'error': "Failed to query matrix data"}


    # query for all the recent information from these streams in one go
    recent_data, recent_timedout, sources, destinations = recent
    
    if len(recent_timedout) != 0:
        # Query for recent data timed out
        request.response_status = 503
        return {'error': "Request for matrix recent data timed out"}

    # if it's the latency test then we also need the last 24 hours of data
    # so that we can colour the cell based on how it compares
    if test == "latency":
        lastday = ampy.get_matrix_data(collection, options, 86400)
        if lastday is None:
            return {'error': "Request for matrix day data failed"}

        day_data, day_timedout,_,_ = lastday
    
        if len(day_timedout) != 0:
            # Query for recent data timed out
            request.response_status = 503
            return {'error': "Request for matrix day data timed out"}

    

    # put together all the row data for our table
    for src in sources:
        rowData = [src]
        for dst in destinations:
            # TODO generate proper index name(s)
            index = src + "_" + dst
            values = {}

            if src != dst:
                celldata = generate_cell(src, dest, test, options, recent_data,
                        day_data)
                if celldata is None:
                    return {'error': "Failed to generate data for cell at %s:%s" % (src, dst)}

                rowData.append(celldata)
            else:
                rowData.append({'both':-1})
        tableData.append(rowData)

    return tableData

def generate_cell(collection, src, dest, test, options, recent, day):

    viewopts = [src] + [dest] + options + ["FAMILY"]

    view_id = ampy.modify_view(collection, 0, "add", viewopts)
    if view_id is None:
        return None               
                
    groupkeyv4 = index + "_ipv4"
    groupkeyv6 = index + "_ipv6"

    # Neither IPv4 or IPv6 groups exist for this cell
    if groupkeyv4 not in recent and groupkeyv6 not in recent:
        return {'both':-1}

    result = {'both':view_id}

    if groupkeyv4 in recent:
        result['ipv4'] = calc_matrix_value(recent, day, groupkeyv4, test)
    else:
        result['ipv4'] = [-1]
    
    if groupkeyv6 in recent:
        result['ipv6'] = calc_matrix_value(recent, day, groupkeyv6, test)
    else:
        result['ipv6'] = [-1]

    return result


def calc_matrix_value(recent, day, groupkey, test):

    if len(recent[groupkey]) == 0:
        return [100, -1]
    else:
        recval = recent[groupkey][0]

        if day is not None and groupkey in day:
            dayval = day[groupkey][0]
        else:
            dayval = None

    if test == "latency":
        if dayval is not None:
            return _format_latency_values(recval, dayval)
        else:
            return [-1]
    elif test == "absolute-latency":
        return _format_abs_latency_values(recval)    
    elif test == "loss":
        return _format_loss_values(recval)
    elif test == "hops":
        return _format_hops_values(recval)
    else:
        return [-1] 
                


def matrix_axis(NNTSCConn, request):
    """ Internal matrix thead specific API """
    urlparts = request.GET

    NNTSCConn.create_parser("amp-icmp")

    # Get the list of source and destination nodes and return it
    src_mesh = urlparts['srcMesh']
    dst_mesh = urlparts['dstMesh']
    result_src = NNTSCConn.get_selection_options("amp-icmp",
            {"_requesting":"sources", "mesh": src_mesh})
    result_dst = NNTSCConn.get_selection_options("amp-icmp",
            {"_requesting":"destinations", "mesh":dst_mesh})
    result = {'src': result_src, 'dst': result_dst}
    return result

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
