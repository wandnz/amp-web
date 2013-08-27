from pyramid.view import view_config
from ampy import ampdb
from ampweb.views.TraceMap import return_JSON

import ampweb.views.apifunctions.graphapi as graphapi
import ampweb.views.apifunctions.matrixapi as matrixapi
import ampweb.views.apifunctions.eventapi as eventapi
import ampweb.views.apifunctions.tooltipapi as tooltipapi

from threading import Lock

NNTSCConn = None
NNTSCLock = Lock()

def connect_nntsc(request):
    global NNTSCConn
    ampconfig = {}
    nntschost = request.registry.settings['ampweb.nntschost']
    nntscport = request.registry.settings['ampweb.nntscport']

    if 'ampweb.ampdbhost' in request.registry.settings:
        ampconfig['host'] = request.registry.settings['ampweb.ampdbhost']
    if 'ampweb.ampdbuser' in request.registry.settings:
        ampconfig['user'] = request.registry.settings['ampweb.ampdbuser']
    if 'ampweb.ampdbpwd' in request.registry.settings:
        ampconfig['pwd'] = request.registry.settings['ampweb.ampdbpwd']

    NNTSCConn = ampdb.create_nntsc_engine(nntschost, nntscport, ampconfig)


@view_config(route_name='api', renderer='json')
def api(request):
    """ Determine which API a request is being made against and fetch data """
    urlparts = request.matchdict['params']

    # Dictionary of possible internal API methods we support
    apidict = {
        '_tracemap': tracemap,
        '_event': eventapi.event,
    }

    nntscapidict = {
        '_graph': graphapi.graph,
        '_destinations': graphapi.destinations,
        '_matrix': matrixapi.matrix,
        '_matrix_axis': matrixapi.matrix_axis,
        '_relatedstreams': graphapi.relatedstreams,
        '_selectables': graphapi.selectables,
        '_streams': graphapi.streams,
        '_streaminfo': graphapi.streaminfo,
        '_tooltip': tooltipapi.tooltip,
    }

    # /api/_* are private APIs
    # /api/* is the public APIs that looks similar to the old one
    if len(urlparts) > 0:
        interface = urlparts[0]
        if interface.startswith("_"):
            if interface in nntscapidict:

                # API requests are asynchronous so we need to be careful
                # about avoiding race conditions on the NNTSC connection
                NNTSCLock.acquire()
                if NNTSCConn == None:
                    connect_nntsc(request);
                NNTSCLock.release()

                result = nntscapidict[interface](NNTSCConn, request)
                return result
            elif interface in apidict:
                return apidict[interface](request)
            else:
                return {"error": "Unsupported API method"}
    return public(request)

def public(request):
    """ Public API """
    urlparts = request.matchdict['params']

    source = None
    dest = None
    test = None
    options = None
    start = None
    end = None
    binsize = 60
    response = {}

    # What type of response is it
    rtype = {0 : "sites",
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
    except IndexError:
        pass

    db = ampdb.create()
    try:
        data = db.get(source, dest, test, options, start, end, binsize)
    except:
        return {"error": "Incorrect number of arguments"}

    # TODO check memory usage of this if a large amount of data is fetched
    # at once. Can we stream this back rather than giving it all in one go?
    response[rtype[len(urlparts)]] = []
    for d in data:
        response[rtype[len(urlparts)]].append(d)
    return {"response": response}

def tracemap(request):
    urlparts = request.matchdict['params'][1:]

    return return_JSON(urlparts[0], urlparts[1])

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
