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
        this._receivedSummaryData();

        this.makePaths(this.summarygraph, callback);
    }

    /* Don't process events for the detail graph */
    this.processDetailedEvents = function() {}

    /**
     * Process the data fetched for the detail graph and form an appropriate
     * data set for plotting. makePaths() may be executed in a worker thread,
     * so this method can return before it has finished processing data.
     * Therefore, a function that should be executed after the data has finished
     * being processed can be passed to the callback parameter.
     * @param {Object} detaildata
     * @param {Function} callback A function to be executed after this method
     *      finishes processing data
     */
    this.processDetailedData = function(detaildata, callback) {
        this._processDetailedData(detaildata);

        this.makePaths(this.detailgraph, callback);
    }

    /**
     * Do additional processing and create a digraph out of the paths in our
     * network. This will be executed in a web worker if possible, otherwise in
     * the UI thread as usual. Hence, any code intended to be executed after
     * this method finishes processing data should be passed as a function to
     * this method's callback parameter.
     * @param {Object} graph
     * @param {Function} callback A function to be executed after this method
     *      finishes processing data
     */
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
                graph.options.data, graph.start, graph.end
            );
            if ( graph.options.height > 150 ) {
                TracerouteMap.prototype.digraph = drawDigraph(
                    graph.options.config.tracemap.paths
                );
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
