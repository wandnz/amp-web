class Node:
    name = "default"    # The name of the node
    width = 0           # The number of branches in the branches[] list
    branches = []
    height = 0          # Number of levels from the top of the tree (basically, hop number)
    above = 0           # The number of nodes above this one
    below = 0           # The number of nodes below this one
    direction = 0
    isLeaf = False
    isMainHop = False
    data = {
            "ip": "unknown",
            "latency": -1,
            "mtu": -1,
            "pmutd": "unknown",
           }

    """
       Constructor for node. 
       Node(name, width, branches[], height, above, below, direction, isLeaf, isMainHop, data{ip,latency,mtu,pmtud})
    """
    def __init__(self,
                 _name = "default", _width = 0,
                 _branches = [], _height = 0,
                 _above = 0, _below = 0,
                 _direction = 0, _isLeaf = False,
                 _isMainHop = False,
                 _data = {
                         "ip": "unknown",
                         "latency": -1,
                         "mtu": -1,
                         "pmutd": "unknown",
                        }): 
        name = _name
        width = _width
        branches = _branches
        height = _height
        above = _above
        below = _below
        direction = _direction
        isLeaf = _isLeaf
        isMainHop = _isMainHop
        data = _data
    # --End Constructor-- #

    def inTree(self, hostname):
        if name == hostname:
            return self
        for branch in branches:
            if branch.inTree(hostname) != False:
                return branch.inTree(hostname)
        return False
    # --End inTree-- #

    """
        Adds a node to the tree
    """
    def addNode(self, node):
        # Checks the height in the tree is right        
        if self.height + 1 != node.height:
            return False

        for branch in branches:
            if branch.name == node.name:
                return branch
        # Add node if it doesn't exist
        self.width += 1
        self.isLeaf = False
        node.isLeaf = True
        node.direction = len(branches) - 1
        branches.append(node)
        return branches[len(branches) - 1]

