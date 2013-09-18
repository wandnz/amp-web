# Do our own version of the get_stream_id() function that operates on locally
# cached data, so that we don't need to fire off an HTTP request to generate
# every link in the matrix!
def _get_stream_id(streams, source, destination, packet_size):
    return [x["stream_id"] for x in streams \
        if x["source"] == source and x["destination"] == destination and \
        x["packet_size"] == packet_size]

def _format_latency_values(recent_data, day_data):
    value = []
    rtt_total = 0
    day_rtt_total = 0
    day_stddev_total = 0
    recent_count = 0
    day_count = 0

    # add up all the latency measurements for streams in the last 10 minutes
    for recent in recent_data:
        if len(recent) < 1:
            continue
        assert(len(recent) == 1)
        # there isn't always rtt data for a period, even if there is data
        if recent[0]["rtt_count"] > 0:
            recent_count += recent[0]["rtt_count"]
            rtt_total += (int(round(recent[0]["rtt_avg"])) * recent[0]["rtt_count"])

    # add up all the latency measurements for streams in the last 24 hours
    for day in day_data:
        if len(day) < 1:
            continue
        assert(len(day) == 1)
        # there isn't always rtt data for a period, even if there is data
        if day[0]["rtt_count"] > 0:
            day_count += day[0]["rtt_count"]
            day_rtt_total += (int(round(day[0]["rtt_avg"])) * day[0]["rtt_count"])
            day_stddev_total += (round(day[0]["rtt_stddev"]) * day[0]["rtt_count"])

    # if there are good measurements, then figure out the average and add
    # them to the value list otherwise set them to marker values -1 and 0
    if recent_count > 0:
        value.append(int(round(rtt_total / recent_count)))
    else:
        value.append(-1)
    if day_count > 0:
        value.append(int(round(day_rtt_total / day_count)))
        value.append(round(day_stddev_total / day_count))
    else:
        value.append(-1)
        value.append(0)
    return value

def _format_loss_values(recent_data):
    count = 0
    loss = 0

    for recent in recent_data:
        if len(recent) < 1:
            continue
        assert(len(recent) == 1)
        # if there is data, then there is always loss_avg (which could be 0)
        count += recent[0]["loss_count"]
        loss += (recent[0]["loss_avg"] * recent[0]["loss_count"])
    if count > 0:
        return [int(round(loss / count * 100))]
    # no count means there were no measurements made
    return [-1]

def _format_hops_values(recent_data):
    count = 0
    hops = 0

    for recent in recent_data:
        if len(recent) < 1:
            continue
        assert(len(recent) == 1)
        # if there is data, then there is always a length_avg
        count += recent[0]["length_count"]
        hops += (recent[0]["length_avg"] * recent[0]["length_count"])
    if count > 0:
        return [int(round(hops / count))]
    # no count means there were no measurements made
    return [-1]

def matrix(NNTSCConn, request):
    """ Internal matrix specific API """
    urlparts = request.GET
    collection = None
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
    except IndexError:
        pass

    # Display a 10 minute average in the main matrix cells: 60s * 10min.
    duration = 60 * 10

    if test == "latency":
        collection = "amp-icmp"
        subtest = "84"
    elif test == "loss":
        collection = "amp-icmp"
        subtest = "84"
    elif test == "hops":
        collection = "amp-traceroute"
        subtest = "60"
        duration = 60 * 15
    elif test == "mtu":
        # TODO add MTU data
        return {}
    NNTSCConn.create_parser(collection)

    # load all the streams now so we can look them up without more requests
    # XXX will this caching prevent new streams appearing unless restarted?
    streams = NNTSCConn.get_collection_streams(collection)
    sources = NNTSCConn.get_selection_options(collection,
            {"_requesting": "sources", "mesh": src_mesh})

    tableData = []

    stream_ids = []
    for src in sources:
        # Get all the destinations that are in this mesh. We can't exclude
        # the site we are testing from because otherwise the table won't
        # line up properly - it expects every cell to have data
        destinations = NNTSCConn.get_selection_options(collection,
                {"_requesting": "destinations", "mesh": dst_mesh})
        # build a list of all streams from this source
        for dst in destinations:
            stream_ids += _get_stream_id(streams, src, dst, subtest)

    # query for all the recent information from these streams in one go
    recent_data = NNTSCConn.get_recent_data(
            collection, stream_ids, duration, "matrix")

    # if it's the latency test then we also need the last 24 hours of data
    # so that we can colour the cell based on how it compares
    if test == "latency":
        day_data = NNTSCConn.get_recent_data(
                collection, stream_ids, 86400, "matrix")

    # put together all the row data for DataTables
    for src in sources:
        rowData = [src]
        for dst in destinations:
            value = []
            stream_ids = _get_stream_id(streams, src, dst, subtest)
            # determine the stream ids that match this src/dst/subtest and
            # combine them all together into one big string, or -1
            if len(stream_ids) == 0:
                value.append(-1)
            else:
                value.append("-".join(str(x) for x in stream_ids))

            # determine if there is any valid data, and if so add it, or -1
            if len(stream_ids) == 0 or recent_data is None:
                value.append(-1)
            else:
                recent = [v for k,v in recent_data.iteritems() if k in stream_ids]
                if test == "latency":
                    day = [v for k,v in day_data.iteritems() if k in stream_ids]
                    value += _format_latency_values(recent, day)
                elif test == "loss":
                    value += _format_loss_values(recent)
                elif test == "hops":
                    value += _format_hops_values(recent)
            rowData.append(value)
        tableData.append(rowData)

    # Create a dictionary to store the data in a way that DataTables expects
    data_list_dict = {}
    data_list_dict.update({'aaData': tableData})
    return data_list_dict


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

