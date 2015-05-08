USERS = {
    'admin':'hackme',
    }
GROUPS = {}

def groupfinder(userid, request):
    if userid in USERS:
        return GROUPS.get(userid, [])
