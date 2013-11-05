# Do our own version of the get_stream_id() function that operates on locally
# cached data, so that we don't need to fire off an HTTP request to generate
# every link in the matrix!
def _get_stream_id(streams, source, destination, packet_size):
    return [x["stream_id"] for x in streams \
        if x["source"] == source and x["destination"] == destination and \
        x["packet_size"] == packet_size]

def _format_latency_values(recent_data, day_data):
    # XXX what if there were no measurements made?
    if recent_data["rtt_avg"] is not None:
        recent_rtt = int(round(recent_data["rtt_avg"]))
    else:
        recent_rtt = -1

    if day_data["rtt_avg"] is not None:
        day_rtt = int(round(day_data["rtt_avg"]))
    else:
        day_rtt = -1

    if day_data["rtt_stddev"] is not None:
        day_stddev = round(day_data["rtt_stddev"])
    else:
        day_stddev = 0

    return [recent_rtt, day_rtt, day_stddev]


def _format_loss_values(recent_data):
    # XXX what if there were no measurements made?
    return [int(round(recent_data["loss_avg"] * 100))]

# TODO make hops work
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
    recent_data = NNTSCConn.get_recent_view_data(collection,
            "matrix" + "_" + src_mesh + "_" + dst_mesh, duration, "matrix")

    # if it's the latency test then we also need the last 24 hours of data
    # so that we can colour the cell based on how it compares
    if test == "latency":
        day_data = NNTSCConn.get_recent_view_data(collection,
                "matrix" + "_" + src_mesh + "_" + dst_mesh, 86400, "matrix")

    # put together all the row data for DataTables
    for src in sources:
        rowData = [src]
        for dst in destinations:
            value = []
            # TODO generate proper index name
            #index = src + "_" + dst + "_ipv4"
            index = src + "_" + dst

            # TODO generate proper view_id
            view_id = 12345 # _get_view_id? -1 if no view, ie not tested
            # XXX recent_data checks are temporary while view_id is hardcoded
            if view_id > 0 and index in recent_data and len(recent_data[index]) > 0:
                value.append(view_id)
            else:
                value.append(-1)

            if view_id > 0 and index in recent_data and len(recent_data[index]) > 0:
                assert(len(recent_data[index]) == 1)
                recent = recent_data[index][0]
                if test == "latency":
                    day = day_data[index][0]
                    assert(len(day_data[index]) == 1)
                    value += _format_latency_values(recent, day)
                elif test == "loss":
                    value += _format_loss_values(recent)
                elif test == "hops":
                    value += _format_hops_values(recent)
            else:
                value.append(-1)
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

