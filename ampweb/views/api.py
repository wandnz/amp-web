from pyramid.response import Response
from pyramid.view import view_config
from ampy import ampdb
from math import sqrt
from time import time
from TraceMap import return_JSON
import json

@view_config(route_name='api', renderer='json')
def api(request):
    urlparts = request.matchdict['params']

    # Dictionary of possible internal API metods we support
    apidict = {
        'graph': graph,
        'matrix': matrix,
        'matrix_header': matrix_header,
        'tooltip': tooltip
    }

    # Call off to the correct API method
    if len(urlparts) > 0:
        if urlparts[0][:1] == "_":
            if urlparts[0][1:] in apidict:
                return apidict[urlparts[0][1:]](request)
            else:
                return {"error": "Unsupported API method"}

    return public(request)

""" Public API """
def public(request):
    urlparts = request.matchdict['params']

    db = ampdb.create()

    source = None
    dest = None
    test = None
    options = None
    start = None
    end = None
    binsize = 60

    #What type of response is it
    type = {0 : "sites",
            1 : "sites",
            2 : "tests",
            3 : "subtypes",
            4 : "data",
            5 : "data",
            6 : "data",
            7 : "data",
           }

    # Keep reading until we run out of arguments
    try:
        source = urlparts[0]
        dest = urlparts[1]
        test = urlparts[2]
        options = urlparts[3]
        start = int(urlparts[4])
        end = int(urlparts[5])
        binsize = int(urlparts[6])
    except:
        pass

    response = {}
    try:
        data = db.get(source, dest, test, options, start, end, binsize)
    except:
        response["error"] = "Incorrect number of arguments"
    else:
        response["response"] = {}
        response["response"][type[len(urlparts)]] = []
        for d in data:
            response["response"][type[len(urlparts)]].append(d)

    return response

""" Internal graph specific API """
def graph(request):
    urlparts = request.matchdict['params'][1:]
    db = ampdb.create()


    # Returns Destinations for a given Source
    if urlparts[0] == "dest":
        source = urlparts[1]
        tempdests = []
        dests = []
                
        data = db.get(source)

        for d in data:
            dests.append(d)
        
        # End of Destinations for a given Source
        return dests


    # Returns the traceroute tree for the path analysis graph
    if urlparts[0] == "tracemap":
        return return_JSON(urlparts[1], urlparts[2])
    #--End of tracemap

    if urlparts[0] == "highres":
        graphtype = urlparts[1]
        if graphtype == "latency":
            graphtype = "mean"
        source = urlparts[2]
        dest = urlparts[3]
        lowresstarttime = int(urlparts[4])
        highresstarttime = int(urlparts[5])
        highresendtime = int(urlparts[6])
        lowresendtime = int(urlparts[7])
        highresbinsize = int((highresendtime - highresstarttime) / 300)
        lowresbinsize = 4800

        rawlowresdata = db.get(source, dest, "icmp", "0084", lowresstarttime, lowresendtime, lowresbinsize)
        rawhighresdata = db.get(source, dest, "icmp", "0084", highresstarttime, highresendtime, highresbinsize)
       
        lx = []
        ly = []
        lowres = [lx,ly]

        # Basic low res setup
        for datapoint in rawlowresdata.data:
            lx.append(datapoint["time"] * 1000)
            ly.append(datapoint["rtt_ms"][graphtype])

        hx = []
        hy = []
        highres = [hx, hy]

        #Basic high res setup
        for datapoint in rawhighresdata.data:
            hx.append(datapoint["time"] * 1000)
            hy.append(datapoint["rtt_ms"][graphtype])

        # Splice in high res data
        allx = []
        ally = []
        total = [allx, ally]

        # Loop through low res data and splice in high res
        i = 0
        while i < len(lowres[0]):
            if len(highres[0]) > 0:
                if highres[0][0] < lowres[0][i]:
                    allx.append(highres[0][0])
                    ally.append(highres[1][0])
                    highres[0].pop(0)
                    highres[1].pop(0)
                    i -= 1;

                elif highres[0][0] == lowres[0][i]:
                    allx.append(highres[0][0])
                    ally.append(highres[1][0])
                    highres[0].pop(0)
                    highres[1].pop(0)

                elif highres[0][0] > lowres[0][i]:
                    allx.append(lowres[0][i])
                    ally.append(lowres[1][i])
            else:
                allx.append(lowres[0][i])
                ally.append(lowres[1][i])
            i += 1

        # Any high res left over
        for i in range(0, len(highres[0])):
            allx.append(highres[0][i])
            ally.append(highres[1][i])
        
        # Return the data        
        return total
    #--End of highres

    if urlparts[0] == "lowres":
        datatype = urlparts[1]
        source = urlparts[2]
        dest = urlparts[3]
        starttime = urlparts[4]
        endtime = urlparts[5]
        if len(urlparts) >= 7:
            binsize = int(urlparts[6])
        else:
            binsize = 2400
        rawdata = db.get(source, dest, "icmp", "0084", starttime, endtime, binsize)

        # If no data, return blank
        if rawdata.data == []:
            return [[0],[0]]
        
        x = []
        y = []
        toreturn = [x,y]

        for datapoint in rawdata.data:
            x.append(datapoint["time"] * 1000)
            y.append(datapoint["rtt_ms"][datatype])

        return toreturn
    #--End of lowres

    # End of Graphs function
    return False

