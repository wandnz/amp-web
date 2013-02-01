from pyramid.response import Response
from pyramid.view import view_config
from ampy import ampdb
from time import time
from TraceNode import Node
import json

@view_config(route_name='api', renderer='json')
def api(request):
    urlparts = request.matchdict['params']

    # Dictionary of possible internal API metods we support
    apidict = {
        'graph': graph,
        'matrix': matrix,
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
        # Implement traceroute tree structure

        currenttime = int(round(time()))
        ayearago = currenttime - (365 * 24 * 60 * 60)

        # Get list of destinations for the amplet
        destinations = db.get(urlparts[1])

        # Root Node
        treeroot = Node()
        treeroot.name = urlparts[1]
        pointer = treeroot

        # Loop through them, extracting traceroute data
        for destination in destinations:
            # Get the hops            
            hoplists = db.get(urlparts[1], destination, "trace", "trace", ayearago, currenttime)
            refinedHLs = []
            for hoplist in hoplists:
                # Refine the hoplist
                if hoplist.path != False:
                    refinedHLs.append(hoplist)

            # Add hops to final Node tree
            for hoplist in refinedHLs:
                i = 0
                for hop in hoplist["path"]:
                    # Create hop Node
                    i += 1
                    temp = Node(hop)
                    temp.height = i

                    # Add hop to tree
                    prevpointer = pointer
                    pointer = pointer.addNote(temp) 
                    
                    if pointer == False:
                        print "\n\n\n" + ERROR. EEEEROR + "\n\n\n"
                        pointer = prevpointer
                #--End For Loop
            #--End For Loop            
        #--End For Loop
        return treeroot.printTree()
    #--End of tracemap

    if urlparts[0] == "highres":
        source = urlparts[1]
        dest = urlparts[2]
        starttime = urlparts[3]
        endtime = urlparts[4]

        rawdata = db.get(source, dest, "icmp", "0084", starttime, endtime, 300)

        # If no data, return blank
        if rawdata.data == []:
            return [[0],[0]]
        
        x = []
        y = []
        toreturn = [x,y]

        for datapoint in rawdata.data:
            x.append(datapoint["time"] * 1000)
            y.append(datapoint["rtt_ms"]["mean"])

        return toreturn
    #--End of highres

    # End of Graphs function
    return False

""" Internal tooltip specific API """
def tooltip(request):
    urlparts = request.GET
    conn = ampdb.create()

    cellID = urlparts['id']
    test = urlparts['test']
    data = ""
    # Check if the id contains 2 nodes, or just 1
    if cellID.find("__to__") != -1:
        hour1 = ""
        hour24 = ""
        day7 = ""
        idParts = cellID.split("__to__", 1)
        src = idParts[0]
        dst = idParts[1]
        
        # Latency tooltip information
        if test == "latency":
            # Get the 1 hour latency data
            duration = 60 * 60
            result = conn.get_recent_data(src, dst, "icmp", "0084", duration) 
            if result.count() > 0:
                queryData = result.fetchone()
                hour1 = int(round(queryData["rtt_ms"]["mean"]))
            else:
                pass
                # return {}
            # Get the 24 hour latency data
            duration = 60 * 60 * 24
            result = conn.get_recent_data(src, dst, "icmp", "0084", duration)
            if result.count() > 0:
                queryData = result.fetchone()
                hour24 = int(round(queryData["rtt_ms"]["mean"]))

            # Get the 7 day latency data
            duration = 60 * 60 * 24 * 7
            result = conn.get_recent_data(src, dst, "icmp", "0084", duration)
            if result.count() > 0:
                queryData = result.fetchone()
                day7 = int(round(queryData["rtt_ms"]["mean"]))
            
            # Trim the "ampz-" prefix if present
            if src.find("ampz-") == 0:
                src = src.replace("ampz-", "", 1)
            if dst.find("ampz-") == 0:
                dst = dst.replace("ampz-", "", 1)

            # Return a table with the latency data in it
            data = "<table class='tooltip'>"
            data += "<tr><td class='tooltip_title' colspan='4'>" + src + " to " + dst + " </td></tr>"
            data += "<tr><td></td><td>1 hour (average)</td><td>24 hour (average)</td><td>7 day (average)</td></tr>"
            data += "<tr><td class='tooltip_metric'>Latency (ms)</td><td>%d</td><td>%d</td><td>%d</td></tr>" % (hour1, hour24, day7)
            data += "</table>"
        # Loss tooltip information
        elif test == "loss":
            # Get the 1 hour loss data
            duration = 60 * 60
            result = conn.get_recent_data(src, dst, "icmp", "0084", duration)
            if result.count() > 0:
                queryData = result.fetchone()
                missing = queryData["rtt_ms"]["missing"]
                present = queryData["rtt_ms"]["count"]
                loss = 100.0 * missing / (missing + present)
                hour1 = int(round(loss))
            else:
                pass
                # return {}
            # Get the 24 hour loss data
            duration = 60 * 60 * 24
            result = conn.get_recent_data(src, dst, "icmp", "0084", duration)
            if result.count() > 0:
                queryData = result.fetchone()
                missing = queryData["rtt_ms"]["missing"]
                present = queryData["rtt_ms"]["count"]
                loss = 100.0 * missing / (missing + present)
                hour24 = int(round(loss))

            # Get the 7 day loss data
            duration = 60 * 60 * 24 * 7
            result = conn.get_recent_data(src, dst, "icmp", "0084", duration)
            if result.count() > 0:
                queryData = result.fetchone()
                missing = queryData["rtt_ms"]["missing"]
                present = queryData["rtt_ms"]["count"]
                loss = 100.0 * missing / (missing + present)
                day7 = int(round(loss))

            # Trim the "ampz-" prefix if present
            if src.find("ampz-") == 0:
                src = src.replace("ampz-", "", 1)
            if dst.find("ampz-") == 0:
                dst = dst.replace("ampz-", "", 1)

            # Return a table with the loss data in it
            data = "<table class='tooltip'>"
            data += "<tr><td class='tooltip_title' colspan='4'>" + src + " to " + dst + " </td></tr>"
            data += "<tr><td></td><td>1 hour (average)</td><td>24 hour (average)</td><td>7 day (average)</td></tr>"
            data += "<tr><td class='tooltip_metric'>Loss (%%)</td><td>%d</td><td>%d</td><td>%d</td></tr>" % (hour1, hour24, day7)
            data += "</table>"
        # Hops tooltip information
        elif test == "hops":
            pass
        # Mtu tooltip information
        elif test == "mtu":
            pass


        return data
    # If the id is just 1 node, then we want a description of the node
    else:
        result = conn.get_site_info(cellID);
        if len(result) > 0:
            data = result["longname"]
        return data

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
        # TODO add hops data
        return {}
    elif test == "mtu":
        # TODO add MTU data
        return {}

    srcList = conn.get_sources(mesh=src_mesh)

    tableData = []
    # Query for data between every source and destination
    for src in srcList:
        rowData = [src]
        # Get all the destinations that are in this mesh. We can't exclude
        # the site we are testing from because otherwise the table doesn't
        # line up properly - it expects every cell to have data
        dstList = conn.get_destinations(mesh=dst_mesh)
        for dst in dstList:
            result = conn.get_recent_data(src, dst, ampyTest, subtest, duration)
            if result.count() > 0:
                queryData = result.fetchone()
                if test == "latency":
                    value = int(round(queryData[index][sub_index]))
                elif test == "loss":
                    missing = queryData[index]["missing"]
                    present = queryData[index]["count"]
                    loss = 100.0 * missing / (missing + present)
                    value = int(round(loss))
                rowData.append(value)
            else:
                # This value marks src/dst combinations that do not have data. eg testing to self, or to a dest that isn't
                # tested to from this particular source (but is still in the
                # same mesh).
                rowData.append("X")
        tableData.append(rowData)

    # Create a dictionary so that the data is stored in a way that DataTables expects
    data_list_dict = {}
    data_list_dict.update({'aaData': tableData})
    return data_list_dict

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
