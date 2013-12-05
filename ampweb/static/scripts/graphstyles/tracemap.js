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

        // Force hide all events
        this.detailgraph.options.config.events.show = false;
        this.summarygraph.options.config.events.show = false;
    }

    /* Processes the data fetched for the summary graph. */
    this.processSummaryData = function(sumdata) {
        var sumopts = this.summarygraph.options;
        var legend = {};

        /* This is pretty easy -- just copy the data (by concatenating an
         * empty array onto it) and store it with the rest of our graph options
         */
        sumopts.data = [];
        /* add the initial series back on that we use for eventing */
        sumopts.data.push([]);

        for ( var line in sumdata ) {
            sumopts.data.push( {
                name: line,
                data: sumdata[line].concat([]),
                events: {
                    /* only the first series needs to show these events */
                    show: false,
                }
            });
        }

        this.determineSummaryStart();

        /* Update the X axis and generate some new tics based on the time
         * period that we're covering.
         */
        sumopts.config.xaxis.min = this.summarygraph.start * 1000.0;
        sumopts.config.xaxis.max = this.summarygraph.end * 1000.0;
        sumopts.config.xaxis.ticks =
                generateSummaryXTics(this.summarygraph.start,
                                     this.summarygraph.end);

        this.makePaths(this.summarygraph);
    }

    /* Processes the data fetched for the detail graph and forms an
     * appropriate dataset for plotting.
     */
    this.processDetailedData = function(detaildata) {
        var i;
        var max;
        var detopts = this.detailgraph.options;
        var sumdata = this.summarygraph.options.data;

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

        this.makePaths(this.detailgraph);

        return;
    }

    this.makePaths = function(graph) {
        var opts = graph.options;
        var sumdata = this.summarygraph.options.data;

        var count = 0;
        var paths = [];
        var sources = [];

        // for each series (source/destination pair)
        for ( var series = 1; series < opts.data.length; series++ ) {
            /* XXX this makes some big assumptions about label formats */
            var name = sumdata[series].name;
            if ( name == undefined ) {
                continue;
            }
            var parts = name.split("_");
            var src = parts[1],
                dst = parts[2];

            var data = opts.data[series].data;

            // for each path
            data_loop:
            for ( var i = 0; i < data.length; i++ ) {
                if ( data[i].path === undefined )
                    continue;

                var timestamp = data[i].binstart,
                    path      = data[i].path.concat([dst]);

                if ( timestamp < graph.start ||
                        timestamp > graph.end )
                    continue;

                // XXX tidy this up with a function call
                path_loop:
                for ( var j = 0; j < paths.length; j++ ) {
                    if ( paths[j].hops.length != path.length ) {
                        continue path_loop; // next path
                    }

                    for ( var hop = 0; hop < path.length; hop++ ) {
                        if ( paths[j].hops[hop] != path[hop] ) {
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
                    "hops": path,
                    "n": count++
                });
            }

        }

        /* Sort by each path's frequency of occurrence in descending order */
        // XXX DRY
        paths.sort(function(a,b) {
            if ( b.times.length - a.times.length == 0 )
                return b.n - a.n;
            return b.times.length - a.times.length;
        });

        for ( var i = 0; i < paths.length; i++ ) {
            var pathA = paths[i];
            var minDifference = pathA.hops.length;
            var idealParent = null;
            var idealDiff = null;
            for ( var j = 0; j < i; j++ ) {
                var pathB = paths[j];
                var diff = findDifference(pathA, pathB);
                if ( diff[0] == null ) {
                    continue;
                } else if ( diff[1] == null &&
                        pathA.hops.length - 1 - diff[0] < minDifference ) {
                    if (idealParent != null)
                        console.log("" + pathA.n + " replaced " + idealParent.n + " with " + pathB.n);
                    minDifference = pathA.hops.length - 1 - diff[0];
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
                sources.push(pathA);
            }
        }

        graph.options.config.tracemap.paths = paths;
        graph.options.config.tracemap.sources = sources;
    }

    this.detailgraph.options.config.mouse.trackFormatter =
            TracerouteMap.prototype.displayTooltip;

}

TracerouteMap.prototype = inherit(BasicTimeSeriesGraph.prototype);
TracerouteMap.prototype.constructor = TracerouteMap;
TracerouteMap.prototype.displayTooltip = function(o) {
    if ( o.nearest.host ) {
        return o.nearest.host;
    } else if ( o.nearest.path ) {
        console.log(o.nearest.path);

        var times = o.nearest.path.node.times;
        var occurrences = "";

        for ( j = 0; j < times.length; j++ ) {
            occurrences += convertToTime( new Date(times[j] * 1000) );
            if ( j + 2 == times.length )
                occurrences += " and ";
            else if ( j + 1 < times.length )
                occurrences += ", ";
        }

        return "" + times.length +
                (times.length == 1 ? " occurrence" : " occurrences") +
                (times.length > 6 ? "" : " on " + occurrences);
    }
}

/* TODO Unify with Flotr2 dates as appear on axes
 * Although this code *should* produce dates of the same
 * format, it would be nicer to keep this together */
function convertToTime(unixTimestamp) {
    var a = new Date(unixTimestamp);
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug',
            'Sep','Oct','Nov','Dec'];
    var year = a.getFullYear();
    var month = months[a.getMonth()];
    var day = a.getDate();
    var hour = a.getHours();
    var min = a.getMinutes();
    var sec = a.getSeconds();

    return month + ' ' + day + ', ' + hour + ':' +
            min.padLeft(2) + ':' + sec.padLeft(2);
}

Number.prototype.padLeft = function(n, str) {
    return Array(n-String(this).length+1).join(str||'0')+this;
}

function findDifference(path1, path2) {
    var pathA = path1.hops;
    var pathB = path2.hops;

    var offsetLeft = 0, offsetRight = pathB.length-1;
    if ( "difference" in path2 ) {
        if (path2.difference[0] != null)
            offsetLeft = path2.difference[0];
        if (path2.difference[1] != null)
            offsetRight = path2.difference[1];
    }

    var matchedOneLeft = false;
    for ( var i = 0; i < pathA.length && i < offsetRight; i++ ) {
        if ( !matchedOneLeft && pathA[i] == pathB[i] ) {
            matchedOneLeft = true;
        } else if ( !matchedOneLeft ) {
            // path doesn't match the first hops
            return [null, null];
        } else if ( pathA[i] != pathB[i] ) {
            if ( i > offsetLeft ) {
                // path deviates at i
                var ptOfDeviation = i;
                var matchedOneRight = false;

                if ( pathA.length != pathB.length ) {
                    return [ptOfDeviation, null];
                }

                // Find where path joins back (if possible)
                for ( var j = pathA.length-1; j >= ptOfDeviation; j-- ) {
                    if ( !matchedOneRight && pathA[j] == pathB[j] ) {
                        matchedOneRight = true;
                    } else if ( !matchedOneRight ) {
                        // path doesn't join back up
                        return [ptOfDeviation, null];
                    } else if ( pathA[j] != pathB[j]) {
                        if ( j < offsetRight ) {
                            // path joins back up at j
                            return [ptOfDeviation, j];
                        } else {
                            return [ptOfDeviation, null];
                        }
                    }
                }

                // path never joins back up (or joins back up after path B's offset)
                return [ptOfDeviation, null];
            } else {
                return [null, null];
            }
        }
    }

    // path never deviates (generally this should mean that the path deviates
    // before path B's point of deviation, so path A cannot be a branch of B)
    return [null, null];
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
