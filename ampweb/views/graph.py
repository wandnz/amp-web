from pyramid.response import Response
from pyramid.view import view_config
from pyramid.renderers import get_renderer
from ampy import ampdb

@view_config(route_name='graph', renderer='../templates/skeleton.pt')
def graph(request):
    page_renderer = get_renderer("../templates/graph.pt")
    body = page_renderer.implementation().macros['body']

    return {
            "title": "Graphs",
            "body": body,
            "styles": STYLES,
            "scripts": SCRIPTS
           }

STYLES = []
SCRIPTS = [
    "graph.js"
]
