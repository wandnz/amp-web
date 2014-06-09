from ampweb.views.common import createGraphClass, graphStyleToCollection
from ampweb.views.collections.rrdsmokeping import RRDSmokepingGraph
from ampweb.views.collections.rrdmuninbytes import RRDMuninbytesGraph
from ampweb.views.collections.ampicmp import AmpIcmpGraph
from ampweb.views.collections.ampdns import AmpDnsGraph
from ampweb.views.collections.amptraceroute import AmpTracerouteGraph
from ampweb.views.collections.lpi import LPIBytesGraph, LPIUsersGraph
from ampweb.views.collections.lpi import LPIFlowsGraph, LPIPacketsGraph

DETAILPOINTS = 200

def request_to_urlparts(request):
    return request.matchdict['params'][1:]

def validatetab(ampy, request):
    urlparts = request_to_urlparts(request)
    if len(urlparts) < 4:
        return []

    basecol = urlparts[0]
    view = urlparts[1]

    i = 2

    results = []
    seen = {}
    while (i < len(urlparts)):
        tabcol = graphStyleToCollection(urlparts[i])

        if tabcol in seen:
            isvalid = seen[tabcol]
        else:
            isvalid = ampy.test_graphtab_view(basecol, tabcol, view)
            if isvalid is None:
                print "Error while evaluating graph tab for %s" % (tabcol)
                return None

            seen[tabcol] = isvalid

        if isvalid:
            results.append(1)
        else:
            results.append(0)

        i += 1

    return results

def legend(ampy, request):
    urlparts = request_to_urlparts(request)
    metric = urlparts[0]
    graphclass = createGraphClass(metric)

    if graphclass == None:
        return []

    if len(urlparts) == 1:
        return []

    viewid = urlparts[1]

    groups = ampy.get_view_legend(metric, viewid)
    if groups is None:
        print "Error while fetching legend for %s view %s" % (metric, view)
        return None

    return groups

def destinations(ampy, request):
    urlparts = request_to_urlparts(request)
    metric = urlparts[0]

    graphclass = createGraphClass(metric)
    if graphclass == None:
        return []

    selopts = ampy.get_selection_options(metric, urlparts[1:])
    if selopts is None:
        print "Error while fetching selection options for collection %s" \
                % (metric)

    return selopts

def request_nntsc_data(ampy, metric, params):
    #streams = map(int, params[0].split("-"))
    detail = params[0]
    view = params[1] # a string makes a nice view id too, i think
    start = int(params[2])
    end = int(params[3])
    binsize = None

    if len(params) >= 5:
        binsize = int(params[4])

    data = ampy.get_historic_data(metric, view, start, end, detail, binsize)
    if data is None:
        print "Error while fetching historic data for view %s" % (view)

    return data


def graph(ampy, request):
    """ Internal graph specific API """
    urlparts = request_to_urlparts(request)
    if len(urlparts) < 2:
        return [[0], [0]]

    metric = urlparts[0]
    graphclass = createGraphClass(metric)
    if graphclass == None:
        return [[0], [0]]

    data = request_nntsc_data(ampy, urlparts[0], urlparts[1:])

    # Unfortunately, we still need to mess around with the data and put it
    # in exactly the right format for our graphs
    if data == None:
        return [[0], [0]]

    return graphclass.format_data(data)

def create(ampy, request):
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
        collection = urlparts[1]
        oldview = urlparts[2]
        options = [urlparts[3]]
    else:
        return
    # return the id of the new view, creating it if required
    newview = ampy.modify_view(collection, oldview, action, options)
    if newview == None:
        print "Error while modifying view %s for collection %s" % \
                (oldview, collection)
        print "Action was '%s'" % (action)
        return oldview

    return newview

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
