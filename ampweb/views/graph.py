from pyramid.view import view_config
from pyramid.renderers import get_renderer
from ampy import ampdb
    
STYLES = []

def generateStartScript(funcname, times, graph_type):
    
    return funcname + "({graph: '" + graph_type + "'});"

def muninbytes_graph(url, nntschost, nntscport):
    switches = []
    interfaces = []
    directions = []

    db = ampdb.create_muninbytes_engine(nntschost, nntscport)

    if len(url) > 1:
        stream = int(url[1])
        streaminfo = db.get_stream_info(stream)
        enableInterface = True
        enableDirection = True
    else:
        stream = -1
        streaminfo = {}
        enableInterface = False
        enableDirection = False
 
    
    for source in db.get_switches():
        if streaminfo != {} and source == streaminfo["switch"]:
            switches.append({"name": source, "selected": True})
        else:
            switches.append({"name": source, "selected": False})
        
    if enableInterface and streaminfo != {}:
        for iface in db.get_interfaces(streaminfo["switch"]):
            if iface == streaminfo["interface"]:
                interfaces.append({"name":iface, "selected":True})
            else:
                interfaces.append({"name":iface, "selected":False})

    if enableDirection and streaminfo != {}:
        for d in db.get_directions(streaminfo["switch"], streaminfo["interface"]):
            if d == streaminfo["direction"]:
                directions.append({"name":d, "selected":True})
            else:
                directions.append({"name":d, "selected":False})


    startgraph = generateStartScript("changeGraph", url[3:5], "muninbytes")
    page_renderer = get_renderer("../templates/muninbytes.pt")
    body = page_renderer.implementation().macros['body']
    munin_scripts = [
        "nntscgraph.js",
        "dropdown.js",
        "envision.min.js",
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
            "title": "Graphs",
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

def smokeping_graph(url, nntschost, nntscport):
    # Variables to return
    sources = []
    destinations = []
    enabledest = False

    db = ampdb.create_smokeping_engine(nntschost, nntscport)

    if len(url) > 1:
        stream = int(url[1])
        streaminfo = db.get_stream_info(stream)
        enabledest = True
    else:
        stream = -1
        streaminfo = {}

    for source in db.get_sources():
        if streaminfo != {} and source == streaminfo["source"]:
            sources.append({"name": source, "selected": True})
        else:
            sources.append({"name": source, "selected": False})
        
    if enabledest and streaminfo != {}:
        for destination in db.get_destinations(streaminfo["source"]):
            if destination == streaminfo["host"]:
                destinations.append({"name": destination, "selected": True})
            else:
                destinations.append({"name": destination, "selected": False})        

    # Is a graph selected?, If so find the possible start/end times
    startgraph = generateStartScript("changeGraph", url[3:5], "smokeping")
    page_renderer = get_renderer("../templates/smokeping.pt")
    body = page_renderer.implementation().macros['body']
    smokeping_scripts = [
        "nntscgraph.js",
        "dropdown.js",
        "envision.min.js",
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
            "title": "Graphs",
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
    page_renderer = get_renderer("../templates/graph.pt")
    body = page_renderer.implementation().macros['body']

    # Filtered URL parts
    url = request.matchdict['params']
    nntschost = request.registry.settings['ampweb.nntschost']
    nntscport = request.registry.settings['ampweb.nntscport']

    if len(url) > 0:
        graph_type = url[0]
    else:
        graph_type = "unknown"

    # Get database
    if graph_type == "smokeping":
        return smokeping_graph(url, nntschost, nntscport)
    elif graph_type == "muninbytes":
        return muninbytes_graph(url, nntschost, nntscport) 
    else:
        pass


# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
