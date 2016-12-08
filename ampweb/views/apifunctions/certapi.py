from pyramid.view import view_config
from pyramid.httpexceptions import *
import subprocess
import sys


PERMISSION = 'edit'


try:
    sys.path.append("/usr/share/amppki/") # XXX
    from amppki.common import verify_common_name, load_pending_requests, load_index, is_expired


    @view_config(
        route_name='certificates',
        request_method='DELETE',
        renderer='json',
        permission=PERMISSION,
    )
    def revoke_certificate(request):
        name = request.matchdict["name"]
        cert = [x for x in load_index() if x["status"] == "V" and not is_expired(x)]
        if verify_common_name(name) and len(cert) > 0:
            result = subprocess.call(
                    ["sudo", "-n", "/usr/sbin/ampca", "revoke", name])
            if result == 0:
                return HTTPNoContent()
            return HTTPInternalServerError()
        return HTTPBadRequest()


    @view_config(
        route_name='certificates',
        request_method='POST',
        renderer='json',
        permission=PERMISSION,
    )
    def sign_certificate(request):
        name = request.matchdict["name"]
        if verify_common_name(name) and len(load_pending_requests(name)) > 0:
            result = subprocess.call(
                    ["sudo", "-n", "/usr/sbin/ampca", "sign", name])
            if result == 0:
                return HTTPNoContent()
            return HTTPInternalServerError()
        return HTTPBadRequest()


except ImportError:


    @view_config(
        route_name='certificates',
        request_method='DELETE',
        renderer='json',
        permission=PERMISSION,
    )
    def revoke_certificate(request):
        return HTTPNotImplemented()


    @view_config(
        route_name='certificates',
        request_method='POST',
        renderer='json',
        permission=PERMISSION,
    )
    def sign_certificate(request):
        return HTTPNotImplemented()

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
