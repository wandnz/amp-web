from pyramid.response import Response
from pyramid.view import view_config
from ampy import ampdb
from time import time

@view_config(renderer='json', route_name='matrix_update')
def home(request):
    binSize = 3600
    global ampyTest
    global subtest
    global index
    global sub_index
    src = request.params['source']
    dst = request.params['destination']
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
        sub_index = "missing"
    elif test == "hops": # The data is not available for this yet
        pass 
    elif test == "mtu": # The data is not available for this yet
        pass

    conn = ampdb.create()
    srcData = conn.get()
    dstData = conn.get(srcData)
    srcList = srcData.fetchall()
    dstList = dstData.fetchall()
    currentTime = int(time())

    tableData = []
    # Query for data between every source and destination
    for src in srcList:
        rowData = [src]
        for dst in dstList:
            result = conn.get(src, dst, ampyTest, subtest, currentTime-60, currentTime, binSize)   
            queryData = result.fetchone()[index][sub_index]
            if test == "loss":
                loss = (100.0 * queryData) / (binSize / 60)
                queryData = str(round(loss, 1)) + "%"
            rowData.append(queryData)
        tableData.append(rowData)

    # Create a dictionary so that the data is stored in a way that DataTables expects
    data_list_dict = {}
    data_list_dict.update({'aaData': tableData})
    return data_list_dict
