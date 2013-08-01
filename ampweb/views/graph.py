from pyramid.view import view_config
from pyramid.renderers import get_renderer
from ampy import ampdb
    
STYLES = []

NNTSCConn = None

def generateStartScript(funcname, times, graph_type):
    
    return funcname + "({graph: '" + graph_type + "'});"

def lpi_source_dropdown(collection, streaminfo):
    sources = []
    for source in NNTSCConn.get_selection_options(collection, {'_requesting':'sources'}):
        if streaminfo != {} and source == streaminfo["source"]:
            sources.append({"name": source, "selected": True})
        else:
            sources.append({"name": source, "selected": False})

    ddsrc = {'ddlabel': 'Source: ', 'ddidentifier': "drpSource", 'ddcollection':'lpi', 'dditems':sources, 'disabled':False}

    return ddsrc

def lpi_user_dropdown(collection, streaminfo):
    users = []

    if streaminfo != {}:
        params = {'source': streaminfo["source"], '_requesting':'users', 
                'protocol': streaminfo["protocol"], 
                'direction': streaminfo['dir']}
        # Should return empty list for lpi-users
        for user in NNTSCConn.get_selection_options(collection, params):
            if user == streaminfo["user"]:
                users.append({"name":user, "selected":True})
            else:
                users.append({"name":user, "selected":False})
    
    dduser = {'ddlabel': 'User: ', 'ddidentifier': "drpUser", 'ddcollection':'lpi', 'dditems':users, 'disabled':False}
    return dduser

def lpi_protocol_dropdown(collection, streaminfo):
    protos = []
    for proto in NNTSCConn.get_selection_options(collection, {'_requesting':'protocols'}):
        if streaminfo != {} and proto == streaminfo["protocol"]:
            protos.append({"name": proto, "selected": True})
        else:
            protos.append({"name": proto, "selected": False})

    ddproto = {'ddlabel': 'Protocol: ', 'ddidentifier': "drpProtocol", 'ddcollection':'lpi', 'dditems':protos, 'disabled':False}

    return ddproto

def lpi_direction_dropdown(collection, streaminfo):
    dirs = []
    for d in NNTSCConn.get_selection_options(collection, {'_requesting':'directions'}):
        if streaminfo != {} and d == streaminfo["dir"]:
            dirs.append({"name": d, "selected": True})
        else:
            dirs.append({"name": d, "selected": False})

    dddir = {'ddlabel': 'Direction: ', 'ddidentifier': "drpDirection", 'ddcollection':'lpi', 'dditems':dirs, 'disabled':False}

    return dddir

def lpi_metric_dropdown(collection, streaminfo):
    ddmetric = {'ddlabel': 'Metric: ', 'ddidentifier': "drpMetric", 'ddcollection':'lpi', 'dditems':[], 'disabled':False}

    if collection == "lpi-bytes":
        ddmetric['dditems'].append({'name':'bytes', 'selected':True})
    else:
        ddmetric['dditems'].append({'name':'bytes', 'selected':False})
    
    if collection == "lpi-packets":
        ddmetric['dditems'].append({'name':'packets', 'selected':True})
    else:
        ddmetric['dditems'].append({'name':'packets', 'selected':False})

    if collection == "lpi-flows":
        if streaminfo != {} and streaminfo['metric'] == "peak":
            ddmetric['dditems'].append({'name':'peak flows', 'selected':True})
            ddmetric['dditems'].append({'name':'new flows', 'selected':False})
        else:
            ddmetric['dditems'].append({'name':'peak flows', 'selected':False})
            ddmetric['dditems'].append({'name':'new flows', 'selected':True})
    else:
        ddmetric['dditems'].append({'name':'peak flows', 'selected':False})
        ddmetric['dditems'].append({'name':'new flows', 'selected':False})

    if collection == "lpi-users":
        if streaminfo != {} and streaminfo['metric'] == "active":
            ddmetric['dditems'].append({'name':'active users', 'selected':True})
            ddmetric['dditems'].append({'name':'observed users', 'selected':False})
        else:
            ddmetric['dditems'].append({'name':'active users', 'selected':False})
            ddmetric['dditems'].append({'name':'observed users', 'selected':True})
    else:
        ddmetric['dditems'].append({'name':'active users', 'selected':False})
        ddmetric['dditems'].append({'name':'observed users', 'selected':False})


    return ddmetric

