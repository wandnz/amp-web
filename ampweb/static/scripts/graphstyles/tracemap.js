/*
 * This file is part of amp-web.
 *
 * Copyright (C) 2013-2017 The University of Waikato, Hamilton, New Zealand.
 *
 * Authors: Shane Alcock
 *          Brendon Jones
 *
 * All rights reserved.
 *
 * This code has been developed by the WAND Network Research Group at the
 * University of Waikato. For further information please see
 * http://www.wand.net.nz/
 *
 * amp-web is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 2 as
 * published by the Free Software Foundation.
 *
 * amp-web is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with amp-web; if not, write to the Free Software Foundation, Inc.
 * 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 *
 * Please report any bugs, questions or comments to contact@wand.net.nz
 */

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

    var detconf = this.detailgraph.options.config;
    var sumconf = this.summarygraph.options.config;

    /* Configuration for the detail graph */
    detconf.grid = {
        verticalLines: false,
        horizontalLines: false,
        outline: "",
        outlineWidth: 0
    };

    detconf.xaxis.showLabels = false;
    detconf.yaxis.showLabels = false;

    /* These need to be hardcoded to something so that tooltips work properly */
    detconf.yaxis.min = 0;
    detconf.yaxis.max = 1;

    /* Override the basic line style with our traceroute map style */
    this.configureStyle = function() {
        this.detailgraph.options.config.tracemap =
                jQuery.extend(true, {}, CuzTracerouteMapConfig);
        this.summarygraph.options.config.basicts =
                jQuery.extend(true, {}, CuzBasicLineConfig);
        this.summarygraph.options.config.basicts.isdetail = false;

        /* Remove unnecessary space at the top of the graph, normally used to
         * draw events */
        this.detailgraph.options.config.title = "";

        /* Force hide all events - although we do not ever fetch event data,
         * this avoids trying to do any extra hit detection etc. */
        this.detailgraph.options.config.events.show = false;
        this.summarygraph.options.config.events.show = true;
    };

    this.formDataURL = function() {
        var url = this.dataurl + "ippaths/" + this.lines[0].id;
        url += "/" + this.detailgraph.start + "/" + this.detailgraph.end;
        return url;
    };

    this.formSummaryURL = function(start, end) {
        var url = this.dataurl + "ippaths-summary/" + this.lines[0].id;
        url += "/" + start + "/" + end;
        return url;
    };

    //this.fetchSummaryData = function(callback) {
    //    return;
    //}

    /* Processes the data fetched for the summary graph. */
    this.mergeDetailSummary = function() {};

    /* Don't process events for the detail graph */
    this.processDetailedEvents = function() {};

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
    };

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

        /* XXX Remember to disable this condition if you're trying to
         * debug the createPaths function
         */
        if (typeof(Worker) !== undefined) {
            var worker = new Worker(STATIC_URL +
                    "scripts/graphstyles/tracemap-worker.js");

            worker.onmessage = function(event) {
                graph.options.config.tracemap.paths = event.data.paths;
                if (graph.options.height > 150) {
                    TracerouteMap.prototype.digraph = event.data.digraph;
                }

                if (callback) {
                    callback();
                }
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

            if (graph.options.height > 150) {
                TracerouteMap.prototype.digraph = drawDigraph(
                    graph.options.config.tracemap.paths
                );
            }

            if (callback) {
                callback();
            }
        }
    };

    this.displayTooltip = function(o) {
        if ( o.nearest.iplabel ) {
            var label = "";

            /* XXX probably better to not put NULL in here in the
             * first place?
             */
            if (o.nearest.iplabel == "NULL") {
                if (o.nearest.astext) {
                    return o.nearest.astext;
                } else {
                    return "Unknown";
                }
            }

            label = o.nearest.iplabel;
            if (o.nearest.astext) {
                label += "<br />" + o.nearest.astext;
            }
            return label;
        } else if ( o.nearest.edge ) {
            var digraph = TracerouteMap.prototype.digraph,
                paths = o.series.tracemap.paths;
            var uniquePaths = 0, totalOccurrences = 0;

            for (var k in digraph._edges) {
                var edge = digraph._edges[k];
                if (edge.u == o.nearest.edge.u && edge.v == o.nearest.edge.v) {
                    // Cool! These edges are the same
                    uniquePaths += edge.value.path.length;
                    totalOccurrences += edge.value.freq;
                }
            }

            return "" + uniquePaths + " unique paths through this edge<br />" +
                    totalOccurrences + " total hits through this edge";
        }
    };
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
