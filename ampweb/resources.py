from pyramid.security import Authenticated
from pyramid.security import Allow
from pyramid.traversal import DefaultRootFactory

class Root(DefaultRootFactory):
    __acl__ = [
        (Allow, Authenticated, 'read'),
    ]
