#
#
############ THIS IS A TEMPORARY FILE AND WILL BE REPLACED WHEN
############ A PROPER REST API IS IMPELEMTED (GRAPH PAGE USES THIS)
#
#
from pyramid.response import Response
from pyramid.view import view_config
from ampy import ampdb
import json

@view_config(route_name='data', renderer='json')
def graph(request):
    urlparts = request.matchdict['params'];
    
    source = None
    dest = None
    test = None
    options = None
    start = None
    end = None
    
    db = ampdb.create()

    try:
        source = urlparts[0]
        dest = urlparts[1]
        test = urlparts[2]
        options = urlparts[3]
        start = int(urlparts[4])
        end = int(urlparts[5])
    except:
        pass

    data = db.get(source, dest, test, options, start, end)
    
    response = []    

    for daata in data:
        response.append(daata)
    
    #response = json.dumps(response)
    
    #RETURN
    return response
