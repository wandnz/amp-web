from pyramid.config import Configurator
from sqlalchemy import engine_from_config

from .models import (
    DBSession,
    Base,
    )

def main(global_config, **settings):
    """ This function returns a Pyramid WSGI application.
    """
    engine = engine_from_config(settings, 'sqlalchemy.')
    DBSession.configure(bind=engine)
    Base.metadata.bind = engine
    
    nntscport = int(settings.get('ampweb.nntscport', 61234))
    settings['ampweb.nntscport'] = nntscport
    
    config = Configurator(settings=settings)
    config.include('pyramid_chameleon')
    #short caching of static resources, for testing.
    config.add_static_view('static', 'ampweb:static/', cache_max_age=30)
    config.add_route('home', '/')
    config.add_route('api', 'api*params')
    config.add_route('matrix', 'matrix*params')
    config.add_route('graph', 'graph*params')
    config.add_route('view', 'view*params')
    config.add_route('dashboard', 'dashboard')
    config.add_route('eventlist', 'eventlist')
    config.scan()
    return config.make_wsgi_app()

