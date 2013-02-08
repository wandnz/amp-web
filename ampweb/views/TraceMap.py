from TraceNode import Node
from time import time
from ampy import ampdb

#Returns the JSON formatted Tree
def return_JSON(source, dest, pruned):

    db = ampdb.create()    

    currenttime = int(round(time()))
    adayago = currenttime - (1 * 24 * 60 * 60)

    # Get list of destinations for the amplet
    destinations = db.get(source)

    # Root Node
    treeroot = Node(source, False)
    pointer = treeroot

    # Loop through them, extracting traceroute data
    for destination in destinations:
        # Get the hops            
        hoplists = db.get(source, destination, "trace", "trace", adayago, currenttime)

        refinedHLs = []
        for hoplist in hoplists:
            # Refine the hoplist
            if hoplist["path"] != False:
                # If this is going to be a main hoplist (From source to dest)
                if destination == dest:
                    hoplist["mainhop"] = True
                else:
                    hoplist["mainhop"] = False
                refinedHLs.append(hoplist)

        # Add hops to final Node tree
        for hoplist in refinedHLs:
            pointer = treeroot            
            i = 0
            for hop in hoplist["path"]:
                # Create hop Node
                i += 1

                if hop["hostname"] == dest:
                    temp = Node(hop["hostname"], False)
                    temp.height = i
                else:
                    temp = Node(hop["hostname"], hoplist["mainhop"])
                    temp.height = i

                # Add hop to tree
                prevpointer = pointer
                pointer = pointer.addNode(temp)
                               
                if pointer == False:
                    print "\n\n DIDN'T ADD LOL. \nThe Height of the Node you tried to add to was incorrect (Most likely too high)\n\n"
                    pointer = prevpointer
            #--End For Loop
        #--End For Loop

        # Used for collapsing hops
        treeroot.collapse(False)
        treeroot.updateWidth()
        treeroot.aboveBelow(False)

        # Node implementation of the tree is built! - Now to convert it to JSON >__>
        root = treeroot.rootFormat()
        leaves = treeroot.leafFormat()
        pruned = pruned
        deepestNode = treeroot.findDeepest().JSONForm()
        height = deepestNode["height"]
        
    return {
            "deepestNode" : deepestNode,
            "height" : height,
            "leaves" : leaves,
            "pruned" : pruned,
            "root" : root,
            }
