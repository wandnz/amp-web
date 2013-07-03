from pyramid.view import view_config
from pyramid.renderers import get_renderer
from ampy import ampdb
    
STYLES = []

NNTSCConn = None

def generateStartScript(funcname, times, graph_type):
    
    return funcname + "({graph: '" + graph_type + "'});"

def lpi_basic_graph(url):
    sources = []
    users = []
    protocols = []
    directions = []
    metrics = []

    dropdown_style = "dropdown_lpibasic.js"
    page_renderer = get_renderer("../templates/lpibasic.pt")

    if len(url) > 1:
        stream = int(url[1])
        streaminfo = NNTSCConn.get_stream_info(stream)
        enableUser = True
    else:
        stream = -1
        streaminfo = {}
        enableUser = False
 
    title = "ampweb2 - Libprotoident Graphs"
   
    if url[0] == "lpi-bytes":
        metrics.append({"name":"bytes", "selected":True})
        dropdown_style = "dropdown_lpibasic.js"
        page_renderer = get_renderer("../templates/lpibasic.pt")
    else:
        metrics.append({"name":"bytes", "selected":False})
         
    for source in NNTSCConn.get_selection_options(url[0], {'_requesting':'sources'}):
        if streaminfo != {} and source == streaminfo["source"]:
            sources.append({"name": source, "selected": True})
        else:
            sources.append({"name": source, "selected": False})
        
    if enableUser and streaminfo != {}:
        params = {'source': streaminfo["source"], '_requesting':'users'}
        for user in NNTSCConn.get_selection_options(url[0], params):
            if user == streaminfo["user"]:
                users.append({"name":user, "selected":True})
            else:
                users.append({"name":user, "selected":False})

    params = {'_requesting':'protocols'}
    for p in NNTSCConn.get_selection_options(url[0], params):
        if streaminfo != {} and p == streaminfo["protocol"]:
            protocols.append({"name":p, "selected":True})
        else:
            protocols.append({"name":p, "selected":False})

    params = {'_requesting':'directions'}
    for d in NNTSCConn.get_selection_options(url[0], params):
        if streaminfo != {} and d == streaminfo["dir"]:
            directions.append({"name":d, "selected":True})
        else:
            directions.append({"name":d, "selected":False})


    startgraph = generateStartScript("changeGraph", url[3:5], "lpi-bytes")
    body = page_renderer.implementation().macros['body']
    lpi_scripts = [
        "nntscgraph.js",
        "dropdown.js",
        dropdown_style,
        "envision.min.js",
        "util.js",
        "graphtemplates/basicts.js",
        "events.js",
        "jquery.sparkline.min.js",
        "history.js",
        "flashcanvas.js",
        "canvas2image.js",
        "grid.js",
        "lpibasic.js",
        "jquery-cookie.js",
        "traceroutemap/raphael.js",
        "traceroutemap/traceroute.map.js",
        "traceroutemap/traceroute.view.js",
    ]
    
    return {
            "title": title,
            "body": body,
            "styles": STYLES,
            "scripts": lpi_scripts,
            "sources": sources,
            "users": users,
            "protocols": protocols,
            "directions": directions,
            #"currentmetric": currentmetric,
            "metrics": metrics,
            "enableUser": enableUser,
            "startgraph": startgraph,
           }


