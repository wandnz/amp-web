#
#
############ THIS IS A TEMPORARY FILE AND WILL BE REPLACED WHEN
############ A PROPER REST API IS IMPELEMTED (GRAPH PAGE USES THIS)
#
#
from pyramid.response import Response
from pyramid.view import view_config
from ampy import ampdb

@view_config(route_name='data', renderer='../templates/data.pt')
def graph(request):
    url = request.url.split("data")[1];
    
    source = None
    dest = None
    test = None
    options = None
    start = None
    end = None
    
    urlparts = url.split("/")
    try:
        urlparts.remove('')
        urlparts.remove('')
    except:
        pass
    
    conn = ampdb.create()

    jsonresponse = ""
#Request all sources
    if len(urlparts) == 0:
        for source in conn.get():
            jsonresponse += source + ","


#Request destinations from a source
    if len(urlparts) == 1:
        for dest in conn.get(urlparts[0]):
            jsonresponse += dest + ","
    
#removes last ","
    jsonresponse = jsonresponse[:-1]

#RETURN
    return {
            "data": jsonresponse ,
           }
