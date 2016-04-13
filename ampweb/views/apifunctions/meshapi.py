import base64
import re
import getopt


# TODO VALIDATE ARGUMENTS
# TODO better name for api?
def mesh(ampy, request):
    urlparts = request.matchdict['params']

    # XXX what should we return if we get nothing useful?
    if len(urlparts) < 1:
        return

    action = urlparts[1]

    if action == "add":
        if len(urlparts) < 3:
            return
        ampname = urlparts[2]
        longname = request.POST.getone("longname").strip()
        location = request.POST.getone("location").strip()
        description = request.POST.getone("description").strip()
        category = request.POST.getone("category").strip()
        if category == "site":
            return ampy.add_amp_site(ampname, longname, location, description)
        elif category == "mesh":
            return ampy.add_amp_mesh(ampname, longname, description)
        else:
            return

    elif action == "update":
        if len(urlparts) < 3:
            return
        ampname = urlparts[2]
        longname = request.POST.getone("longname").strip()
        location = request.POST.getone("location").strip()
        description = request.POST.getone("description").strip()
        category = request.POST.getone("category").strip()
        if category == "site":
            return ampy.update_amp_site(ampname, longname, location,description)
        elif category == "mesh":
            return ampy.update_amp_mesh(ampname, longname, description)
        else:
            return

    elif action == "delete":
        if len(urlparts) < 3:
            return
        ampname = urlparts[2]
        category = request.POST.getone("category").strip()
        if category == "site":
            return ampy.delete_amp_site(ampname)
        elif category == "mesh":
            return ampy.delete_amp_mesh(ampname)
        else:
            return

    elif action == "member":
        if len(urlparts) < 5:
            return
        subaction = urlparts[2]
        meshname = urlparts[3]
        ampname = urlparts[4]
        if subaction == "add":
            return ampy.add_amp_mesh_member(meshname, ampname)
        elif subaction == "delete":
            return ampy.delete_amp_mesh_member(meshname, ampname)
        else:
            return

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
