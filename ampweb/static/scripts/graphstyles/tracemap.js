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
                    path      = data[i].path;

                if ( timestamp < graph.start || timestamp > graph.end )
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
                    "hops": path
                });
            }

        }

        var g = new TracerouteDigraph();
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

        TracerouteMap.prototype.digraph = layout;
        graph.options.config.tracemap.paths = paths;
    }

    this.detailgraph.options.config.mouse.trackFormatter =
            TracerouteMap.prototype.displayTooltip;

}

/* This is a convenient way of passing the digraph layout data structure around.
 * If we were to store this object with options, whenever options are passed to
 * methods, a recursive merge is performed to clone properties, which takes
 * forever. By storing the layout here we can access it directly and avoid
 * unnecessary object merging/cloning overhead. */
TracerouteMap.prototype.digraph = null;

TracerouteMap.prototype = inherit(BasicTimeSeriesGraph.prototype);
TracerouteMap.prototype.constructor = TracerouteMap;
TracerouteMap.prototype.displayTooltip = function(o) {
    if ( o.nearest.host ) {
        return o.nearest.host;
    } else if ( o.nearest.path ) {
        var times = o.nearest.path.times;
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

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
