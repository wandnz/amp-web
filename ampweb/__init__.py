from pyramid.config import Configurator
from sqlalchemy import engine_from_config

from pyramid.authentication import AuthTktAuthenticationPolicy
from pyramid.authorization import ACLAuthorizationPolicy
from pyramid.security import NO_PERMISSION_REQUIRED
from .security import groupfinder

from .models import (
    DBSession,
    Base,
    )

from .resources import Root

def main(global_config, **settings):
    """ This function returns a Pyramid WSGI application.
    """
    engine = engine_from_config(settings, 'sqlalchemy.')
    DBSession.configure(bind=engine)
    Base.metadata.bind = engine

    nntscport = int(settings.get('ampweb.nntscport', 61234))
    settings['ampweb.nntscport'] = nntscport

    config = Configurator(settings=settings, root_factory=Root)

    # only enable auth if the secret is set
    secret = settings.get('auth.secret')
    if secret is not None:
        authn_policy = AuthTktAuthenticationPolicy(
                settings.get('auth.secret'), hashalg='sha512',
                callback=groupfinder)
        authz_policy = ACLAuthorizationPolicy()
        config.set_authentication_policy(authn_policy)
        config.set_authorization_policy(authz_policy)

        public = settings.get('auth.publicdata')
        if public is None or public in ["yes", "true", "True"]:
            # Allow any visitor to access the graphs/matrix/etc.
            # Configuration pages still require "edit" permission
            config.set_default_permission(NO_PERMISSION_REQUIRED)
        else:
            # Limit graphs/matrix/etc to users with "read" permissions.
            # Configuration pages still require "edit" permission
            config.set_default_permission("read")

    config.include('pyramid_chameleon')
    config.include('pyramid_assetviews')

    # Static content
    config.add_static_view('static', 'ampweb:static/', cache_max_age=3600)
    config.add_static_view('fonts', 'ampweb:static/fonts/', cache_max_age=3600)
    config.add_asset_views('ampweb:static', filenames=['robots.txt'], http_cache=3600)



    # Management REST interface - schedules
    config.add_route("schedules", "api/v2/sites/{name}/schedule")
    config.add_route("schedule", "api/v2/sites/{name}/schedule/{schedule_id}")
    config.add_route("status",
        "api/v2/sites/{name}/schedule/{schedule_id}/status")
    config.add_route("destinations",
        "api/v2/sites/{name}/schedule/{schedule_id}/destinations")
    config.add_route("destination",
        "api/v2/sites/{name}/schedule/{schedule_id}/destinations/{destination}")


    # Dynamic content from views
    config.add_route('home', '/')
    config.add_route('login', 'login')
    config.add_route('logout', 'logout')
    config.add_route('api', 'api*params')
    config.add_route('matrix', 'matrix*params')
    config.add_route('graph', 'graph*params')
    config.add_route('view', 'view/*params')
    config.add_route('tabview', 'tabview*params')
    config.add_route('eventview', 'eventview*params')
    config.add_route('streamview', 'streamview*params')
    config.add_route('dashboard', 'dashboard')
    config.add_route('browser', 'browser')
    config.add_route('modal', 'modal*params')
    config.add_route('schedule_ui', 'schedule*params')
    config.add_route('yaml', 'yaml*params')
    config.add_route('config', 'config*params')
    config.add_route('meshes', 'meshes*params')
    config.add_route('sites', 'sites*params')
    config.add_route('changetime', 'changetime*params')
    config.add_route('rating', 'rating*params')
    config.scan()
    return config.make_wsgi_app()

