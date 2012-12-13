from pyramid.response import Response
from pyramid.view import view_config
from ampy import ampdb
from time import time

@view_config(renderer='json', route_name='matrix_update')
def home(request):
    src = request.params['source']
    dst = request.params['destination']
    ipVersion = request.params['ipVersion'] #not used yet
    test = request.params['testType']
    
    conn = ampdb.create()
    srcData = conn.get()
    dstData = conn.get(srcData)
    srcList = srcData.fetchall()
    dstList = dstData.fetchall()
    currentTime = int(time())
   
    tableData = []
    for src in srcList:
        rowData = [src]
        for dst in dstList:
            #static(ish) query, for now
            result = conn.get(src, dst, test, "0084", currentTime-30, currentTime, 1000)
            queryDataMean = result.fetchone()['rtt_ms']['mean']
            rowData.append(queryDataMean)
        tableData.append(rowData)

    #create a dictionary so that the data is stored in a way that DataTables expects
    data_list_dict = {}
    data_list_dict.update({'aaData': tableData})
    return data_list_dict
