import base64
import re
import getopt

def validate_args(test, args):
    testopts = {
        "icmp": "s:",
        "traceroute": "I:abfp:rs:S:4:6:",
        "dns": "I:q:t:c:z:rsn4:6:",
        "tcpping": "I:p:P:rs:S:4:6:",
    }

    if test not in testopts:
        return None

    optstring = testopts[test]

    # We don't care about the actual arguments and what their values are, we
    # only care that it was able to be parsed 100%. The test itself will
    # double check that it has sane values for each option. Maybe we should
    # do more here, so we don't end up with tests that will fail on startup.
    try:
        parsed, remaining = getopt.getopt(args.split(), optstring)
        # make sure all arguments were parsed
        if len(remaining) > 0:
            return None
    except getopt.GetoptError:
        # any error parsing causes this to fail
        return None

    # the original arg string is fine, return it
    return args


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
        args = validate_args(test, base64.b64decode(urlparts[9]))
        if args is None:
            return
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
