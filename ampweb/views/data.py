#
#
############ THIS IS A TEMPORARY FILE AND WILL BE REPLACED WHEN
############ A PROPER REST API IS IMPELEMTED (GRAPH PAGE USES THIS)
#
#
from pyramid.response import Response
from pyramid.view import view_config
from ampy import ampdb

@view_config(route_name='data', renderer='json')
def graph(request):
    urlparts = request.matchdict['params'];
    
    source = None
    dest = None
    test = None
    options = None
    start = None
    end = None
    
    conn = ampdb.create()

    response = ""
#Request all sources
    if len(urlparts) == 0:
        for source in conn.get():
            response += source + ","


#Request destinations from a source
    if len(urlparts) == 1:
        for dest in conn.get(urlparts[0]):
            response += dest + ","
    
#removes last ","
    response = response[:-1]

#RETURN
    return response
