from pyramid.response import Response
from pyramid.view import view_config

from sqlalchemy.exc import DBAPIError

from .models import (
    DBSession,
    MyModel,
    )

@view_config(route_name='home', renderer='templates/mytemplate.pt')
def my_view(request):
    try:
        one = DBSession.query(MyModel).filter(MyModel.name=='one').first()
    except DBAPIError:
        return Response(conn_err_msg, content_type='text/plain', status_int=500)
    return {'one':one, 'project':'amp-web'}

conn_err_msg = """\
Pyramid is having a problem using your SQL database.  The problem
might be caused by one of the following things:

1.  You may need to run the "initialize_amp-web_db" script
    to initialize your database tables.  Check your virtual 
    environment's "bin" directory for this script and try to run it.

2.  Your database server may not be running.  Check that the
    database server referred to by the "sqlalchemy.url" setting in
    your "development.ini" file is running.

After you fix the problem, please restart the Pyramid application to
try it again.
"""
@view_config(route_name='testing', renderer='templates/test.pt')
def view_test(request):
	url = request.url
	#process the url
	url = url.split("test")[1].split("/")
	toreturn = []
	for x in range(len(url) - 1, 5):
		url.append("")
	
	return {"name": url[1],
		"likes": url[2],
		"friend": url[3],
		"nicknam": url[4],
		}

@view_config(renderer="templates/jquery.pt", route_name="jquery")
def view_jquery(request):
	return {"title":"Hello World Page",
		"heading": "This is the heading",
		"content": "This is the hello world page",
		"css": "/static/jquery.css",
		"scripts": [    "/static/jquery_page.js",
				"/static/jquery-1.8.3.js",
				"/static/jQueryUI/development-bundle/ui/jquery.ui.core.js",
				"/static/jQueryUI/development-bundle/ui/jquery.ui.widget.js",
				"/static/jQueryUI/development-bundle/ui/jquery.ui.tabs.js",
			   ]
		}
