/**
 * This is a convenient place to put this method, so that it can be accessed
 * globally by the tracemap-worker Worker thread and also the fallback (not
 * threaded) solution.
*/
function createPaths(graphData, start, end) {
    var paths = [];

    // for each series (source/destination pair)
    for ( var series = 1; series < graphData.length; series++ ) {
        var data = graphData[series].data.series;

        // for each path
        data_loop:
        for ( var i = 0; i < data.length; i++ ) {
            if ( data[i].length < 6 )
                continue;

            var mints = data[i][0],
                maxts = data[i][1],
                path = data[i][2],
                errtype = data[i][3],
                errcode = data[i][4],
                freq = data[i][5],
                hops      = [];

            var lastvalid = 0;
            var endhopstyle = "normal";
            for ( var j = 0; j < path.length; j++ ) {
                if (path[j][0] != "No response") {
                    lastvalid = j;
                }

                hops.push({'as':path[j][0], "ip":path[j][1]});

                if (j == path.length - 1) {
                    if (errcode != null) {
                        endhopstyle = "error-" + errcode;
                    }
                    else if (path[j][0] == "No response") {
                        endhopstyle = "noresp";
                    }
                }
            }

            // XXX tidy this up with a function call
            path_loop:
            for ( var j = 0; j < paths.length; j++ ) {
                if ( paths[j].hops.length != hops.length ) {
                    continue path_loop; // next path
                }

                for ( var hop = 0; hop < hops.length; hop++ ) {
                    if ( paths[j].hops[hop] != hops[hop] ) {
                        continue path_loop; // next path
                    }
                }

                //paths[j].times.push(timestamp); // match
                continue data_loop;
            }

            // no matching path found if "break data_loop" was never hit, so
            // add the new path now
            paths.push({
                //"times": [timestamp],
                "hops": hops,
                "mints": mints,
                "maxts": maxts,
                "errtype": errtype,
                "errcode": errcode,
                "freq":freq,
                "lastvalidhop":lastvalid,
                "endhopstyle":endhopstyle,
                "pathid":i,
            });
        }

    }

    return paths;
}

function addNullEndNode(g, prevHop, pathHopMap) {
    var hopid = "nullend_" + prevHop.ip;

    if (!g.hasNode(hopid)) {
        var node = g.addNode(hopid, {width:6, height:6});
        
        pathHopMap[node] = {'as':'No response', 'freq':0, 
                'label': 'Timed Out', 'style':'timeout'};
    }
    return hopid;

}

function addHopNode(g, path, hop, pathHopMap, ttl) {
    var hopid = hop.ip;
    var freq = path.freq;

    /* Draw a separate null hop at each observed TTL, to avoid creating
     * incorrect loops in our graph */
    if (hop.as == "No response") {
        hopid += "_" + ttl;

        /* Ensure we draw a separate null hop for each path that times
         * out, rather than potentially joining up with another null hop */
        if (ttl >= path.lastvalidhop && ttl > 0) {
            hopid += "_" + path.hops[ttl - 1].ip;
        }
    }

    if ( !g.hasNode(hopid) ) {
        var hoplab = hop.ip;
        var node = g.addNode(hopid, { label: hoplab, width: 6, 
                height: 6 });
        var style = "normal";

        if (ttl == path.lastvalidhop && path.endhopstyle == "normal")
            style = "lasthop";
        else if (ttl == 0) {
            style = "firsthop";
        }

        pathHopMap[node] = {'as':hop.as, 'freq':0, 'label':hoplab, 
                'style':style}
    }

    return hopid;

}


function drawDigraph(paths) {
    var g = new dagre.Digraph();
    var totalmeasurements = 0;
    var pathEdgeMap = {};
    var pathHopMap = {}

    for ( var i = 0; i < paths.length; i++ ) {
        var freq = paths[i].freq;
        paths[i].edges = [];

        totalmeasurements += freq;

        for ( var j = 0; j <= paths[i].lastvalidhop; j++ ) {
            var hop = addHopNode(g, paths[i], paths[i].hops[j], pathHopMap, j);
            pathHopMap[hop].freq += freq;

            if ( j + 1 <= paths[i].lastvalidhop ) {
                var nextHop = addHopNode(g, paths[i], paths[i].hops[j+1], 
                        pathHopMap, j + 1);
                
            } else if (paths[i].endhopstyle == "noresp") {
                var nextHop = addNullEndNode(g, paths[i].hops[j], pathHopMap);
                pathHopMap[nextHop].freq += freq;
                console.log(pathHopMap[nextHop]);
            } else {
                continue;
            }
            var edge = g.addEdge(null, hop, nextHop);
            pathEdgeMap[edge] = {'path': i, 'freq':freq};
            paths[i].edges.push(edge);

        }
    }

    var layout = dagre.layout().run(g);

    /*
    layout.eachNode(function(u, value) {
        console.log("Node " + u + ": " + JSON.stringify(value));
    });

    layout.eachEdge(function(e, u, v, value) {
        console.log("Edge " + u + " -> " + v + ": " + JSON.stringify(value));
    });
    */

    /* Running the layoutifier will wipe any existing values associated with
     * edges, so we need to loop through them again here to associate edges
     * with their paths */
    for ( var edge in pathEdgeMap ) {
        if ( pathEdgeMap.hasOwnProperty(edge) ) {
            layout.edge(edge).path = pathEdgeMap[edge].path;
            layout.edge(edge).freq = pathEdgeMap[edge].freq;
        }
    }

    for ( var hop in pathHopMap ) {
        if ( pathHopMap.hasOwnProperty(hop) ) {
            layout.node(hop).label = pathHopMap[hop].label;
            layout.node(hop).style = pathHopMap[hop].style;
            layout.node(hop).as = pathHopMap[hop].as;
            layout.node(hop).weight = pathHopMap[hop].freq / totalmeasurements;
        }
    }
    return layout;
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
