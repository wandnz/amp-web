from pyramid.view import view_config
from pyramid.renderers import get_renderer
from pyramid.security import authenticated_userid
from ampweb.views.common import getCommonScripts, initAmpy, getBannerOptions
from ampweb.views.common import DEFAULT_EVENT_FILTER
import datetime
import time, json
from ampweb.views.eventparser import EventParser

DASHBOARD_EVENTS = 10

@view_config(
    route_name="dashboard",
    renderer="../templates/skeleton.pt",
    permission="read"
)
def dashboard(request):
    """ Generate the content for the basic overview dashboard page """
    page_renderer = get_renderer("../templates/dashboard.pt")
    body = page_renderer.implementation().macros["body"]

    # display events from the last 24 hours
    end = time.time()
    start = end - (60 * 60 * 24)

    banopts = getBannerOptions(request)
    ampy = initAmpy(request)
    if ampy is None:
        print "Unable to start ampy while generating event dashboard"
        return None

    userid = authenticated_userid(request)

    # Guests don't get to save a filter, they just start with the default.
    if userid and userid != 'guest':
        evfilterstring = ampy.get_event_filter(userid, "default")
        if evfilterstring is None:
            newfilter = json.dumps(DEFAULT_EVENT_FILTER)
            filteropts = DEFAULT_EVENT_FILTER
            if ampy.modify_event_filter("add", userid, "default", newfilter) is None:
                print "Unable to create a new event filter for %s" % (userid)
                return None
        else:
            filteropts = json.loads(evfilterstring['filter'])
    else:
        filteropts = DEFAULT_EVENT_FILTER

    data = ampy.get_event_groups(start, end)
    groups = []
    total_event_count = 0
    total_group_count = 0

    # count global event/group statistics
    if data is not None:
        ep = EventParser(ampy)

        # get extra information about the 10 most recent event groups
        groups, total_group_count, total_event_count = \
                ep.parse_event_groups(data, start, end)

    dashboard_scripts = getCommonScripts() + [
        "pages/dashboard.js",
        "eventgroups/events.js",
        "graphplugins/hit.js",
        "graphstyles/event_frequency.js",
    ]



    if filteropts['showlatencyincr']:
        latincrattrs = {'classx': 'btn btn-primary active', 'checked':True}
    else:
        latincrattrs = {'classx': 'btn btn-primary', 'checked': False}

    if filteropts['showlatencydecr']:
        latdecrattrs = {'classx': 'btn btn-primary active', 'checked':True}
    else:
        latdecrattrs = {'classx': 'btn btn-primary', 'checked': False}

    if filteropts['showlatencydecr']:
        routechangeattrs = {'classx': 'btn btn-primary active', 'checked':True}
    else:
        routechangeattrs = {'classx': 'btn btn-primary', 'checked': False}

    return {
            "title": "Event Dashboard",
            "page": "dashboard",
            "body": body,
            "styles": ['bootstrap.min.css', 'dashboard.css'],
            "scripts": dashboard_scripts,
            "logged_in": authenticated_userid(request),
            "show_dash": banopts['showdash'],
            "bannertitle": banopts['title'],
            "total_event_count": total_event_count,
            "total_group_count": total_group_count,
            "extra_groups": total_group_count - len(groups),
            "showcommon": filteropts['showcommon'],
            "max_event_count": filteropts['maxevents'],
            "asincludes": filteropts['asincludes'],
            "ashighlights": filteropts['ashighlights'],
            "asexcludes": filteropts['asexcludes'],
            "destincludes": filteropts['destincludes'],
            "desthighlights": filteropts['desthighlights'],
            "destexcludes": filteropts['destexcludes'],
            "srcincludes": filteropts['srcincludes'],
            "srchighlights": filteropts['srchighlights'],
            "srcexcludes": filteropts['srcexcludes'],
            "latincr_attrs": latincrattrs,
            "latdecr_attrs": latdecrattrs,
            "routechange_attrs": routechangeattrs

           }


# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
