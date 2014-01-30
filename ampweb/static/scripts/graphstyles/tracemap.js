/* Class that implements a traceroute map graph type within Cuz. The graph has
 * two components: a detail graph and a summary graph for navigation purposes.
 * In contrast to a regular time series graph, the detail view of this graph is
 * not plotted with axes but the summary view is used to pan through time,
 * changing the data shown in the detail view.
 *
 * This class overrides a considerable number of base functions from the basic
 * time series graph, converting them into callback format so that a thread can
 * be spawned to do some of the layout processing work.
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
    this.detailgraph.options.config.yaxis.showLabels = false;

    /* Override the basic line style with our traceroute map style */
    this.configureStyle = function() {
        this.detailgraph.options.config.tracemap =
                jQuery.extend(true, {}, CuzTracerouteMapConfig);
        this.summarygraph.options.config.tracemap =
                jQuery.extend(true, {}, CuzTracerouteMapConfig);

        /* Remove unnecessary space at the top of the graph, normally used to
         * draw events */
        this.detailgraph.options.config.title = "";

        /* Force hide all events - although we do not ever fetch event data,
         * this avoids trying to do any extra hit detection etc. */
        this.detailgraph.options.config.events.show = false;
        this.summarygraph.options.config.events.show = true;
    }

    /* Processes the data fetched for the summary graph. */
    this.receivedSummaryData = function(callback) {
        var sumopts = this.summarygraph.options;
        
        if (!this.summarygraph.dataAvail) {
            this.processSummaryEvents();
            this.determineSummaryStart();
            this.setSummaryAxes();
        }
        
        if ( this.maxy == null ) {
            sumopts.config.yaxis.max = this.findMaximumY(sumopts.data,
                    this.summarygraph.start, this.summarygraph.end) * 1.1;
        }

        if (this.summarycomponent == null)
            createEnvision(this);
        this.drawSummaryGraph();

        if (this.detailgraph.dataAvail) {
            this.mergeDetailSummary();
        }
        this.summarygraph.dataAvail = true;

        this.makePaths(this.summarygraph, callback);
    }

    this.processDetailedEvents = function() {
        return;
    }

    /* Processes the data fetched for the detail graph and forms an
     * appropriate dataset for plotting.
     */
    this.processDetailedData = function(detaildata, callback) {
        var detopts = this.detailgraph.options;
        var sumdata = this.summarygraph.options.data

        this.setDetailAxes();

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
            if ( sumdata.hasOwnProperty(index) ) {
                var newdata = [];

                if ( sumdata[index].name == undefined ) {
                    /* this should only be the series used for mouse tracking */
                    detopts.data.push([]);
                    continue;
                }

                var name = sumdata[index].name;
                var colourid = sumdata[index].data.colourid

                if ( detaildata[name] != undefined ) {
                    newdata = newdata.concat(detaildata[name]);
                }

                /* add the data series, making sure mouse tracking stays off */
                detopts.data.push( {
                    name: name,
                    data: {
                        series: newdata,
                        colourid: colourid,
                    },
                    mouse: {
                        track: false
                    },
                    /*
                     * Turn off events too, this doesn't need to be drawn for
                     * every single series.
                     */
                    events: {
                        show: false
                    }
                });
            }
        }

        if (this.summarygraph.dataAvail)
            this.mergeDetailSummary();
        this.detailgraph.dataAvail = true;
        this.processDetailedEvents();

        var detopts = this.detailgraph.options;

        /* Make sure we autoscale our yaxis appropriately */
        if ( this.maxy == null ) {
            detopts.config.yaxis.max = this.findMaximumY(detopts.data,
                    this.detailgraph.start, this.detailgraph.end) * 1.1;
        }

        this.makePaths(this.detailgraph, callback);
    }

    this.makePaths = function(graph, callback) {
        var tracemap = this;

        if ( typeof(Worker) !== undefined ) {
            var worker = new Worker("/static/scripts/graphstyles/tracemap-worker.js");
            
            worker.onmessage = function(event) {
                graph.options.config.tracemap.paths = event.data.paths;
                if ( graph.options.height > 150 ) {
                    TracerouteMap.prototype.digraph = event.data.digraph;
                }

                if ( callback )
                    callback();
            };

            worker.postMessage({
                data: graph.options.data,
                start: graph.start,
                end: graph.end,
                createDigraph: (graph.options.height > 150)
            });
        } else {
            graph.options.config.tracemap.paths = createPaths(
                    graph.options.data, graph.start, graph.end);
            if ( graph.options.height > 150 ) {
                TracerouteMap.prototype.digraph = drawDigraph(
                        graph.options.config.tracemap.paths);
            }

            if ( callback )
                callback();
        }
    }

    this.displayTooltip = function(o) {
        if ( o.nearest.host ) {
            return o.nearest.host;
        } else if ( o.nearest.edge ) {
            var digraph = TracerouteMap.prototype.digraph,
                paths = o.series.tracemap.paths;
            var uniquePaths = 0, totalOccurrences = 0;

            for (var k in digraph._edges) {
                var edge = digraph._edges[k];
                if ( edge.u == o.nearest.edge.u && edge.v == o.nearest.edge.v ) {
                    // Cool! These edges are the same
                    uniquePaths++;
                    totalOccurrences += paths[edge.value.path].times.length;
                }
            }

            return "" + uniquePaths + " unique paths through this edge<br />" +
                    totalOccurrences + " total hits through this edge";
        }
    }

}

/* This is a convenient way of passing the digraph layout data structure around.
 * If we were to store this object with options, whenever options are passed to
 * methods, a recursive merge is performed to clone properties, which takes
 * forever. By storing the layout here we can access it directly and avoid
 * unnecessary object merging/cloning overhead. */
TracerouteMap.prototype.digraph = null;

TracerouteMap.prototype = inherit(BasicTimeSeriesGraph.prototype);
TracerouteMap.prototype.constructor = TracerouteMap;

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
