from pyramid.view import view_config
from pyramid.httpexceptions import *
#from ampweb.views.TraceMap import return_JSON
import ampweb.views.apifunctions.viewapi as viewapi
import ampweb.views.apifunctions.matrixapi as matrixapi
import ampweb.views.apifunctions.eventapi as eventapi
import ampweb.views.apifunctions.tooltipapi as tooltipapi
from ampweb.views.common import initAmpy


@view_config(
    route_name="api",
    renderer="json",
    permission="read",
)
def api(request):
    """ Determine which API a request is being made against and fetch data """
    urlparts = request.matchdict['params']

    # Dictionary of possible internal API methods we support
    apidict = {
        #'_tracemap': tracemap,
    }

    ampyapidict = {
        '_view': viewapi.graph,
        '_legend': viewapi.legend,
        '_createview': viewapi.create,
        '_destinations': viewapi.destinations,
        '_event': eventapi.event,
        '_matrix': matrixapi.matrix,
        '_matrix_axis': matrixapi.matrix_axis,
        '_matrix_mesh': matrixapi.matrix_mesh,
        '_tooltip': tooltipapi.tooltip,
        '_validatetab': viewapi.validatetab,
    }

    # /api/_* are private APIs
    # /api/* is the public APIs that looks similar to the old one
    if len(urlparts) > 0:
        interface = urlparts[0]
        if interface.startswith("_"):
            if interface in ampyapidict:

                ampy = initAmpy(request)
                if ampy == None:
                    print "Failed to start ampy!"
                    return None

                result = ampyapidict[interface](ampy, request)

                # Allow responses for certain API calls to be cached for 2 mins
                if request.registry.settings['prevent_http_cache'] is not True:
                    if interface in ['_view']:
                        request.response.cache_expires = 120

                return result
            elif interface in apidict:
                return apidict[interface](request)
            else:
                return {"error": "Unsupported API method"}
    return public(request)

def public(request):
    """ Public API """
    urlparts = request.matchdict['params']

    publicapi = {
        'csv': viewapi.raw,
        'json': viewapi.raw,
    }

    if len(urlparts) > 0:
        interface = urlparts[0]

        if interface in publicapi:
            ampy = initAmpy(request)
            if ampy == None:
                print "Failed to start ampy!"
                return None
            result = publicapi[interface](ampy, request)
            request.response.cache_expires = 120

            if interface == "json":
                return result

            if interface == "csv":
                request.override_renderer = 'string'

                if result is None:
                    # TODO improve error reporting
                    return "# Error"

                resultstr = ""
                for line in result:
                    if "metadata" in line:
                        # report data for a defined stream
                        resultstr += "# " + ",".join(str(k) for k,v in line["metadata"])
                        resultstr += "," + ",".join(line["datafields"]) + "\n"
                        metadata = ",".join(str(v) for k,v in line["metadata"])
                        for item in line["data"]:
                            linedata = []
                            for field in line["datafields"]:
                                linedata.append(str(item[field]))
                            resultstr += metadata + "," + ",".join(linedata) + "\n"
                    else:
                        # report stream properties that the user needs to set
                        resultstr += "# %s\n" % line
                        for item in result[line]:
                            resultstr += str(item) + "\n"
                return resultstr;

    # TODO print nice friendly API info page
    return {"error": "Unsupported API method"}

#def tracemap(request):
#    urlparts = request.matchdict['params'][1:]
#
#    return return_JSON(urlparts[0], urlparts[1])

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
