from ampweb.views.common import createGraphClass, graphStyleToCollection, \
    collectionToGraphStyle
from time import time

DETAILPOINTS = 200
MAX_RAW_HISTORY = 60 * 60 * 24 * 32
DEFAULT_RAW_HISTORY = 60 * 60 * 24

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
        print "Error while fetching legend for %s view %s" % (metric, viewid)
        return None

    return groups

def destinations(ampy, request):
    urlparts = request_to_urlparts(request)
    metric = urlparts[0]

    params = request.GET
    if 'term' not in params:
        params['term'] = ""
    if 'page' not in params:
        params['page'] = "1"
    graphclass = createGraphClass(metric)
    if graphclass == None:
        return []

    selopts = graphclass.get_selection_options(ampy, urlparts[1:],
            params['term'], params['page'])

    #selopts = ampy.get_selection_options(metric, urlparts[1:], params['term'], params['page'])
    #if selopts is None:
    #    print "Error while fetching selection options for collection %s" \
    #            % (metric)

    return selopts

def request_nntsc_data(ampy, metric, params, minbinsize):
    #streams = map(int, params[0].split("-"))
    detail = params[0]
    view = params[1] # a string makes a nice view id too, i think
    start = int(params[2])
    end = int(params[3])
    binsize = None

    if len(params) >= 5:
        binsize = int(params[4])
    else:
        binsize = minbinsize

    data = ampy.get_historic_data(metric, view, start, end, detail, binsize)
    if data is None:
        print "Error while fetching historic data for view %s" % (view)

    return data

# TODO do json and csv responses... maybe return dict and have a function
# above this that will return as json or strip keys and turn values into csv
def raw(ampy, request):
    urlparts = request_to_urlparts(request)
    optlen = len(urlparts)
    if optlen < 1:
        return {"collection": ampy.get_collections()}

    metric = urlparts[0]
    graphclass = createGraphClass(metric)
    if graphclass == None:
        return "unknown graph class"

    if optlen < 2:
        # return all the valid sources
        return destinations(ampy, request)

    detail = "raw"
    binsize = -1

    # view here is either a view id or the name of the source site.
    # A view id is made up of digits, a name has other printable characters.
    view = urlparts[1]
    now = int(time())

    if view[0].isdigit():
        # url has a metric and a view id, we can query these directly
        # start and end are optional
        start, end = list(urlparts[2:]) + ([None] * (4-len(urlparts)))
    else:
        # url has a metric and a source, still needs a destination
        if optlen < 3:
            # if there is only one destination then it also returns all the
            # other options. That's useful for the modals but makes the
            # behaviour of this API inconsistent, so just show destination.
            options = destinations(ampy, request)
            return {"destination": options["destination"]}

        # If the destination is a url then it would have been specified with
        # pipes instead of slashes, so fix that (CGI/WSGI are stupid and
        # unencode everything - it thinks %2F is a literal slash...). It is
        # possible that the apache directive "AllowEncodedSlashes NoDecode"
        # would fix this, but that doesn't help running it with pserve
        present = {"source": str(urlparts[1]), "destination": str(urlparts[2].replace("|", "/"))}

        # confirmed is a list in order of parameters that are known to be
        # good, because get_selection_options() expects an ordered list
        confirmed = present.values()

        # build a dictionary of all the parameters that are present in the url.
        # If there are duplicates then just use the last one.
        for key,value in request.GET.items():
            present[str(key)] = str(value)

        # get a list of the next required options after source and destination
        # that still need values
        options = ampy.get_selection_options(metric, confirmed)
        if options is None:
            return "bad source/destination pair"

        # get the full list of all the required options, in order
        fullopts = ampy.get_full_selection_options(metric)

        # for each key in order, try to satisfy it with either a user
        # parameter or a default value. Skip source and dest as we know
        # they are required (but not necessarily valid)
        for key in fullopts[2:]:
            # if the user specified the parameter then try to use it
            if key in present and key in options:
                try:
                    # try to match the value against a string or an int version
                    # because there is no easy way to tell what it should be
                    if (present[key] in options[key] or int(present[key]) in options[key]):
                        # the user value was good, add it to confirmed list
                        confirmed.append(present[key])
                    else:
                        # the user value was invalid, return list of valid ones
                        return options
                except ValueError:
                    # we tried to check a string value as both a string and an
                    # integer and still didn't find it - it's not a valid value
                    return options
            elif key not in present and key in options and len(options[key]) == 1:
                # the user didn't give a value, but there is only one
                # valid value anyway - lets assume that is what they want
                confirmed.append(options[key][0])
            else:
                # the user hasn't specified this key and we can't give it a
                # default value - let them know what they need to provide
                return options
            # using the new parameter, query what the next one should be
            options = ampy.get_selection_options(metric, confirmed)

        # if there are any options left then the user needs to supply more
        # parameters. Let them know what the next missing one is
        if options is not None and len(options) > 0:
            return options

        # using a dictionary here means the test will parse things itself
        # rather than having to provide the perfect list in order and
        # formatted unusually (e.g. DNS test flags)
        view = ampy.modify_view(metric, 0, "add", dict(zip(fullopts, confirmed)))

        # start and end are optional
        start, end = list(urlparts[3:]) + ([None] * (5-len(urlparts)))

        # all the latency measures fall under the amp-latency metric
        if metric in ["amp-icmp", "amp-tcpping", "amp-dns"]:
            metric = "amp-latency"

    # default to starting one day ago
    if start is None or start < now - MAX_RAW_HISTORY:
        start = now - DEFAULT_RAW_HISTORY
    # and returning one day worth of data
    if end is None or end < start:
        end = int(start) + DEFAULT_RAW_HISTORY

    descr,data = ampy.get_historic_data(metric, view, int(start), int(end),
            detail, binsize)

    if data == None:
        return "no data for query"
    return graphclass.format_raw_data(descr, data, int(start), int(end))


def graph(ampy, request):
    """ Internal graph specific API """
    urlparts = request_to_urlparts(request)
    if len(urlparts) < 2:
        return [[0], [0]]

    metric = urlparts[0]
    graphclass = createGraphClass(metric)
    if graphclass == None:
        return [[0], [0]]

    minbinsize = graphclass.get_minimum_binsize(request)
    data = request_nntsc_data(ampy, urlparts[0], urlparts[1:], minbinsize)

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
        viewstyle = urlparts[3]
        options = urlparts[4:]
    elif action == "del":
        collection = urlparts[1]
        viewstyle = urlparts[1]
        oldview = urlparts[2]
        options = [urlparts[3]]
    else:
        return
    # return the id of the new view, creating it if required
    newview = ampy.modify_view(collection, oldview, viewstyle, action, options)
    if newview == None:
        print "Error while modifying view %s for collection %s" % \
                (oldview, collection)
        print "Action was '%s'" % (action)
        return oldview

    return newview

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
