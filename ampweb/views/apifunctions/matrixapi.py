# Do our own version of the get_stream_id() function that operates on locally
# cached data, so that we don't need to fire off an HTTP request to generate
# every link in the matrix!
def _get_stream_id(streams, source, destination, packet_size):
    for stream in streams:
        if stream["source"] == source and stream["destination"] == destination and stream["packet_size"] == packet_size:
            return stream["stream_id"]
    return -1

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
    # Query for data between every source and destination
    for src in sources:
        stream_ids = []
        rowData = [src]
        # Get all the destinations that are in this mesh. We can't exclude
        # the site we are testing from because otherwise the table won't
        # line up properly - it expects every cell to have data
        destinations = NNTSCConn.get_selection_options(collection,
                {"_requesting": "destinations", "mesh": dst_mesh})

        # build a list of all streams from this source
        for dst in destinations:
            stream_ids.append(_get_stream_id(streams, src, dst, subtest))

        # query for all the recent information from these streams in one go
        recent_data = NNTSCConn.get_recent_data(
                collection, stream_ids, duration, "matrix")
# XXX do something if recent data is empty?
        # if it's the latency test then we also need the last 24 hours of data
        if test == "latency":
            day_data = NNTSCConn.get_recent_data(
                    collection, stream_ids, 86400, "matrix")
        else:
            day_data = [[]] * len(stream_ids)

        # combine stream ids, recent data and daily data for each cell
        for recent,stream_id,day in zip(recent_data,stream_ids,day_data):
            # stream_id is always the first item, regardless of test. If the
            # src/dst pair don't test to each other then this will be -1
            value = [stream_id]
            if stream_id < 0 or len(recent) < 1:
                value.append(-1)
            else:
                recent = recent[0]# XXX multiple results because of modulo math
                assert(recent["stream_id"] == stream_id)
                if test == "latency":
                    # items are: recent_rtt, daily_rtt, daily_stddev
                    value.append(int(round(recent["rtt_avg"] or -1)))
                    value.append(int(round(day[0]["rtt_avg"] or -1)))
                    value.append(round(day[0]["rtt_stddev"] or 0))


                    #recent = int(round(data["rtt_avg"] or -1))
                    #foo = day[0] # XXX modulo
                    #daily_avg = int(round(foo["rtt_avg"] or -1))
                    #daily_stddev = round(foo["rtt_stddev"] or 0)
                    #value.append(recent)
                    #value.append(daily_avg)
                    #value.append(daily_stddev)
                elif test == "loss":
                    value.append(int(round(recent["loss_avg"] * 100)))
                elif test == "hops":
                    if recent["length"]:
                        value.append(int(recent["length"]))
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

