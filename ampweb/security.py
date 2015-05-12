USERS = {
    'test':'1q2w3e4r5t',
    'dave.simpson':'TNrMclFuSzrEoy2R'
    }
GROUPS = {}

def groupfinder(userid, request):
    if userid in USERS:
        return GROUPS.get(userid, [])
