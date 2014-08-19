def schedule_test(ampy, request):
    urlparts = request.matchdict['params']
    print urlparts

    # XXX what should we return if we get nothing useful?
    if len(urlparts) < 10:
        return

    action = urlparts[1]

    if action == "add":
        print "adding"
        test = urlparts[2]
        src = urlparts[3]
        dst = urlparts[4]
        freq = urlparts[5]
        start = urlparts[6]
        end = urlparts[7]
        period = urlparts[8]
        args = urlparts[9]
        # return the id of the new view, creating it if required
        return ampy.schedule_new_amp_test(src, dst, test, freq, start, end,
                period, args)
    elif action == "del":
        #collection = urlparts[1]
        #oldview = urlparts[2]
        #options = [urlparts[3]]
        pass
    else:
        return

# vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
