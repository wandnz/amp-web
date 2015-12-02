from pyramid.renderers import get_renderer
from pyramid.view import view_config
from pyramid.httpexceptions import *
import calendar


@view_config(
    route_name='config',
    renderer='../templates/config.txt',
    permission="edit",
)
def fetch_amp_config(request):
    """ Generate the script to configure the amplet """

    urlparts = request.matchdict['params']

    if len(urlparts) == 0 or len(urlparts[0]) == 0:
        return HTTPClientError()

    ampname = urlparts[0]

    request.response.content_type = "text/plain"

    return {
        "ampname": ampname,
        "server": request.host.split(":")[0],
        "website": request.host,
    }

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
