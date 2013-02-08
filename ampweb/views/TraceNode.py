from ampy import ampdb

class Node(object):
    """
       Constructor for node. 
       Node(name, width, branches[], height, above, below, direction, isLeaf, isMainHop, data{ip,latency,mtu,pmtud})
    """
    def __init__(self, _name = None, _isMainHop = False): 
        self.name = _name
        self.width = 0
        self.branches = []
        self.height = 0
        self.above = 0
        self.below = 0
        self.direction = -1
        self.isLeaf = True
        self.isMainHop = _isMainHop
        self.parent = "Not Set"
        self.collapseEnd = False
        self.collapseStart = False
        self.collapsing = False
        self.data = {
                     "ip": "unknown",
                     "latency": -1,
                     "mtu": -1,
                     "pmutd": "unknown"
                    }
    # --End Constructor-- #

    """
        Checks to see if a hostname is in a tree
    """
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

        for branch in self.branches:
            if branch.name == node.name:
                return branch

        # Root node direction
        if self.parent == "Not Set":
            self.direction += 1

        # Add node if it doesn't exist
        node.isLeaf = True
        node.direction = self.direction
        node.above = self.above + 1
        node.parent = self
        self.branches.append(node)
        self.isLeaf = False

        return self.branches[len(self.branches) - 1]
    # --End addNode-- #

    """
        Updates width
    """
    def updateWidth(self):
        if self.isLeaf == True:
            self.width = 1
            return 1
        
        width = 0
        for branch in self.branches:
            width += branch.updateWidth()
        self.width = width

        return width
    # --End updateWidth-- #

    """
        Prints out the tree - Debugging Purposes Only
    """
    def printTree(self, pretext = ""):
        toreturn =  pretext + "|---" + self.name + "\n"
        print pretext + "|---" + self.name
        for branch in self.branches:
            toreturn += branch.printTree(pretext + "    ")
        return toreturn
    # --End printTree-- #

    """
        Updates the above and below properties for each node
    """
    def aboveBelow(self, above):
        # Root Node ONLY
        if self.parent == "Not Set":
            for branch in self.branches:
                if branch.isMainHop == True:
                    self.below = branch.width - 1
                    branch.aboveBelow(False)
                else:
                    self.above = branch.width
                    branch.aboveBelow(True)
            return
    
        # All other nodes
        if above == True:
            self.above = self.width - 1
            self.below = 0
        else:
            self.below = self.width - 1
            self.above = 0

        for branch in self.branches:
            branch.aboveBelow(above)

        return
    # --End aboveBelow-- #

    """
        Returns the JSON data in the "Root" form
    """
    def rootFormat(self):
        toreturn = self.JSONForm()
        
        for branch in self.branches:
            toreturn["branches"].append(branch.rootFormat())

        return toreturn
    # --End rootFormat-- #

    """
        Returns a node in JSON form
    """
    def JSONForm(self):
        return {
            "above" : self.above,
            "below" : self.below,
            "branches" : [],
            "collapseEnd" : self.collapseEnd,
            "collapseStart" : self.collapseStart,
            "collapsing" : self.collapsing,
            "data" : self.data,
            "direction" : self.direction,
            "height" : self.height,
            "isLeaf" : self.isLeaf,
            "isMainHop" : self.isMainHop,
            "name" : self.name,
            "width" : self.width,
        }
    # --End JSONForm-- #

    """
        Returns Leaves of the tree 
    """
    def leafFormat(self):
        toreturn = {}
        
        # Not a leaf, go through branches
        if self.isLeaf != True:
            for branch in self.branches:
                toreturn.update(branch.leafFormat())
            return toreturn          

        # Is a leaf, return data
        nodename = {
            "allPaths" : {                
                "mostCommon" : [],
                "others" : []
            },
            "rtt_ms" : {
                "recent" : -1,
                "average" : -1
            }
        }

        # Set paths
        nodename["allPaths"]["mostCommon"] = self.mostCommon()
        # TODO: Implement other paths. This will require looking more in depth at the paths

        #If ICMP data available, add it
        db = ampdb.create()
        result = db.get(self.getRoot().name, self.name, "icmp", "0084")
        for res in result:
            nodename["rtt_ms"]["recent"] = res["rtt_ms"]["mean"]
            # TODO: Get actual average data + proper ICMP
            nodename["rtt_ms"]["average"] = res["rtt_ms"]["mean"]
            
            nodename["icmp"] = {
                    "count" : res["rtt_ms"]["count"],
                    "jitter" : res["rtt_ms"]["jitter"],
                    "loss" : res["rtt_ms"]["loss"],
                    "max" : res["rtt_ms"]["max"],
                    "mean" : res["rtt_ms"]["mean"],
                    "median": res["rtt_ms"]["mean"],
                    "min" : res["rtt_ms"]["min"],
                    "stddev" : -1,
                    "time" : res["time"],
            }
            break
        return {self.name : nodename}
    # --End leafFormat-- #

    """
        Provides data for most common path
    """
    def mostCommon(self):
        if self.parent == "Not Set":
            return []
        mcList = self.parent.mostCommon()
        mcList.insert(0, {
                        "hostname" : self.name,
                        "ip" : self.data["ip"],
                        "latency" : self.data["latency"],
                        "mtu" : self.data["mtu"],
                        "pmtud" : "implement me!",
                         }
                     )
        return mcList
    # --End mostCommon --#

    """
        Get's the root of the tree
    """
    def getRoot(self):
        if self.parent == "Not Set":
            return self
        return self.parent.getRoot()
    # --End getRoot-- #

    """
        Finds the deepest node in the tree
    """
    def findDeepest(self):
        if len(self.branches) == 0:
            return self

        deepestNode = self
        for branch in self.branches:
            branchDeep = branch.findDeepest()
            if branchDeep.above >= deepestNode.above:
                deepestNode = branchDeep
        return deepestNode
    # --End getDeepest-- #

    """
        Collapses the tree (sets the collapsing/collapseEnd/collapseStart). Taken from Joels php code
    """
    def collapse(self, collapsing):
        # No branches, end of collapse
        if len(self.branches) == 0:
            if collapsing == True:
                self.collapseEnd = True
                self.collapsing = True
        
        elif len(self.branches) == 1:
            # Do not collapse the root node
            if self.height != 0:
                # only set collapse start, at the collapse beginning
                if collapsing != True:
                    self.collapseStart = True
                collapsing = True
                self.collapsing = True
            self.branches[0].collapse(collapsing)
        
        else:
            # If root node, don't do this!
            if self.parent != "Not Set":
                if collapsing == True:
                    self.parent.collapseEnd = True
                collapsing = False
                
                # remove  1 node collapses
                if self.parent.collapseStart == True:
                    if self.parent.collapseEnd == True:
                        self.parent.collapseStart = False
                        self.parent.collapseEnd = False
                        self.parent.collapsing = False
                
            for node in self.branches:
                node.collapse(collapsing)
        return
    # --End collapse-- #