def lpi_graph(url):

    page_renderer = get_renderer("../templates/graph.pt")
    dropdowns = []

    if len(url) > 1:
        stream = int(url[1])
        streaminfo = NNTSCConn.get_stream_info(stream)
    else:
        stream = -1
        streaminfo = {}
 
    title = "ampweb2 - Libprotoident Graphs"

    ddmetric = lpi_metric_dropdown(url[0], streaminfo)
    dropdowns.append(ddmetric)

    ddsrc = lpi_source_dropdown(url[0], streaminfo)
    dropdowns.append(ddsrc)

    ddproto = lpi_protocol_dropdown(url[0], streaminfo)
    dropdowns.append(ddproto)

    if url[0] != "lpi-users":
        dddir = lpi_direction_dropdown(url[0], streaminfo)
        dropdowns.append(dddir)

    if url[0] != "lpi-users":
        dduser = lpi_user_dropdown(url[0], streaminfo)
        if stream == -1:
            dduser['disabled'] = True
        dropdowns.append(dduser)


    if url[0] == "lpi-users":
        dropdown_js = "dropdown_lpiuser.js"
    else:
        dropdown_js = "dropdown_lpibasic.js"


    startgraph = generateStartScript("changeGraph", url[3:5], url[0])
    body = page_renderer.implementation().macros['body']
    lpi_scripts = [
        "nntscgraph.js",
        "dropdown.js",
        dropdown_js,
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
            "dropdowns":dropdowns,
            "startgraph": startgraph,
           }

def muninbytes_graph(url):

    dropdowns = []
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
    
    ddswitch = {'ddlabel': 'Switch: ', 'ddidentifier': "drpSwitch", 'ddcollection':'rrd-muninbytes', 'dditems':switches, 'disabled':False}
   
    dropdowns.append(ddswitch) 
        
    if enableInterface and streaminfo != {}:
        params = {'switch': streaminfo["switch"]}
        for iface in NNTSCConn.get_selection_options(url[0], params):
            if iface == streaminfo["interfacelabel"]:
                interfaces.append({"name":iface, "selected":True})
            else:
                interfaces.append({"name":iface, "selected":False})

    ddinterface = {'ddlabel': 'Interface: ', 'ddidentifier': 'drpInterface', 'ddcollection':'rrd-muninbytes', 'dditems':interfaces, 'disabled': not enableInterface}
    dropdowns.append(ddinterface)

    if enableDirection and streaminfo != {}:
        params = {'switch': streaminfo["switch"], 'interface':streaminfo["interfacelabel"]}
        for d in NNTSCConn.get_selection_options(url[0], params):
            if d == streaminfo["direction"]:
                directions.append({"name":d, "selected":True})
            else:
                directions.append({"name":d, "selected":False})
    
    dddir = {'ddlabel': 'Direction: ', 'ddidentifier': 'drpDirection', 'ddcollection':'rrd-muninbytes', 'dditems':directions, 'disabled': not enableDirection}
    dropdowns.append(dddir)


    startgraph = generateStartScript("changeGraph", url[3:5], "rrd-muninbytes")
    page_renderer = get_renderer("../templates/graph.pt")
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
            "startgraph": startgraph,
            "dropdowns": dropdowns
           }

