from pyramid.security import Authenticated, Everyone
from pyramid.security import Allow
from pyramid.security import ALL_PERMISSIONS
from pyramid.traversal import DefaultRootFactory

class Root(DefaultRootFactory):
    __acl__ = [
        (Allow, Everyone, 'yaml'),
        (Allow, Authenticated, 'read'),
        (Allow, "g:admin", ALL_PERMISSIONS),
    ]
