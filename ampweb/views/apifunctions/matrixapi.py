import json

def _format_latency_values(recent_data, day_data):
    """ Format latency values for displaying a matrix cell """
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
    """ Format loss values for displaying a matrix cell """
    # XXX what if there were no measurements made?
    return [int(round(recent_data["loss_avg"] * 100))]

def _format_hops_values(recent_data):
    """ Format path length values for displaying a matrix cell """
    # XXX what if there were no measurements made?
    if recent_data["length"] is not None:
        return [int(round(recent_data["length"]))]
    return [-1]

def matrix(NNTSCConn, request):
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

    sources = NNTSCConn.get_selection_options(collection,
            {"_requesting": "sources", "mesh": src_mesh})

    tableData = []

    for src in sources:
        # Get all the destinations that are in this mesh. We can't exclude
        # the site we are testing from because otherwise the table won't
        # line up properly - it expects every cell to have data
        destinations = NNTSCConn.get_selection_options(collection,
                {"_requesting": "destinations", "mesh": dst_mesh})

    # query for all the recent information from these streams in one go
    recent_data = NNTSCConn.get_recent_view_data(collection,
            "_".join(["matrix", collection, src_mesh, dst_mesh, subtest]),
            duration, "matrix")

    # if it's the latency test then we also need the last 24 hours of data
    # so that we can colour the cell based on how it compares
    if test == "latency":
        day_data = NNTSCConn.get_recent_view_data(collection,
            "_".join(["matrix", collection, src_mesh, dst_mesh, subtest]),
                86400, "matrix")

    # put together all the row data for our table
    for src in sources:
        rowData = [src]
        for dst in destinations:
            # TODO generate proper index name(s)
            index = src + "_" + dst

            values = {}

            if src != dst:
                options = [src, dst, subtest, "FAMILY"]
                view_id = NNTSCConn.view.create_view(collection, -1, "add", options)
                streams = NNTSCConn.view.get_view_streams(collection, view_id)
                if len(streams) == 0:
                    view_id = -1
                values["both"] = view_id
            else:
                values["both"] = -1

            if values["both"] == -1:
                families = [] # skip the loop that follows
            else:
                families = ["ipv4", "ipv6"]

            for family in families:
                subindex = index + "_" + family
                value = []
                view_id = -1

                # ignore when source and dest are the same, we don't test them
                if src != dst:
                    # get the view id to represent this src/dst pair
                    options = [src, dst, subtest, family]
                    view_id = NNTSCConn.view.create_view(collection, -1, "add",
                            options)
                    # check if there has ever been any data (is there a stream id?)
                    streams = NNTSCConn.view.get_view_streams(collection, view_id)
                    if len(streams) == 0:
                        view_id = -1
                    value.append(view_id)
                else:
                    value.append(-1)

                # get the data if there is a legit view id and data is present
                if view_id > 0 and subindex in recent_data and len(recent_data[subindex]) > 0:
                    assert(len(recent_data[subindex]) == 1)
                    recent = recent_data[subindex][0]
                    if test == "latency":
                        day = day_data[subindex][0]
                        assert(len(day_data[subindex]) == 1)
                        value += _format_latency_values(recent, day)
                    elif test == "loss":
                        value += _format_loss_values(recent)
                    elif test == "hops":
                        value += _format_hops_values(recent)
                else:
                    value.append(-1)
                
                values[family] = value

            rowData.append(values)
        tableData.append(rowData)

    return tableData


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

