from pyramid.response import Response
from pyramid.view import view_config
from ampy import ampdb
from time import time

@view_config(renderer='json', route_name='matrix_update')
def home(request):
    global ampyTest
    global subtest
    global index
    global sub_index
    binSize = 3600
    # Display a 10 minute average in the main matrix cells: 60s * 10min.
    duration = 60 * 10
    src_mesh = request.params['source']
    dst_mesh = request.params['destination']
    test = request.params['testType']
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
        # TODO add hops data
        return {} 
    elif test == "mtu": 
        # TODO add MTU data
        return {} 

    conn = ampdb.create()
    srcList = conn.get_sources(mesh=src_mesh)
    end = int(time())
    start = end - duration

    tableData = []
    # Query for data between every source and destination
    for src in srcList:
        rowData = [src]
        # Get all the destinations from this source that are also in this mesh.
        dstList = conn.get_destinations(src, mesh=dst_mesh)
        for dst in dstList:
            result = conn.get(src, dst, ampyTest, subtest, start, end, binSize)
            if result.count() > 0:
                queryData = result.fetchone()
                if test == "latency":
                    value = queryData[index][sub_index]
                elif test == "loss":
                    missing = queryData[index]["missing"]
                    present = queryData[index]["count"]
                    loss = 100.0 * missing / (missing + present)
                    value = str(round(loss, 1)) + "%"
                rowData.append(value)
            else:
                # TODO what value should mark src/dst combinations that will
                # not have data? eg testing to self, or to a dest that isn't 
                # tested to from this particular source (but is still in the
                # same mesh).
                rowData.append("X")
        tableData.append(rowData)

    # Create a dictionary so that the data is stored in a way that DataTables expects
    data_list_dict = {}
    data_list_dict.update({'aaData': tableData})
    return data_list_dict

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
