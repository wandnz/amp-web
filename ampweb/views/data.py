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
    binsize = 60 

    db = ampdb.create()

    # Used to determine what type of response is to be returned
    successnumber = 0

    try:
        source = urlparts[0]
        dest = urlparts[1]
        test = urlparts[2]
        options = urlparts[3]
        start = int(urlparts[4])
        end = int(urlparts[5])
        binsize = int(urlparts[6])
    except:
        pass

    #What type of response is it
    type = {0 : "sites",
            1 : "sites",
            2 : "tests",
            3 : "subtypes",
            4 : "data",
            5 : "data",
            6 : "data",
            7 : "data",
           }

    response = {}
    try:
        data = db.get(source, dest, test, options, start, end, binsize)
    except:
        response["error"] = "There was an error"
    else:
        response["response"] = {}
        response["response"][type[successnumber]] = []
        for daata in data:
            response["response"][type[len(urlparts)]].append(daata)
    
    #RETURN
    return response
