from ampweb.views.TraceNode import Node
from time import time
from ampy import ampdb

# Returns the JSON formatted Tree
def return_JSON(source, dest):

    db = ampdb.create()

    now = int(round(time()))
    anhourago = now - (1 * 60 * 60)

    # Get list of destinations for the amplet
    destinations = db.get(source)

    # Root Node
    treeroot = Node(source, False)
    pointer = treeroot

    # Loop through them, extracting traceroute data
    for destination in destinations:
        # Get the hops
        hoplists = db.get(source, destination, "trace", "trace", anhourago, now)
        refinedHLs = []
        for hoplist in hoplists:
            # Refine the hoplist
            if hoplist["path"] != False:
                # If this is going to be a main hoplist (From source to dest)
                if destination == dest:
                    hoplist["mainhop"] = True
                else:
                    hoplist["mainhop"] = False
                # Traceroute doesn't include the destination >__>
                hoplist["path"].append(
                        {u"hostname" : unicode(destination), u"ip" : "unknown"})
                refinedHLs.append(hoplist)

        # Add hops to final Node tree
        for hoplist in refinedHLs:
            pointer = treeroot
            i = 0
            for hop in hoplist["path"]:
                # Create hop Node
                i += 1
                #if hop["hostname"] == dest:
                #    temp = Node(hop["hostname"], hop["ip"], False)
                #    temp.height = i
                #else:
                temp = Node(hop["hostname"], hop["ip"], hoplist["mainhop"])
                temp.height = i

                # Add hop to tree
                prevpointer = pointer
                pointer = pointer.addNode(temp)

                if pointer == False:
                    print "Error: The height of the node you tried to add to was incorrect (Most likely too high)\n\n"
                    pointer = prevpointer

    # Used for collapsing hops
    treeroot.collapse(False)
    treeroot.updateWidth()
    treeroot.aboveBelow(False)

    # Node implementation of the tree is built! - Now to convert it to JSON
    deepestNode = treeroot.findDeepest().JSONForm()
    height = deepestNode["height"]
    treeFull = {
            "deepestNode" : deepestNode,
            "height" : height,
            "leaves" : treeroot.leafFormat(),
            "pruned" : False,
            "root" : treeroot.rootFormat(),
            }

    # Pruned
    treeroot.prune()
    treeroot.updateWidth()
    treeroot.aboveBelow(False)

    deepestNode = treeroot.findDeepest().JSONForm()
    height = deepestNode["height"]
    treePruned = {
            "deepestNode" : deepestNode,
            "height" : height,
            "leaves" : treeroot.leafFormat(),
            "pruned" : True,
            "root" : treeroot.rootFormat(),
            }

    return {"treeFull" : treeFull, "treePruned" : treePruned}
