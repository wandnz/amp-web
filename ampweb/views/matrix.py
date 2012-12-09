from pyramid.response import Response
from pyramid.renderers import get_renderer
from pyramid.view import view_config
from ampy import ampdb


@view_config(route_name='matrix', renderer='../templates/skeleton.pt')
def home(request):
    page_renderer = get_renderer("../templates/matrix.pt")
    body = page_renderer.implementation().macros['body']

    #split the url and pull out the data to construct the matrix
    #this part is likely going to change very soon
    url = request.url
    url = url.split('matrix')[1]
    urlParts = url.split('/')
    urlParts.remove('')

    if(len(urlParts) == 4):
        ipVersion = urlParts[0]
        dataType = urlParts[1]
        src = urlParts[2]
        dst = urlParts[3]
    else:
        #some sort of page error, the URL was an invalid length
        page_renderer = get_renderer("../templates/badURL.pt")
        body = page_renderer.implementation().macros['body']
        return {
            "title": "bad URL",
            "body": body,
            "scripts": "",
            "styles": ""
        }
    
    #connect to the ampdb
    conn = ampdb.create()
    srcData = conn.get()
    dstData = conn.get(srcData)
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
    "matrix.js"
]
STYLES = [
    "matrixStyles.css"
]
