from pyramid.view import view_config
from pyramid.renderers import get_renderer

@view_config(
    route_name="changetime",
    renderer="../templates/modals/timemodal.pt",
    # depending on the auth.publicdata configuration option then this will
    # either be open to the public or require the "read" permission
    # permission=
)

def changetime(request):
    urlparts = request.matchdict['params']
    request.override_renderer = "../templates/modals/timeselect.pt"


    return {
        "title": "Change View Time Period"
    }


# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
