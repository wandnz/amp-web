USERS = {
    'test':'1q2w3e4r5t',
    }
GROUPS = {
    'test': ['admin'],
    }

def groupfinder(userid, request):
    if userid in USERS:
        return ['g:%s' % g for g in GROUPS.get(userid, [])]
