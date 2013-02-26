from ampy import ampdb
from math import pow, sqrt
import time

class Node(object):
    """
       Constructor for node.
       Node(name, ip, isMainHop)
    """
    def __init__(self, _name = None, _ip="unknown", _isMainHop = False):
        self.name = _name
        self.width = 0
        self.branches = []
        self.height = 0
        self.above = 0
        self.below = 0
        self.direction = 1
        self.isLeaf = True
        self.isMainHop = _isMainHop
        self.parent = "Not Set"
        self.collapseEnd = False
        self.collapseStart = False
        self.collapsing = False
        self.data = {
                     "ip": _ip,
                     "latency": -1,
                     "mtu": -1,
                     "pmutd": "unknown"
                    }

    def inTree(self, hostname):
        """ Checks to see if a hostname is in a tree """
        if name == hostname:
            return self
        for branch in branches:
            if branch.inTree(hostname) != False:
                return branch.inTree(hostname)
        return False

    def addNode(self, node):
        """ Adds a node to the tree """
        # Checks the height in the tree is right
        if self.height + 1 != node.height:
            return False

        # Node already exists in tree
        for branch in self.branches:
            if branch.name == node.name:
                # If node has already been added, but it is now found to be
                # a main hop
                if node.isMainHop == True:
                    branch.isMainHop = True
                return branch

        # Add node if it doesn't exist
        node.isLeaf = True
        node.above = self.above + 1
        node.parent = self
        self.branches.append(node)
        self.isLeaf = False

        return self.branches[len(self.branches) - 1]

    def updateWidth(self):
        """ Updates width """
        if self.isLeaf == True:
            self.width = 1
            return 1

        width = 0
        for branch in self.branches:
            width += branch.updateWidth()
        self.width = width

        return width

    def printTree(self, pretext = ""):
        """ Prints out the tree - Debugging Purposes Only """
        toreturn =  pretext + "|---" + self.name + "\n"
        print pretext + "|---" + self.name
        for branch in self.branches:
            toreturn += branch.printTree(pretext + "    ")
        return toreturn

    def aboveBelow(self, above):
        """ Updates the above and below properties for each node """
        # Root Node ONLY
        if self.parent == "Not Set":
            for branch in self.branches:
                if branch.isMainHop == True:
                    self.below = branch.width - 1
                    self.direction = -1
                    branch.aboveBelow(False)
                else:
                    self.above = branch.width
                    self.direction = 1
                    branch.aboveBelow(True)
            return

        # All other nodes
        if above == True:
            self.above = self.width - 1
            self.below = 0
            self.direction = 1
        else:
            self.below = self.width - 1
            self.above = 0
            self.direction = -1

        for branch in self.branches:
            branch.aboveBelow(above)

        return

    def rootFormat(self):
        """ Returns the JSON data in the "Root" form """
        toreturn = self.JSONForm()

        for branch in self.branches:
            toreturn["branches"].append(branch.rootFormat())

        return toreturn

    def JSONForm(self):
        """ Returns a node in JSON form """
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

    def leafFormat(self):
	""" Returns Leaves of the tree """
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
        # TODO: Implement other paths. This will require looking more in
        # depth at the paths

        #If ICMP data available, add it
        db = ampdb.create()
        recent = db.get(self.getRoot().name, self.name, "icmp", "0084", int(time.time()) - (24 * 60 * 60), int(time.time()))
        average = db.get(self.getRoot().name, self.name, "icmp", "0084", int(time.time()) - (24 * 60 * 60), int(time.time()), (24 * 60 * 60))

        for avg in average:
            nodename["rtt_ms"]["average"] = avg["rtt_ms"]["mean"]

            nodename["icmp"] = {
                    "count" : avg["rtt_ms"]["count"],
                    "jitter" : avg["rtt_ms"]["jitter"],
                    "loss" : avg["rtt_ms"]["loss"],
                    "max" : avg["rtt_ms"]["max"],
                    "mean" : avg["rtt_ms"]["mean"],
                    "median": avg["rtt_ms"]["mean"],
                    "min" : avg["rtt_ms"]["min"],
                    "stddev" : -1,
                    "time" : avg["time"],
            }

            mean = nodename["icmp"]["mean"]
            switch = True
            counter = 0
            stddevtotal = 0
            for res in recent:
                if switch == True:
                    nodename["rtt_ms"]["average"] = avg["rtt_ms"]["mean"]
                    switch = False
                counter += 1
                stddevtotal += pow((res["rtt_ms"]["mean"] - mean), 2)
            nodename["icmp"]["stddev"] = sqrt(stddevtotal / counter)
            break

        return {self.name : nodename}

    def mostCommon(self):
        """ Provides data for most common path """
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

    def getRoot(self):
        """ Get the root of the tree """
        if self.parent == "Not Set":
            return self
        return self.parent.getRoot()

    def findDeepest(self):
        """ Finds the deepest node in the tree """
        if len(self.branches) == 0:
            return self

        deepestNode = self
        for branch in self.branches:
            branchDeep = branch.findDeepest()
            if branchDeep.above >= deepestNode.above:
                deepestNode = branchDeep
        return deepestNode

    def collapse(self, collapsing):
        """
            Collapses the tree (sets the collapsing/collapseEnd/collapseStart).
            Taken from Joels php code
        """
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

    def prune(self):
        """
            Prunes the tree by getting rid of all branches unless they are the
            shortest branch on each MAIN HOP
        """
        # Root node
        if self.parent == "Not Set":
            for branch in self.branches:
                branch.prune()
        else:
            if len(self.branches) == 0:
                return 0
            elif len(self.branches) == 1:
                return self.branches[0].prune() + 1
            else:
                smallest = {"index" : len(self.branches) - 1, "height" : self.branches[len(self.branches) -1].prune()}
                for i in range(len(self.branches) - 2, -1, -1):
                    # Main hop, leave this branch alone
                    if self.branches[i].isMainHop == True:
                        continue

                    #Remove the 
                    if self.branches[i].prune() > smallest["height"]:
                        self.branches.pop(i)
                        smallest["index"] -= 1
                    elif self.branches[i].prune() < smallest["height"]:
                        self.branches.pop(smallest["index"])
                        smallest = {"index" : i, "height" : self.branches[i].prune()}
                return self.branches[0].prune() + 1
