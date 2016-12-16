from pyramid.view import view_config
from ampweb.views.common import initAmpy

@view_config(
    route_name="rating",
    renderer="../templates/modals/eventrating.pt",
)
def rating(request):
    urlparts = request.matchdict['params']
    if len(urlparts) != 2:
        return {}

    ampy = initAmpy(request)
    if ampy is None:
        print "Failed to start ampy while creating event rating modal"
        return None

    eventid = urlparts[0]
    streamid = urlparts[1]

    # TODO grab some descriptive information that we can display about
    # this modal

    evdeets = ampy.get_single_event(streamid, eventid)

    request.override_renderer = "../templates/modals/eventrating.pt"

    return {
        "title": "Provide Feedback on this Event",
        "evstreamlabel": "TODO",
        "description": evdeets['description'],
        "eventid": eventid,
        "streamid": streamid,
    }




# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
