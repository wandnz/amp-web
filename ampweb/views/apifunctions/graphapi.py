from ampweb.views.collections.rrdsmokeping import RRDSmokepingGraph
from ampweb.views.collections.rrdmuninbytes import RRDMuninbytesGraph
from ampweb.views.collections.ampicmp import AmpIcmpGraph
from ampweb.views.collections.amptraceroute import AmpTracerouteGraph
from ampweb.views.collections.lpi import LPIBytesGraph, LPIUsersGraph
from ampweb.views.collections.lpi import LPIFlowsGraph, LPIPacketsGraph

MAXDATAPOINTS = 300

def request_to_urlparts(request):
    return request.matchdict['params'][1:]

def createGraphClass(colname):
    graphclass = None

    if colname == "rrd-smokeping":
        graphclass = RRDSmokepingGraph()
    elif colname == "rrd-muninbytes":
        graphclass = RRDMuninbytesGraph()
    elif colname == "lpi-bytes":
        graphclass = LPIBytesGraph()
    elif colname == "amp-icmp":
        graphclass = AmpIcmpGraph()
    elif colname == "amp-traceroute":
        graphclass = AmpTracerouteGraph()
    elif colname == "lpi-flows":
        graphclass = LPIFlowsGraph()
    elif colname == "lpi-packets":
        graphclass = LPIPacketsGraph()
    elif colname == "lpi-users":
        graphclass = LPIUsersGraph()

    return graphclass

def selectables(NNTSCConn, request):
    urlparts = request_to_urlparts(request)
    metric = urlparts[0]

    if len(urlparts) > 1:
        stream = int(urlparts[1])
    else:
        stream = -1;

    graphclass = createGraphClass(metric)
    if graphclass == None:
        return []

    NNTSCConn.create_parser(metric)
    if stream != -1:
        streaminfo = NNTSCConn.get_stream_info(metric, stream)
    else:
        streaminfo = {}

    selects = graphclass.get_dropdowns(NNTSCConn, stream, streaminfo)

    return selects

def destinations(NNTSCConn, request):
    urlparts = request_to_urlparts(request)
    metric = urlparts[0]

    NNTSCConn.create_parser(metric)
    graphclass = createGraphClass(metric)
    if graphclass == None:
        return []

    params = graphclass.get_destination_parameters(urlparts)
    return NNTSCConn.get_selection_options(metric, params)

def streaminfo(NNTSCConn, request):
    urlparts = request_to_urlparts(request)
    metric = urlparts[0]
    NNTSCConn.create_parser(metric)
   
    results = []
    
    for s in urlparts[1:]:
        stream = int(s)
        info = NNTSCConn.get_stream_info(metric, stream)
        if info != {}:
            results.append(info)

    return results

def streams(NNTSCConn, request):
    urlparts = request_to_urlparts(request)
    metric = urlparts[0]

    NNTSCConn.create_parser(metric)
    graphclass = createGraphClass(metric)
    if graphclass == None:
        return -1
    params = graphclass.get_stream_parameters(urlparts)
    return NNTSCConn.get_stream_id(metric, params)

def request_nntsc_data(NNTSCConn, metric, params):
    streams = map(int, params[0].split("-"))
    start = int(params[1])
    end = int(params[2])

    if len(params) >= 4:
        binsize = int(params[3])
    else:
        # TODO Maybe replace this with some smart math that will increase
        # the binsize exponentially. Less possible binsizes is good, as this
        # means we will get more cache hits, but we don't want to lose
        # useful detail on the graphs
        minbin = int((end - start) / MAXDATAPOINTS)
        if minbin <= 30:
            binsize = 30
        elif minbin <= 60:
            binsize = 60
        elif minbin <= 120:
            binsize = 120
        else:
            binsize = ((minbin / 600) + 1) * 600

    detail = "full"

    NNTSCConn.create_parser(metric)

    if metric == "amp-icmp":
        data = {}
        addresses = {}
        for stream_id in streams:
            info = NNTSCConn.get_stream_info("amp-icmp", stream_id)
            if len(info) < 1:
                continue
            if info["address"].find(":") > 0:
                hax = info["address"][:info["address"].find(":", 11)]
            else:
                hax = info["address"][:info["address"].rfind(".")]
            if hax not in addresses:
                addresses[hax] = []
            addresses[hax].append(stream_id)
        for address,stream_ids in addresses.iteritems():
            print "graphapi.request_nntsc_data() address", address
            data[address] = NNTSCConn.get_period_data(metric, stream_ids,
                    start, end, binsize, detail)
    else:
        data = NNTSCConn.get_period_data(metric, streams, start, end, binsize,
                detail)
    return data

def graph(NNTSCConn, request):
    """ Internal graph specific API """
    urlparts = request_to_urlparts(request)
    if len(urlparts) < 2:
        return [[0], [0]]

    metric = urlparts[0]
    graphclass = createGraphClass(metric)
    if graphclass == None:
        return [[0],[0]]

    NNTSCConn.create_parser(metric)

    data = request_nntsc_data(NNTSCConn, urlparts[0], urlparts[1:])

    # Unfortunately, we still need to mess around with the data and put it
    # in exactly the right format for our graphs

    return graphclass.format_data(NNTSCConn, data)

def relatedstreams(NNTSCConn, request):
    urlparts = request_to_urlparts(request)

    if len(urlparts) < 2:
        return []

    col = urlparts[0]
    streams = int(urlparts[1])

    NNTSCConn.create_parser(col)
    related = NNTSCConn.get_related_streams(col, urlparts[1:])

    keys = related.keys()
    keys.sort()
    retlist = []
    for k in keys:
        retlist.append(related[k])
    return retlist

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
