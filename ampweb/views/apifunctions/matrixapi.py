import json

def _format_latency_values(recent_data, day_data):
    """ Format latency values for displaying a matrix cell """

    # XXX what if there were no measurements made?
    if recent_data.get("median_avg") is not None:
        recent_rtt = int(round(recent_data["median_avg"]))
    else:
        recent_rtt = -1

    if day_data.get("median_avg") is not None:
        day_rtt = int(round(day_data["median_avg"]))
    else:
        day_rtt = -1

    if day_data.get("median_stddev") is not None:
        day_stddev = round(day_data["median_stddev"])
    else:
        day_stddev = 0

    return [1, recent_rtt, day_rtt, day_stddev]

def _format_abs_latency_values(recent_data):
    if recent_data.get("median_avg") is not None:
        recent_rtt = int(round(recent_data["median_avg"]))
    else:
        recent_rtt = -1
   
    return [1, recent_rtt, -1, -1] 

def _format_loss_values(recent_data):
    """ Format loss values for displaying a matrix cell """
    # XXX what if there were no measurements made?
    return [1, int(round(recent_data.get("loss_avg") * 100))]

def _format_hops_values(recent_data):
    """ Format path length values for displaying a matrix cell """
    # XXX what if there were no measurements made?
    if "responses" not in recent_data:
        print recent_data
    
    if recent_data["responses"] is not None:
        print recent_data.get("responses")
        return [1, int(round(recent_data.get("responses")))]
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

    options = [src_mesh, dst_mesh]

    if test == "latency" or test == "absolute-latency":
        collection = "amp-icmp"
    elif test == "loss":
        collection = "amp-icmp"
    elif test == "hops":
        collection = "amp-astraceroute"
    elif test == "abs-dns" or test == "rel-dns":
        collection = "amp-dns"
        # DNS tests are generally less frequent, esp. to root servers
        duration = 60 * 30
    elif test == "mtu":
        # TODO add MTU data
        return {"error": "MTU matrix data is not currently supported"}

    tableData = []
    day_data = None

    # Get all the destinations that are in this mesh. We can't exclude
    # the site we are testing from because otherwise the table won't
    # line up properly - it expects every cell to have data

    recent = ampy.get_matrix_data(collection, options, duration)
    if recent is None:
        return {'error': "Failed to query matrix data"}


    # query for all the recent information from these streams in one go
    recent_data, recent_timedout, sources, destinations, cellviews = recent
    
    if len(recent_timedout) != 0:
        # Query for recent data timed out
        request.response_status = 503
        return {'error': "Request for matrix recent data timed out"}

    # if it's the latency test then we also need the last 24 hours of data
    # so that we can colour the cell based on how it compares
    if test == "latency" or test == "rel-dns":
        lastday = ampy.get_matrix_data(collection, options, 86400)
        if lastday is None:
            return {'error': "Request for matrix day data failed"}

        day_data, day_timedout,_,_,_ = lastday
    
        if len(day_timedout) != 0:
            # Query for recent data timed out
            request.response_status = 503
            return {'error': "Request for matrix day data timed out"}

    

    # put together all the row data for our table
    for src in sources:
        rowData = [src]
        for dst in destinations:
            # TODO generate proper index name(s)
            values = {}

            if src != dst:
                if (src, dst) in cellviews:
                    view_id = cellviews[(src, dst)]
                else:
                    view_id = -1
                celldata = generate_cell(view_id, src, dst, test, 
                        options, recent_data, day_data)
                if celldata is None:
                    return {'error': "Failed to generate data for cell at %s:%s" % (src, dst)}

                rowData.append(celldata)
            else:
                rowData.append({'both':-1})
        tableData.append(rowData)

    return tableData

def generate_cell(view_id, src, dest, test, options, recent, day):

    index = src + "_" + dest
                
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

    if test == "latency" or test == "rel-dns":
        if dayval is not None:
            return _format_latency_values(recval, dayval)
        else:
            return [-1]
    elif test == "absolute-latency" or test == "abs-dns":
        return _format_abs_latency_values(recval)    
    elif test == "loss":
        return _format_loss_values(recval)
    elif test == "hops":
        return _format_hops_values(recval)
    else:
        return [-1] 
                


def matrix_axis(ampy, request):
    """ Internal matrix thead specific API """
    urlparts = request.GET

    # Get the list of source and destination nodes and return it
    src_mesh = urlparts['srcMesh']
    dst_mesh = urlparts['dstMesh']
    
    queryres = ampy.get_matrix_members(src_mesh, dst_mesh)
    if queryres == None:
        return {'error': 'Failed to fetch matrix axes'}

    result = {'src': queryres[0], 'dst': queryres[1]}
    return result

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