""" Internal tooltip specific API """
def tooltip(request):
    urlparts = request.GET
    conn = ampdb.create()

    cellID = urlparts['id']
    # Remove the src__ and dst__ tags, as they're only needed on the client side
    cellID = cellID.replace("src__", "").replace("dst__", "")
    test = urlparts['test']
    data = {}
    # Check if the id contains 2 nodes, or just 1
    if cellID.find("__to__") == -1:
        # If the id is just 1 node, then we just want a description of the node
        
        result = conn.get_site_info(cellID);
        if len(result) > 0:
            data['site'] = "true"
            data['data'] = result["longname"]
        return json.dumps(data)
    else:
        # If the id is two nodes, we want a detailed tooltip and sparkline data
        data['site'] = "false"
        currentData = ""
        hour1 = ""
        hour24 = ""
        day7 = ""
        # Split the ID into the src and dst ID's
        idParts = cellID.split("__to__", 1)
        src = idParts[0]
        dst = idParts[1]

        # Get the full source and destination names
        result = conn.get_site_info(src)
        if len(result) > 0:
            src_fullname = result["longname"]
        result = conn.get_site_info(dst)
        if len(result) > 0:
            dst_fullname = result["longname"]
        
        # Latency tooltip information
        if test == "latency":
            # Get the current latency data
            duration = 60 * 10
            result = conn.get_recent_data(src, dst, "icmp", "0084", duration)
            if result.count() > 0:
                queryData = result.fetchone()
                currentData = int(round(queryData["rtt_ms"]["mean"]))
            # Get the 1 hour latency data
            duration = 60 * 60
            result = conn.get_recent_data(src, dst, "icmp", "0084", duration) 
            if result.count() > 0:
                queryData = result.fetchone()
                hour1 = int(round(queryData["rtt_ms"]["mean"]))
            # Get the 24 hour latency data
            duration = 60 * 60 * 24
            result = conn.get_recent_data(src, dst, "icmp", "0084", duration)
            if result.count() > 0:
                queryData = result.fetchone()
                hour24 = int(round(queryData["rtt_ms"]["mean"]))
            
            # Get the 24 hour detailed latency data for the sparkline, 1 hour binsize
            currentTime = int(time())
            result = conn.get(src, dst, "icmp", "0084", currentTime - duration, currentTime, 600)
            sparkData = []
            total = 0
            nulls = 0
            for test in result:
                if test["rtt_ms"]["mean"] >= 0:
                    roundedLatency = round(test["rtt_ms"]["mean"], 1)
                    sparkData.append(roundedLatency)
                    total += roundedLatency
                else:
                    sparkData.append("null")
                    nulls += 1
            # Check if the data is all "nulls"
            if nulls != len(sparkData):
                # Calculate the mean
                mean = round((total / (len(sparkData) - nulls)), 1)
                # Find the largest number since we can't use max() incase there's a 'null'
                largest = 0
                for test in sparkData:
                    if test != "null":
                        # A small check to find the largest number since we can't use max()
                        if test > largest:
                            largest = test

                # Add all data statistics to the return data
                data['test'] = "latency"
                data['sparklineData'] = sparkData
                data['sparklineDataMin'] = min(sparkData)
                data['sparklineDataMax'] = largest
                data['sparklineDataMean'] = mean
            # In the edge case where data is entirely "null"
            else:
                data['test'] = "latency"
                data['sparklineData'] = sparkData
                data['sparklineDataMean'] = 0
                data['sparklineDataMin'] = 0
                data['sparklineDataMax'] = 0

            # Get the 7 day latency data
            duration = 60 * 60 * 24 * 7
            result = conn.get_recent_data(src, dst, "icmp", "0084", duration)
            if result.count() > 0:
                queryData = result.fetchone()
                day7 = int(round(queryData["rtt_ms"]["mean"]))
            
            # Create a string representing a table with the latency data in it
            # For each latency entry, check if the data was a -1 or not
            tableData = "<table class='tooltip'>"
            tableData += "<tr><td class='tooltip_title' colspan='2'><b>" + src_fullname + "</b><br> to <br><b>" + dst_fullname + "</b></td></tr>"
            if currentData != -1:
                tableData += "<tr><td class='tooltip_metric top'><b>Current latency:</b></td><td class='tooltip_period_value top'><b>%dms</b></td></tr>" % (currentData)
            else:
                tableData += "<tr><td class='tooltip_metric top'><b>Current latency:</b></td><td class='tooltip_period_value top'><b>no data</b></td></tr>"
            if hour1 != -1:
                tableData += "<tr><td class='tooltip_metric'>1 hour average:</td><td class='tooltip_period_value'>%dms</td></tr>" % (hour1)
            else:
                tableData += "<tr><td class='tooltip_metric'>1 hour average:</td><td class='tooltip_period_value'>no data</td></tr>"
            if hour24 != -1:
                tableData += "<tr><td class='tooltip_metric'>24 hour average:</td><td class='tooltip_period_value'>%dms</td></tr>" % (hour24)
            else:
                tableData += "<tr><td class='tooltip_metric'>24 hour average:</td><td class='tooltip_period_value'>no data</td></tr>"
            if day7 != -1:
                tableData += "<tr><td class='tooltip_metric bottom'>7 day average:</td><td class='tooltip_period_value bottom'>%dms</td></tr>" % (day7)
            else:
                tableData += "<tr><td class='tooltip_metric bottom'>7 day average:</td><td class='tooltip_period_value bottom'>no data</td></tr>"

            # Check if all the data is null
            if nulls != len(sparkData):
                tableData += "<tr><td colspan='2' id='td_sparkline_descrip'>Highest value in 24 hours (blue): %dms<br>Lowest value in 24 hours (green): %dms </td></tr>" % (largest, min(sparkData))
                tableData += "<tr><td colspan='2' id='td_sparkline'></td></tr>"
            else:
                tableData += "<tr><td colspan='2' id='td_sparkline_none'>No data available for the last 24 hours</td></tr>"
            tableData += "</table>"
            
            # Add the table to the json return object
            data['tableData'] = tableData

        # Loss tooltip information
        elif test == "loss":
            # Get the current loss data
            duration = 60 * 10
            result = conn.get_recent_data(src, dst, "icmp", "0084", duration)
            if result.count() > 0:
                queryData = result.fetchone()
                missing = queryData["rtt_ms"]["missing"]
                present = queryData["rtt_ms"]["count"]
                loss = 100.0 * missing / (missing + present)
                currentData = int(round(loss))
            # Get the 1 hour loss data
            duration = 60 * 60
            result = conn.get_recent_data(src, dst, "icmp", "0084", duration)
            if result.count() > 0:
                queryData = result.fetchone()
                missing = queryData["rtt_ms"]["missing"]
                present = queryData["rtt_ms"]["count"]
                loss = 100.0 * missing / (missing + present)
                hour1 = int(round(loss))
            # Get the 24 hour loss data
            duration = 60 * 60 * 24
            result = conn.get_recent_data(src, dst, "icmp", "0084", duration)
            if result.count() > 0:
                queryData = result.fetchone()
                missing = queryData["rtt_ms"]["missing"]
                present = queryData["rtt_ms"]["count"]
                loss = 100.0 * missing / (missing + present)
                hour24 = int(round(loss))

            # Get the 24 hour detailed loss data for the sparkline, 10 minute binsize
            currentTime = int(time())
            result = conn.get(src, dst, "icmp", "0084", currentTime - duration, currentTime, 600)
            sparkData = []
            for test in result:
                missing = test["rtt_ms"]["missing"]
                present = test["rtt_ms"]["count"]
                loss = 100.0 * missing / (missing + present)
                roundedLoss = int(round(loss))
                sparkData.append(roundedLoss)
            data['test'] = "loss"
            data['sparklineData'] = sparkData
            data['sparklineDataMax'] = max(sparkData)

            # Get the 7 day loss data
            duration = 60 * 60 * 24 * 7
            result = conn.get_recent_data(src, dst, "icmp", "0084", duration)
            if result.count() > 0:
                queryData = result.fetchone()
                missing = queryData["rtt_ms"]["missing"]
                present = queryData["rtt_ms"]["count"]
                loss = 100.0 * missing / (missing + present)
                day7 = int(round(loss))

            # Return string representing a table with the loss data in it
            tableData = "<table class='tooltip'>"
            tableData += "<tr><td class='tooltip_title' colspan='2'><b>" + src_fullname + "</b><br> to <br><b>" + dst_fullname + "</b></td></tr>"
            tableData += "<tr><td class='tooltip_metric top'><b>Current loss:</b></td><td class='tooltip_period_value top'><b>%d%%</b></td></tr>" % (currentData)
            tableData += "<tr><td class='tooltip_metric'>1 hour average:</td><td class='tooltip_period_value'>%d%%</td></tr>" % (hour1)
            tableData += "<tr><td class='tooltip_metric'>24 hour average:</td><td class='tooltip_period_value'>%d%%</td></tr>" % (hour24)
            tableData += "<tr><td class='tooltip_metric bottom'>7 day average:</td><td class='tooltip_period_value bottom'>%d%%</td></tr>" % (day7)
            tableData += "<tr><td colspan='2' id='td_sparkline_descrip'>Highest loss in 24 hours (blue): %d%% </td></tr>" % max(sparkData)
            tableData += "<tr><td colspan='2' id='td_sparkline'></td></tr>"
            tableData += "</table>"

            # Add the table to the json return object
            data['tableData'] = tableData

        # TODO: Hops tooltip information
        elif test == "hops":
            # Get the current hops data
            duration = 60 * 10
            result = conn.get_recent_data(src, dst, "trace", "trace", duration)
            if result.count() > 0:
                queryData = result.fetchone()
                if queryData["path"] is not False:
                    currentData = len(queryData["path"]) + 1
                else:
                    currentData = -1
            # Get the 1 hour hops data
            duration = 60 * 60
            result = conn.get_recent_data(src, dst, "trace", "trace", duration)
            if result.count() > 0:
                queryData = result.fetchone()
                if queryData["path"] is not False:
                    hour1 = len(queryData["path"]) + 1
                else:
                    hour1 = -1
            # Get the 24 hour hops data
            duration = 60 * 60 * 24
            result = conn.get_recent_data(src, dst, "trace", "trace", duration)
            if result.count() > 0:
                queryData = result.fetchone()
                if queryData["path"] is not False:
                    hour24 = len(queryData["path"]) + 1
                else:
                    hour24 = -1
            # Get the 24 hour detailed hops data for the sparkline, 10 minute binsize
            currentTime = int(time())
            result = conn.get(src, dst, "trace", "trace", currentTime - duration, currentTime, 600)
            sparkData = []
            largest = 0
            nulls = 0
            for test in result:
                if test["path"] is not False:
                    hopCount = len(test["path"]) + 1
                    if hopCount > largest:
                        largest = hopCount
                else:
                    hopCount = "null"
                    nulls += 1
                sparkData.append(hopCount)

            if nulls != len(sparkData):
                data['test'] = "hops"
                data['sparklineData'] = sparkData
                data['sparklineDataMax'] = largest
            # In the edge case where data is entirely "null"
            else:
                data['test'] = "hops"
                data['sparklineData'] = sparkData
                data['sparklineDataMax'] = 0
            # Get the 7 day hops data
            duration = 60 * 60 * 24 * 7
            result = conn.get_recent_data(src, dst, "trace", "trace", duration)
            if result.count() > 0:
                queryData = result.fetchone()
                if queryData["path"] is not False:
                    day7 = len(queryData["path"]) + 1
                else:
                    day7 = -1
            
            # Return string representing a table with the hops data in it
            tableData = "<table class='tooltip'>"
            tableData += "<tr><td class='tooltip_title' colspan='2'><b>" + src_fullname + "</b><br> to <br><b>" + dst_fullname + "</b></td></tr>"
            tableData += "<tr><td class='tooltip_metric top'><b>Current hops:</b></td><td class='tooltip_period_value top'><b>%d</b></td></tr>" % (currentData)
            tableData += "<tr><td class='tooltip_metric'>1 hour average:</td><td class='tooltip_period_value'>%d</td></tr>" % (hour1)
            tableData += "<tr><td class='tooltip_metric'>24 hour average:</td><td class='tooltip_period_value'>%d</td></tr>" % (hour24)
            tableData += "<tr><td class='tooltip_metric bottom'>7 day average:</td><td class='tooltip_period_value bottom'>%d</td></tr>" % (day7)
            if nulls != len(sparkData):
                tableData += "<tr><td colspan='2' id='td_sparkline_descrip'>Highest value in 24 hours (blue): %d<br>Lowest value in 24 hours (green): %d </td></tr>" % (largest, min(sparkData))
                tableData += "<tr><td colspan='2' id='td_sparkline'></td></tr>"
            else:
                tableData += "<tr><td colspan='2' id='td_sparkline_none'>No data available for the last 24 hours</td></tr>"    
            tableData += "</table>"

            # Add the table to the json return object
            data['tableData'] = tableData


        # TODO: Mtu tooltip information
        elif test == "mtu":
            pass


        return json.dumps(data)
    # If the id is just 1 node, then we want a description of the node

