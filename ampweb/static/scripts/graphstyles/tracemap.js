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

    /* Creates both the summary and detail graphs, populates them with data
     * based on the initial selection and draws the graphs.
     *
     * Generally, you'll want to call this as soon as you've instantiated
     * your instance of this class.
     */
    this.createGraphs = function() {
        /* Define our line styles */
        this.configureStyle();

        /* Calculate the amount of summary data we'll need */
        this.calcSummaryRange();

        /* Create the envision components for our graphs */
        createEnvision(this);

        /* Query for all of the necessary data simultaneously and wait for
         * all queries to complete.
         */
        this.fetchSummaryData(true);
    }

    /* Queries for data required to draw the summary graph. */
    this.fetchSummaryData = function(updateDetail) {
        /* If we have an outstanding query for summary data, abort it */
        if (this.summaryreq)
            this.summaryreq.abort();

        /* build up a url with all of the stream ids in it */
        var url = this.dataurl;
        for ( var line in this.lines ) {
            url += this.lines[line].id;
            if ( line < this.lines.length - 1 ) {
                url += "-";
            }
        }
        url += "/" + this.summarygraph.start + "/" + this.summarygraph.end;

        var graph = this;
        this.summaryreq = $.getJSON(url, function(sumdata) {
            /* When the data arrives, process it immediately */
            graph.processSummaryData(sumdata);
            if ( updateDetail ) {
                graph.updateDetailGraph();
            }
        });

        return this.summaryreq;
    }

    /* Queries for the data required to draw the detail graph */
    this.fetchDetailData = function() {
        /* If we have an outstanding query for detail data, abort it */
        if (this.detailreq)
            this.detailreq.abort();

        /* build up a url with all of the stream ids in it */
        var url = this.dataurl;
        for ( var line in this.lines ) {
            url += this.lines[line].id;
            if ( line < this.lines.length - 1 ) {
                url += "-";
            }
        }
        url += "/" + this.detailgraph.start + "/" + this.detailgraph.end;

        var graph = this;
        this.detailreq = $.getJSON(url, function(detaildata) {
            graph.processDetailedData(detaildata);
        });

        /* Don't process the detail data in here -- we need to be sure we
         * have all the summary data first! */
        return this.detailreq;
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
        this.mergeDetailSummary(detaildata);
        this.makePaths(this.detailgraph);
        return;
    }

    /**
     * Fetches new summary data, but only if the selection has changed
     */
    this.updateSummaryGraph = function() {
        /* Don't bother changing anything if our summary range hasn't changed.
         */
        if (this.calcSummaryRange() == false)
            return;

        this.fetchSummaryData();
    }

    this.updateDetailGraph = function() {
        window.clearTimeout(this.selectingtimeout);
        this.selectingtimeout = null;

        this.fetchDetailData();
    }

    this.makePaths = function(graph) {
        var tracemap = this;

        if ( typeof(Worker) !== undefined ) {
            var worker = new Worker("/static/scripts/tracemap-worker.js");
            
            worker.onmessage = function(event) {
                graph.options.config.tracemap.paths = event.data.paths;
                if ( graph.options.height > 150 ) {
                    TracerouteMap.prototype.digraph = event.data.digraph;
                }
                
                tracemap.makePathsCallback(graph);
            };

            worker.postMessage({
                data: graph.options.data,
                start: graph.start,
                end: graph.end,
                createDigraph: (graph.options.height > 150)
            });
        } else {
            graph.options.config.tracemap.paths = TracerouteDigraph.prototype
                    .createPaths(graph.options.data, graph.start, graph.end);
            if ( graph.options.height > 150 ) {
                TracerouteMap.prototype.digraph = TracerouteDigraph.prototype
                        .drawDigraph(graph.options.config.tracemap.paths);
            }

            this.makePathsCallback(graph);
        }
    }

    this.makePathsCallback = function(graph) {
        if ( graph.options.height > 150 ) {
            this.drawDetailGraph();

            /* Update the displayed summary range, if needed */
            this.updateSummaryGraph();
        } else {
            /* Redraw the summary, but leave detail alone */
            this.summarycomponent.draw();

            /* Trigger a selection event to redraw the handles and
             * selection box. */
            if ( this.detailgraph.start !== undefined ) {
                this.triggerSelection(this.detailgraph.start,
                        this.detailgraph.end);
            } else {
                this.updateDetailGraph();
            }

            /* display the legend once pretty much everything has loaded */
            this.displayLegend();
        }
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
