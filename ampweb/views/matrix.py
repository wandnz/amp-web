from pyramid.response import Response
from pyramid.renderers import get_renderer
from pyramid.view import view_config
from ampy import ampdb


@view_config(route_name='matrix', renderer='../templates/skeleton.pt')
def home(request):
    page_renderer = get_renderer("../templates/matrix.pt")
    body = page_renderer.implementation().macros['body']

    url = request.matchdict['params']
    #connect to the ampdb
    db = ampdb.create()

    if len(url) >= 0:
        #default values
        ipVersion = "ipv4"
        dataType = "icmp"
        src = "NZ"
        dst = "NZ"
        #check ipVersion
        if len(url) >= 1:
            if url[0] == "ipv6":
                ipVersion = "ipv6"
            #check test type
            if len(url) >= 2:
                result = db.get("src", "dst")
                testList = result.fetchall()
                for test in testList:
                    if url[1] == test:
                        dataType = url[1]
                #check valid src
                if len(url) >= 3:
                    #check the URL value against a list of node groups(that doesn't exist yet)
                    #check valid dst
                    if len(url) >= 4: 
                        #check the URL value against a list of node groups(that doesn't exist yet)
                        pass
    
    srcData = db.get()
    dstData = db.get(srcData)
    srcList = srcData.fetchall()
    dstList = dstData.fetchall()

    return {
        "title": "Amp Grid",
        "body": body, 
        "scripts": SCRIPTS, 
        "styles": STYLES, 
        "srcList": srcList, 
        "dstList": dstList,
        "ipVersion": ipVersion,
        "dataType": dataType,
        "src": src,
        "dst": dst
    }

SCRIPTS = [
    "datatables-1.9.4.js",
    "datatables.fnReloadAjax.js",
    "URI.js",
    "matrix.js"
]
STYLES = [
    "matrixStyles.css",
    "yui3-reset-min.css"
]
