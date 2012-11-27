from pyramid.response import Response
from pyramid.view import view_config

@view_config(route_name='home', renderer='../templates/global.pt')
def home(request):
    return {}
