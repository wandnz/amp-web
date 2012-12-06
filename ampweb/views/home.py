from pyramid.response import Response
from pyramid.renderers import get_renderer
from pyramid.view import view_config

@view_config(renderer='../templates/skeleton.pt', route_name='home')
def home(request):
    page_renderer = get_renderer("../templates/home.pt")
    body = page_renderer.implementation().macros['body']
    return {
        "title": "Hello World", 
        "body": body,
        "styles": STYLES,
        "scripts": SCRIPTS
    }

STYLES = []
SCRIPTS = []