""" Internal matrix specific API """
def matrix(request):
    urlparts = request.GET
    conn = ampdb.create()

    ampyTest = None
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
    except:
        pass

    # Display a 10 minute average in the main matrix cells: 60s * 10min.
    duration = 60 * 10

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
        ampyTest = "trace"
        subtest = "trace"
    elif test == "mtu":
        # TODO add MTU data
        return {}

    srcList = conn.get_sources(mesh=src_mesh)

    tableData = []
    # Query for data between every source and destination
    for src in srcList:
        rowData = [src]
        # Get all the destinations that are in this mesh. We can't exclude
        # the site we are testing from because otherwise the table won't
        # line up properly - it expects every cell to have data
        dstList = conn.get_destinations(mesh=dst_mesh)
        for dst in dstList:
            # Get IPv4 data
            result4 = conn.get_recent_data(src, dst, ampyTest, subtest, duration)
            if result4.count() > 0:
                queryData = result4.fetchone()
                if test == "latency":
                    recent = int(round(queryData[index][sub_index]))
                    # Get the last weeks average for the dynamic scale
                    result_24_hours = conn.get_recent_data(src, dst, ampyTest, subtest, 86400)
                    dayData = result_24_hours.fetchone()
                    week = int(round(dayData[index]["min"]))
                    value = [recent, week]
                elif test == "loss":
                    missing = queryData[index]["missing"]
                    present = queryData[index]["count"]
                    loss = 100.0 * missing / (missing + present)
                    value = int(round(loss))
                elif test == "hops":
                    if queryData["path"] is not False:
                        value = len(queryData["path"]) + 1
                    else:
                        value = -1
                rowData.append(value)
            else:
                # This value marks src/dst combinations that do not have data.
                # eg testing to self, or to a dest that isn't tested to from this
                # particular source (but is still in the same mesh).
                rowData.append("X")
            # Get IPv6 data
            # src6 = src + ":v6"
            # dst6 = dst + ":v6"
            # result6 = conn.get_recent_data(src6, dst6, ampyTest, subtest, duration)
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

    # Create a dictionary so that the data is stored in a way that DataTables expects
    data_list_dict = {}
    data_list_dict.update({'aaData': tableData})
    return data_list_dict

""" Internal matrix thead specific API """
def matrix_header(request):
    urlparts = request.GET
    conn = ampdb.create()

    # Get the list of destination nodes and return it
    dst_mesh = urlparts['dstMesh']
    result = conn.get_destinations(mesh=dst_mesh)
    return result

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
