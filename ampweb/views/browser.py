from pyramid.view import view_config
from pyramid.renderers import get_renderer
import time
from ampweb.views.common import connectNNTSC, createGraphClass
from operator import itemgetter

@view_config(route_name="browser", renderer="../templates/skeleton.pt")
def browser(request):
    page_renderer = get_renderer("../templates/browser.pt")
    body = page_renderer.implementation().macros["body"]

    conn = connectNNTSC(request)
    collections = []
        
    nntsccols = conn.get_collections()
    

    for c in nntsccols.values():
        graphclass = createGraphClass(c['name'])
        if graphclass != None:
            collections += graphclass.get_browser_collections()

    sortcols = sorted(collections, key=itemgetter('family', 'label'))

    browser_scripts = [
        # XXX Doesn't exist yet -- create if we actually need javascript for
        # this page, otherwise remove
        "browser.js"
    ]

    return {
        "title":"Graph Browser",
        "body": body,
        "styles": [],   # TODO Add some CSS to this page!
        "scripts": browser_scripts,
        "collections": sortcols
    }


# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
