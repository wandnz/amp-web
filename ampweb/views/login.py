from pyramid.renderers import get_renderer
from pyramid.httpexceptions import HTTPFound
from ampweb.views.common import getBannerOptions

from pyramid.view import (
    view_config,
    forbidden_view_config,
    )

from pyramid.security import (
    remember,
    authenticated_userid,
    )

from ..security import USERS
from ..resources import Root

@view_config(
    route_name="login",
    renderer="../templates/skeleton.pt"
)
@forbidden_view_config(
    renderer="../templates/skeleton.pt"
)
def login(request):
    page_renderer = get_renderer("../templates/login.pt")
    body = page_renderer.implementation().macros["body"]

    banopts = getBannerOptions(request)

    if authenticated_userid(request):
        return HTTPFound(location = request.resource_url(request.context))

    self_url = request.resource_url(request.context, 'login')
    referrer = request.url
    if referrer == self_url:
        referrer = '/' # never use the login form itself as came_from
    came_from = request.params.get('came_from', referrer)

    errmessage = ''
    username = ''
    password = ''
    tos_accepted = ''

    if 'login.submitted' in request.params:
        tos_accepted = request.params.get('accepted')
        username = request.params.get('username')
        password = request.params.get('password')
        if username is not None and password is not None \
                and username in USERS and USERS.get(username) == password:
            if tos_accepted == "on":
                headers = remember(request, username)
                return HTTPFound(location = came_from, headers = headers)
            else:
                errmessage = 'Please accept Terms of Service before continuing'
        else:
            errmessage = 'Incorrect username or password'

    banopts = getBannerOptions(request)

    return {
            "title": "Login",
            "page": "login",
            "body": body,
            "styles": ["bootstrap.min.css"],
            "scripts": None,
            "logged_in": False,
            "errmessage": errmessage,
            "came_from": came_from,
            "username": username,
            "tos_accepted": tos_accepted,
            "show_dash": banopts['showdash'],
            "can_edit": False,
            "bannertitle": banopts['title'],
           }


# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
