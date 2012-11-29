from pyramid.response import Response
from pyramid.renderers import get_renderer
from pyramid.view import view_config

def global_header():
    renderer = get_renderer("../templates/global.pt")
    header = renderer.implementation().macros['header']
    return header

@view_config(renderer='../templates/home.pt', route_name='home')
def home(request):
    return {"header": global_header()}
