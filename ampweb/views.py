from pyramid.response import Response
from pyramid.view import view_config

from sqlalchemy.exc import DBAPIError

from .models import (
    DBSession,
    MyModel,
    )

@view_config(route_name='home', renderer='templates/global.pt')
def my_view(request):
	return {"one": "one"}

