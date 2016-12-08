import urllib
from pyramid.view import view_config


@view_config(
    route_name='config',
    renderer='../templates/config.txt',
    permission="yaml",
)
def fetch_amp_config(request):
    """ Generate the script to configure the amplet """

    request.response.content_type = "text/plain"

    return {
        "ampname": urllib.unquote(request.matchdict["name"]),
    }

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
