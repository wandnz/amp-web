from pyramid.view import view_config
from pyramid.renderers import get_renderer

templates = {
    "amp-icmp": "amplatency.pt",
    "amp-traceroute-hops": "amptraceroute.pt",
    "amp-latency": "amplatency.pt",
    "amp-loss": "amplatency.pt",
    "amp-http": "amphttp.pt",
    "amp-httppagesize": "amphttp.pt",
    "amp-dns": "amplatency.pt",
    "amp-tcpping": "amplatency.pt",
    "amp-throughput": "ampthroughput.pt",
    "amp-astraceroute": "amptracerouterainbow.pt",
    "amp-traceroute": "amptracerouterainbow.pt",
    "amp-udpstream": "ampudpstream.pt",
    "rrd-muninbytes": "muninbytes.pt",
    "rrd-smokeping": "smokeping.pt",
    "lpi-users": "lpiusers.pt",
    "lpi-flows": "lpiflows.pt",
    "lpi-bytes": "lpibytes.pt",
    "lpi-packets": "lpibytes.pt",
    "ceilo-cpu": "ceilocpu.pt",
    "ceilo-disk": "ceilodisk.pt",
    "ceilo-net": "ceilonet.pt",
}


@view_config(
    route_name="modal",
    renderer="../templates/modals/modal.pt",
    # depending on the auth.publicdata configuration option then this will
    # either be open to the public or require the "read" permission
    # permission=
)
def modal(request):
    """ Generate the content for the modal data series page """
    urlparts = request.matchdict['params']
    if len(urlparts) != 1:
        # TODO can we do anything sensible here?
        return {}

    collection = urlparts[0]
    if collection in templates:
        template = templates[collection]
    else:
        # TODO can we do anything sensible here?
        return {}

    page_renderer = get_renderer("../templates/modals/%s" % template)
    modal_body = page_renderer.implementation().macros["modal_body"]

    # should we only load the scripts when the modal is required?
    #modalscripts = [
    #    "modals/modal.js",
    #    "modals/ampicmp_modal.js",
    #]

    return {
            #"title": "Add new data series",
            "modal_body": modal_body,
            #"styles": None,
            #"scripts": modalscripts,
           }


# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
