from pyramid.view import view_config
from pyramid.security import forget
from pyramid.httpexceptions import HTTPFound

@view_config(route_name='logout')
def logout(request):
    headers = forget(request)
    return HTTPFound(location = request.resource_url(request.context),
                     headers = headers)
