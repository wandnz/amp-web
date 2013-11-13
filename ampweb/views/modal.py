from pyramid.view import view_config
from pyramid.renderers import get_renderer
from ampy import ampdb

@view_config(route_name="modal", renderer="../templates/modals/modal.pt")
def modal(request):
    """ Generate the content for the modal data series page """
    page_renderer = get_renderer("../templates/modals/ampicmp.pt")
    modal_body = page_renderer.implementation().macros["modal_body"]

    # should we only load the scripts when the modal is required?
    #modalscripts = [
    #    "modals/modal.js",
    #    "modals/ampicmp_modal.js",
    #]

    nntschost = request.registry.settings['ampweb.nntschost']
    nntscport = request.registry.settings['ampweb.nntscport']

    ampconfig = {}
    if 'ampweb.ampdbhost' in request.registry.settings:
        ampconfig['host'] = request.registry.settings['ampweb.ampdbhost']
    if 'ampweb.ampdbuser' in request.registry.settings:
        ampconfig['user'] = request.registry.settings['ampweb.ampdbuser']
    if 'ampweb.ampdbpwd' in request.registry.settings:
        ampconfig['pwd'] = request.registry.settings['ampweb.ampdbpwd']


    # sources is the only part of the form that we can prefill, everything
    # else depends on what is selected along the way
    NNTSCConn = ampdb.create_nntsc_engine(nntschost, nntscport, ampconfig)
    NNTSCConn.create_parser("amp-icmp")
    sources = NNTSCConn.get_selection_options("amp-icmp",
            {"_requesting": "sources"})

    return {
            #"title": "Add new data series",
            "modal_body": modal_body,
            #"styles": None,
            #"scripts": modalscripts,
            "sources": sources,
           }


# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