def muninbytes_graph(url):
    switches = []
    interfaces = []
    directions = []

    if len(url) > 1:
        stream = int(url[1])
        streaminfo = NNTSCConn.get_stream_info(stream)
        enableInterface = True
        enableDirection = True
    else:
        stream = -1
        streaminfo = {}
        enableInterface = False
        enableDirection = False
 
    title = "ampweb2 - Munin Graphs"
     
    for source in NNTSCConn.get_selection_options(url[0], {}):
        if streaminfo != {} and source == streaminfo["switch"]:
            switches.append({"name": source, "selected": True})
        else:
            switches.append({"name": source, "selected": False})
        
    if enableInterface and streaminfo != {}:
        params = {'switch': streaminfo["switch"]}
        for iface in NNTSCConn.get_selection_options(url[0], params):
            if iface == streaminfo["interfacelabel"]:
                interfaces.append({"name":iface, "selected":True})
            else:
                interfaces.append({"name":iface, "selected":False})

    if enableDirection and streaminfo != {}:
        params = {'switch': streaminfo["switch"], 'interface':streaminfo["interfacelabel"]}
        for d in NNTSCConn.get_selection_options(url[0], params):
            if d == streaminfo["direction"]:
                directions.append({"name":d, "selected":True})
            else:
                directions.append({"name":d, "selected":False})


    startgraph = generateStartScript("changeGraph", url[3:5], "rrd-muninbytes")
    page_renderer = get_renderer("../templates/muninbytes.pt")
    body = page_renderer.implementation().macros['body']
    munin_scripts = [
        "nntscgraph.js",
        "dropdown.js",
        "dropdown_munin.js",
        "envision.min.js",
        "util.js",
        "graphtemplates/basicts.js",
        "events.js",
        "jquery.sparkline.min.js",
        "history.js",
        "flashcanvas.js",
        "canvas2image.js",
        "grid.js",
        "muninbytes.js",
        "jquery-cookie.js",
        "traceroutemap/raphael.js",
        "traceroutemap/traceroute.map.js",
        "traceroutemap/traceroute.view.js",
    ]
    
    return {
            "title": title,
            "body": body,
            "styles": STYLES,
            "scripts": munin_scripts,
            "switches": switches,
            "interfaces": interfaces,
            "directions": directions,
            "enableInterface": enableInterface,
            "enableDirection": enableDirection,
            "startgraph": startgraph,
           }

def smokeping_graph(url):
    # Variables to return
    sources = []
    destinations = []
    enabledest = False

    if len(url) > 1:
        stream = int(url[1])
        streaminfo = NNTSCConn.get_stream_info(stream)
        enabledest = True
    else:
        stream = -1
        streaminfo = {}

    title = "ampweb2 - Smokeping Graphs"

    for source in NNTSCConn.get_selection_options(url[0], {}):
        if streaminfo != {} and source == streaminfo["source"]:
            sources.append({"name": source, "selected": True})
        else:
            sources.append({"name": source, "selected": False})
    
    if enabledest and streaminfo != {}:
        params = {'source': streaminfo["source"]}    
        for destination in NNTSCConn.get_selection_options(url[0], params):
            if destination == streaminfo["host"]:
                destinations.append({"name": destination, "selected": True})
            else:
                destinations.append({"name": destination, "selected": False})        

    # Is a graph selected?, If so find the possible start/end times
    startgraph = generateStartScript("changeGraph", url[3:5], "rrd-smokeping")
    page_renderer = get_renderer("../templates/smokeping.pt")
    body = page_renderer.implementation().macros['body']
    smokeping_scripts = [
        "nntscgraph.js",
        "dropdown.js",
        "dropdown_smokeping.js",
        "envision.min.js",
        "util.js",
        #"envision.js",
        #"graphtemplates/basicts.js",
        #"graphtemplates/loss.js",
        "graphtemplates/smoke.js",
        "events.js",
        "jquery.sparkline.min.js",
        "history.js",
        "flashcanvas.js",
        "canvas2image.js",
        "grid.js",
        "smokeping.js",
        "jquery-cookie.js",
        "traceroutemap/raphael.js",
        "traceroutemap/traceroute.map.js",
        "traceroutemap/traceroute.view.js",
    ]
    
    return {
            "title": title,
            "body": body,
            "styles": STYLES,
            "scripts": smokeping_scripts,
            "sources": sources,
            "destinations": destinations,
            "enabledest": enabledest,
            "startgraph": startgraph,
           }

@view_config(route_name='graph', renderer='../templates/skeleton.pt')
def graph(request):
    global NNTSCConn
    page_renderer = get_renderer("../templates/graph.pt")
    body = page_renderer.implementation().macros['body']

    # Filtered URL parts
    url = request.matchdict['params']
    nntschost = request.registry.settings['ampweb.nntschost']
    nntscport = request.registry.settings['ampweb.nntscport']

    if NNTSCConn == None:
        NNTSCConn = ampdb.create_nntsc_engine(nntschost, nntscport)
    

    if len(url) == 0:
        return

    NNTSCConn.create_parser(url[0])

    # Get database
    if url[0] == "rrd-smokeping":
        return smokeping_graph(url)
    elif url[0] == "rrd-muninbytes":
        return muninbytes_graph(url)
    elif url[0] == "lpi-bytes":
        return lpi_basic_graph(url) 
    else:
        pass


# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
