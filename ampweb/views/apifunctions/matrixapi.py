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
        rowData = [src]
        # Get all the destinations that are in this mesh. We can't exclude
        # the site we are testing from because otherwise the table won't
        # line up properly - it expects every cell to have data
        destinations = NNTSCConn.get_selection_options(collection,
                {"_requesting": "destinations", "mesh": dst_mesh})
        for dst in destinations:
            # Get IPv4 data
            stream_id = _get_stream_id(streams, src, dst, subtest)
            if stream_id > 0:
                result4 = NNTSCConn.get_recent_data(collection, stream_id, duration, "matrix")
                if result4.count() > 0:
                    queryData = result4.fetchone()
                    value = [stream_id]
                    if test == "latency":
                        recent = int(round(queryData["rtt_avg"] or -1))
                        # Get the last weeks average for the dynamic scale
                        result_24_hours = NNTSCConn.get_recent_data(
                                collection, stream_id,
                                86400, "matrix")
                        day_data = result_24_hours.fetchone()
                        daily_avg = int(round(day_data["rtt_avg"] or -1))
                        daily_stddev = round(day_data["rtt_stddev"] or 0)
                        value.append(recent)
                        value.append(daily_avg)
                        value.append(daily_stddev)
                    elif test == "loss":
                        value.append(int(round(queryData["loss_avg"] * 100)))
                    elif test == "hops":
                        if queryData["length"]:
                            value.append(int(queryData["length"]))
                        else:
                            value.append(-1)
                    rowData.append(value)
                else:
                    # This marks src/dst combinations that do test to each
                    # other (they have a stream_id) but there is no recent
                    # data for some reason
                    rowData.append([stream_id, -1])
            else:
                # This value marks src/dst combinations that do not have data
                # because they do not test to each other
                rowData.append([-1, -1])
            # Get IPv6 data
            # src6 = src + ":v6"
            # dst6 = dst + ":v6"
            # result6 = conn.get_recent_data(src6, dst6, ampy_test, subtest,
            #        duration)
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