def ampicmp_graph(url):
    sources = []
    destinations = []
    sizes = []
    dropdowns = []
    enablesizes = False
    enabledest = False

    if len(url) > 1:
        stream = int(url[1])
        streaminfo = NNTSCConn.get_stream_info(stream)
        enabledest = True
        enablesizes = True
    else:
        stream = -1
        streaminfo = {}
    
    title = "ampweb2 - AMP ICMP Graphs"

    for source in NNTSCConn.get_selection_options(url[0], 
            {'_requesting':'sources'}):
        if streaminfo != {} and source == streaminfo['source']:
            sources.append({"name": source, "selected": True})
        else:
            sources.append({"name": source, "selected": False})
    ddSource = {'ddlabel': 'Source: ', 'ddidentifier':'drpSource', 'ddcollection':'amp-icmp', 'dditems':sources, 'disabled':False}
    dropdowns.append(ddSource)

    if enabledest and streaminfo != {}:
        params = {'source': streaminfo["source"], '_requesting':'destinations'} 
        for destination in NNTSCConn.get_selection_options(url[0], params):
            if destination == streaminfo["destination"]:
                destinations.append({"name": destination, "selected": True})
            else:
                destinations.append({"name": destination, "selected": False})        

    dddest = {'ddlabel': 'Target: ', 'ddidentifier':'drpDest', 'ddcollection':'amp-icmp', 'dditems':destinations, 'disabled':not enabledest}
    dropdowns.append(dddest)

    if enablesizes and streaminfo != {}:
        params = {'source': streaminfo["source"], '_requesting':'packet_sizes', 'destination': streaminfo["destination"]} 
        for size in NNTSCConn.get_selection_options(url[0], params):
            if size == streaminfo["packet_size"]:
                sizes.append({"name": size, "selected": True})
            else:
                sizes.append({"name": size, "selected": False})        

    ddsize = {'ddlabel': 'Packet Size: ', 'ddidentifier':'drpSize', 'ddcollection':'amp-icmp', 'dditems':sizes, 'disabled':not enablesizes}
    dropdowns.append(ddsize)

    startgraph = generateStartScript("changeGraph", url[3:5], "amp-icmp")
    page_renderer = get_renderer("../templates/graph.pt")
    body = page_renderer.implementation().macros['body']
    ampicmp_scripts = [
        "nntscgraph.js",
        "dropdown.js",
        "dropdown_ampicmp.js",
        "envision.min.js",
        "util.js",
        "graphtemplates/basicts.js",
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
            "scripts": ampicmp_scripts,
            "startgraph": startgraph,
            "dropdowns":dropdowns,
           }

def smokeping_graph(url):
    # Variables to return
    sources = []
    destinations = []
    enabledest = False
    dropdowns = []

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
    
    ddswitch = {'ddlabel': 'Display from: ', 'ddidentifier': "drpSource", 'ddcollection':'rrd-smokeping', 'dditems':sources, 'disabled':False}
    dropdowns.append(ddswitch)

    if enabledest and streaminfo != {}:
        params = {'source': streaminfo["source"]}    
        for destination in NNTSCConn.get_selection_options(url[0], params):
            if destination == streaminfo["host"]:
                destinations.append({"name": destination, "selected": True})
            else:
                destinations.append({"name": destination, "selected": False})        

    dddest = {'ddlabel': 'to: ', 'ddidentifier':'drpDest', 'ddcollection':'rrd-smokeping', 'dditems':destinations, 'disabled':not enabledest}
    dropdowns.append(dddest)

    # Is a graph selected?, If so find the possible start/end times
    startgraph = generateStartScript("changeGraph", url[3:5], "rrd-smokeping")
    page_renderer = get_renderer("../templates/graph.pt")
    body = page_renderer.implementation().macros['body']
    smokeping_scripts = [
        "nntscgraph.js",
        "dropdown.js",
        "dropdown_smokeping.js",
        "envision.min.js",
        "util.js",
        "graphtemplates/basicts.js",
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
            "startgraph": startgraph,
            "dropdowns":dropdowns,
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
    elif url[0][0:4] == "lpi-":
        return lpi_graph(url)
    elif url[0] == "amp-icmp":
        return ampicmp_graph(url) 
    else:
        pass


# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
