def populateDropdown(options, streaminfo, key):
    ddlist = []

    for opt in options:
        if streaminfo != {} and opt == streaminfo[key]:
            ddlist.append({"name":opt, "selected":True})
        else:
            ddlist.append({"name":opt, "selected":False})

    return ddlist

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
