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
            if ( data[i].length < 5 )
                continue;

            var timestamp = data[i][0],
                path      = data[i][4],
                hops      = [];

            for ( var j = 0; j < path.length; j++ ) {
                hops.push(path[j][0]);
            }

            if ( timestamp < start * 1000 || timestamp > end * 1000 )
                continue;

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

                paths[j].times.push(timestamp); // match
                continue data_loop;
            }

            // no matching path found if "break data_loop" was never hit, so
            // add the new path now
            paths.push({
                "times": [timestamp],
                "hops": hops
            });
        }

    }

    return paths;
}

function drawDigraph(paths) {
    var g = new dagre.Digraph();
    var pathEdgeMap = {};

    for ( var i = 0; i < paths.length; i++ ) {
        paths[i].edges = [];
        for ( var j = 0; j < paths[i].hops.length; j++ ) {
            var hop = paths[i].hops[j];

            if ( !g.hasNode(hop) )
                g.addNode(hop, { width: 6, height: 6 });
            
            if ( j + 1 < paths[i].hops.length ) {
                var nextHop = paths[i].hops[j+1];
                if ( !g.hasNode(nextHop) ) {
                    g.addNode(nextHop, { width: 6, height: 6 });
                }
                var edge = g.addEdge(null, hop, nextHop);
                pathEdgeMap[edge] = i;
                paths[i].edges.push(edge);
            }
        }
    }

    var layout = dagre.layout().run(g);

    /* Running the layoutifier will wipe any existing values associated with
     * edges, so we need to loop through them again here to associate edges
     * with their paths */
    for ( var edge in pathEdgeMap ) {
        if ( pathEdgeMap.hasOwnProperty(edge) ) {
            layout.edge(edge).path = pathEdgeMap[edge];
        }
    }

    return layout;
}