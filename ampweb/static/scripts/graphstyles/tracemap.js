/* Class that implements a traceroute map graph type within Cuz. The graph has
 * two components: a detail graph and a summary graph for navigation purposes.
 * In contrast to a regular time series graph, this graph is not drawn over time
 * but the summary view is used to scrobble through time, changing the data
 * shown in the detail view.
 *
 * This class removes some of the functionality of the basic time series graph
 * it overrides, such as events, and zooming and panning the detail graph.
 */
function TracerouteMap(params) {
    BasicTimeSeriesGraph.call(this, params);

    /* Configuration for the detail graph */
    this.detailgraph.options.config.grid = {
                verticalLines: false,
                horizontalLines: false,
                outline: "",
                outlineWidth: 0
            };
    this.detailgraph.options.config.xaxis.showLabels = false;

    /* Override the basic line style with our traceroute map style */
    this.configureStyle = function() {
        this.detailgraph.options.config.tracemap =
                jQuery.extend(true, {}, CuzTracerouteMapConfig);
        this.summarygraph.options.config.tracemap =
                jQuery.extend(true, {}, CuzTracerouteMapConfig);
    }

    /* Processes the data fetched for the detail graph and forms an
     * appropriate dataset for plotting.
     */
    this.processDetailedData = function(detaildata) {
        var i;
        var max;
        var detopts = this.detailgraph.options;
        var sumdata = this.summarygraph.options.data

        detopts.config.xaxis.min = this.detailgraph.start * 1000.0;
        detopts.config.xaxis.max = this.detailgraph.end * 1000.0;

        if (detaildata.length < 1) {
            detopts.config.yaxis.max = 1;
            return;
        }

        /* clear the data, we're replacing it */
        detopts.data = [];

        /* To keep colours consistent, every series in the summary data needs
         * to be present in the detail data too, even if just as an empty
         * series. Loop over all the summary data and try to find those streams
         * in the detail data we have received.
         */
        for ( var index in sumdata ) {
            var newdata = [];

            if ( sumdata[index].length == 0 ) {
                /* this should only be the series used for mouse tracking */
                detopts.data.push([]);
                continue;
            }

            var name = sumdata[index].name;

            if ( detaildata[name] != undefined ) {
                /* Our detail data set also includes all of the summary data
                 * that is not covered by the detail data itself. This is so
                 * we can show something when a user pans or selects outside
                 * of the current detail view, even if it is highly aggregated
                 * summary data.
                 *
                 * This first loop puts in all the summary data from before
                 * the start of our detail data.
                 */
                for (i = 0; i < sumdata[index].data.length; i++) {
                    if (detaildata[name] == null ||
                            detaildata[name].length < 1 ||
                            sumdata[index].data[i][0] <
                            detaildata[name][0][0] ) {
                        newdata.push(sumdata[index].data[i]);
                    } else {
                        break;
                    }
                }

                /* Now chuck in the actual detail data that we got */
                newdata = newdata.concat(detaildata[name]);

                /* Finally, append the remaining summary data */
                for ( ; i < sumdata[index].data.length; i++) {
                    if (sumdata[index].data[i][0] >
                            detaildata[name][detaildata[name].length - 1][0]) {
                        newdata.push(sumdata[index].data[i]);
                    }
                }
            }

            /* add the data series, making sure mouse tracking stays off */
            detopts.data.push( {
                data: newdata,
                mouse: {
                    track: false,
                },
                /*
                 * Turn off events too, this doesn't need to be drawn for
                 * every single series.
                 */
                events: {
                    show: false,
                }
            });
        }

        var paths = [];

        // for each series (source/destination pair)
        for ( var series = 1; series < detopts.data.length; series++ ) {
            var data = detopts.data[series].data;

            // for each path
            data_loop:
            for ( var i = 0; i < data.length; i++ ) {
                var timestamp = data[i][0],
                    path      = [["google.com", 0]].concat(data[i][1], [["waikato.ac.nz", 0]]);

                if ( timestamp < this.detailgraph.start ||
                        timestamp > this.detailgraph.end )
                    continue;

                // this could probably be more efficiently implemented with a trie
                path_loop:
                for ( var j = 0; j < paths.length; j++ ) {
                    if ( paths[j].hops.length != path.length ) {
                        continue path_loop; // next path
                    }

                    for ( var hop = 0; hop < path.length; hop++ ) {
                        if ( paths[j].hops[hop][0] != path[hop][0] ) {
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
                    "hops": path
                });
            }

        }

        // sort by each path's frequency of occurrence in descending order
        paths.sort(function(a,b) {
            if (a.times.length == b.times.length) return 0;
            return b.times.length - a.times.length;
        });
        
        // sort by each path's hop count in descending order
        /*paths.sort(function(a,b) {
            if (a.hops.length == b.hops.length) return 0;
            return b.hops.length - a.hops.length;
        });*/

        for ( var i = 1; i < paths.length; i++ ) {
            var pathA = paths[i];
            var minDifference = pathA.hops.length;
            var idealParent = null;
            var idealDiff = null;
            for ( var j = 0; j < i; j++ ) {
                var pathB = paths[j];
                console.log("PathA " + pathA.hops.length + " pathB " + pathB.hops.length);
                var diff = findDifference(pathA, pathB);
                if ( diff[0] == null ) {
                    continue;
                } else if ( diff[1] == null ) {
                    minDifference = pathB.hops.length - diff[0];
                    idealParent = pathB;
                    idealDiff = diff;
                } else if ( diff[1] - diff[0] < minDifference ) {
                    minDifference = diff[1] - diff[0];
                    idealParent = pathB;
                    idealDiff = diff;
                }
            }
            if ( idealParent != null ) {
                if ( "branches" in idealParent ) {
                    idealParent.branches.push(pathA);
                } else {
                    idealParent.branches = [pathA];
                }
                pathA.difference = idealDiff;
            } else {
                console.log("No parent for path " + i + "! Something went very wrong");
            }
        }

        detopts.config.tracemap.paths = paths;

        return;
    }

}

TracerouteMap.prototype = inherit(BasicTimeSeriesGraph.prototype);
TracerouteMap.prototype.constructor = TracerouteMap;

function findDifference(path1, path2) {
    var pathA = path1.hops;
    var pathB = path2.hops;

    var offsetLeft = 0, offsetRight = pathB.length;
    if ( "difference" in path2 ) {
        if (path2.difference[0] != null)
            offsetLeft = path2.difference[0];
        if (path2.difference[1] != null)
            offsetRight = path2.difference[1];
    }

    var i = 0;
    for ( ; i < pathA.length && i < pathB.length; i++ ) {
        if (pathA[i][0] != pathB[i][0])
            break;
    }

    // if path deviates > hop 0 and has not reached the end of path A
    if ( i > 0 && i < pathA.length && i > offsetLeft ) {
        var ptOfDeviation = i;
        // Find where path joins back (if possible)
        var matched = 0;
        for ( i = pathA.length - 1; i >= ptOfDeviation && i < pathB.length; i-- ) {
            if (pathA[i][0] != pathB[i][0]) {
                if (i+1 < offsetRight && i+1 < pathA.length) {
                    // path joins back up at i+1
                    return [ptOfDeviation, i+1];
                } else {
                    // path doesn't join back up
                    return [ptOfDeviation, null];
                }
            }
        }

        // path never joins back up (or joins back up after path B's offset)
        return [ptOfDeviation, null];
    }

    // path never deviates (generally this should mean that the path deviates
    // before path B's point of deviation, so path A cannot be a branch of B)
    return [null, null];
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
