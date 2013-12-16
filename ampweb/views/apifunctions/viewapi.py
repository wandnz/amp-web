from ampweb.views.collections.rrdsmokeping import RRDSmokepingGraph
from ampweb.views.collections.rrdmuninbytes import RRDMuninbytesGraph
from ampweb.views.collections.ampicmp import AmpIcmpGraph
from ampweb.views.collections.ampdns import AmpDnsGraph
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
    elif colname == "amp-dns":
        graphclass = AmpDnsGraph()

    return graphclass

def selectables(NNTSCConn, request):
    urlparts = request_to_urlparts(request)
    metric = urlparts[0]

    if len(urlparts) > 1:
        stream = int(urlparts[1])
    else:
        stream = -1

    graphclass = createGraphClass(metric)
    if graphclass == None:
        return []

    NNTSCConn.create_parser(metric)
    if stream != -1:
        info = NNTSCConn.get_stream_info(metric, stream)
    else:
        info = {}

    selects = graphclass.get_dropdowns(NNTSCConn, stream, info)

    return selects

def legend(NNTSCConn, request):
    urlparts = request_to_urlparts(request)
    metric = urlparts[0]

    NNTSCConn.create_parser(metric)
    graphclass = createGraphClass(metric)

    if graphclass == None:
        return []

    if len(urlparts) == 1:
        return []

    viewid = urlparts[1]

    groups = NNTSCConn.get_view_legend(metric, viewid)

    result = []
    for k,v in groups.iteritems():
        result.append(v)
        result[-1]['group_id'] = k

    return result

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
    #streams = map(int, params[0].split("-"))
    detail = params[0]
    view = params[1] # a string makes a nice view id too, i think
    start = int(params[2])
    end = int(params[3])

    if len(params) >= 5:
        binsize = int(params[4])
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

    NNTSCConn.create_parser(metric)
    data = NNTSCConn.get_period_view_data(metric, view, start, end, binsize,
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
        return [[0], [0]]

    NNTSCConn.create_parser(metric)

    data = request_nntsc_data(NNTSCConn, urlparts[0], urlparts[1:])

    # Unfortunately, we still need to mess around with the data and put it
    # in exactly the right format for our graphs

    return graphclass.format_data(data)

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

def create(NNTSCConn, request):
    urlparts = request_to_urlparts(request)
    # XXX what should we return if we get nothing useful?
    if len(urlparts) < 3:
        return

    action = urlparts[0]

    if action == "add":
        # not enough useful data, but we can at least return what looks like the
        # existing view id and redraw the same graph
        if len(urlparts) < 4:
            return urlparts[2]
        collection = urlparts[1]
        oldview = urlparts[2]
        options = urlparts[3:]
    elif action == "del":
        collection = None
        oldview = urlparts[1]
        options = [urlparts[2]]
    else:
        return
    # return the id of the new view, creating it if required
    return NNTSCConn.view.create_view(collection, oldview, action, options)

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
