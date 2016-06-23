# Temporary plain text passwords. Don't expect this to be secure or private!
# This file has also been marked as a conffile in the Debian package, which
# should help stop us clobbering local changes.
USERS = {
    #'test':'1q2w3e4r5t',
    }
GROUPS = {
    #'test': ['admin'],
    }

def groupfinder(userid, request):
    if userid in USERS:
        return ['g:%s' % g for g in GROUPS.get(userid, [])]
