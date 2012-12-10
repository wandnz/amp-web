from pyramid.response import Response
from pyramid.view import view_config
from ampy import ampdb

@view_config(renderer='json', route_name='matrix_update')
def home(request):
    conn = ampdb.create()
    srcData = conn.get()
    dstData = conn.get(srcData)
    srcList = srcData.fetchall()
    dstList = dstData.fetchall()
   
    tableData = []
    for src in srcList:
        rowData = [src]
        for dst in dstList:
            #static query, for now
            result = conn.get(src, dst, "icmp", "0084", 1,1)
            queryDataMean = result.fetchone()['rtt_ms']['mean']
            rowData.append(queryDataMean)
        tableData.append(rowData)

    #create a dictionary so that the data is stored in a way that DataTables expects
    data_list_dict = {}
    data_list_dict.update({'aaData': tableData})
    return data_list_dict
