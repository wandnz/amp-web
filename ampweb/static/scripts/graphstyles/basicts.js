/* Class that implements a basic time series graph within Cuz. The graph has
 * two components: a detail graph which shows the exact region selected by
 * the user and a summary graph which shows a much larger area for navigation
 * purposes.
 *
 * The graph style for both graphs is a simple line graph with impulses
 * marking detected events. This class will be sufficient for many collections,
 * as this will be all that they require.
 *
 * More complicated graph types, e.g. smokeping, can create a subclass which
 * overrides specific aspects of this class but retains the core functionality.
 *
 * The UI for the graphs are also implemented within this class, such as
 * using the mousewheel to zoom the detail graph or clicking and dragging on
 * the detail graph to pan. Much of the code for the interactions is not in
 * this file though -- it can be found in interaction.js.
 */

function BasicTimeSeriesGraph(params) {
    /* The HTML element where we are going to place our graphs */
    this.container = params.container;
    /* The envision visualisation object */
    this.vis = null;
    /* The envision component for the summary graph */
    this.summarycomponent = null;
    /* The envision component for the detail graph */
    this.detailcomponent = null;
    /* A window timeout for updating the detail graph while selecting */
    this.detailtimeout = null;
    /* A window timeout for fetching data once a selection is made */
    this.selectingtimeout = null;
    /* The envision interaction linking the summary selection to the detail
     * graph */
    this.interaction = null;
    /* The base URL for querying for new time series data */
    this.dataurl = params.urlbase;
    /* The base URL for querying for events */
    this.eventurl = params.event_urlbase;
    /* The minimum value for the Y axis -- if null, autoscale */
    this.miny = params.miny;
    /* The maximum value for the Y axis -- if null, autoscale */
    this.maxy = params.maxy;

    /* A request object for data for the summary graph */
    this.summaryreq = null;
    /* A request object for data for the detail graph */
    this.detailreq = null;
    /* A request object for event data */
    this.eventreq = null;

    this.lines = params.lines;
    this.legenddata = params.legenddata;

    /* If miny and maxy aren't explicitly set, set them to null otherwise
     * envision gets very unhappy */
    if (this.miny == undefined) {
        this.miny = null;
    }

    if (this.maxy == undefined) {
        this.maxy = null;
    }


    if (params.start == null || params.end == null) {
        var now = Math.round((new Date()).getTime() / 1000);
        params.end = now;
        params.start = now - (2 * 24 * 60 * 60);
    }

    /* Configuration for the detail graph
     *
     * Note: CuzDefaultDetailConfig is defined in config.js
     */
    this.detailgraph = {
        start: params.start,
        end: params.end,
        dragstart: null,
        ylabel: params.ylabel,
        options: jQuery.extend(true, {}, CuzDefaultDetailConfig),
    }


    /* Configuration for the summary graph
     *
     * Note: CuzDefaultSummaryConfig is defined in config.js
     */
    this.summarygraph = {
        start: null,
        end: null,
        scale: 30,
        options: jQuery.extend(true, {}, CuzDefaultSummaryConfig),
    }

    /* Set config options that are dependent on passed parameters */
    this.detailgraph.options.config.yaxis.min = this.miny;
    this.detailgraph.options.config.yaxis.max = this.maxy;
    this.summarygraph.options.config.yaxis.min = this.miny;
    this.summarygraph.options.config.yaxis.max = this.maxy;
    this.detailgraph.options.config.yaxis.title = params.ylabel;

    if (params.firstts == undefined || params.firstts == null)
        this.summarygraph.startlimit = 0;
    else
        this.summarygraph.startlimit = params.firstts;

    if ( !(params.drawEventsBehind == undefined ||
            params.drawEventsBehind == null)) {
        this.detailgraph.options.config.events.drawBehind =
                params.drawEventsBehind;
    }

    /* Core functions
     * --------------
     *
     * Avoid overriding these functions!
     */

    /* Creates both the summary and detail graphs, populates them with data
     * based on the initial selection and draws the graphs.
     *
     * Generally, you'll want to call this as soon as you've instantiated
     * your instance of this class.
     */
    this.createGraphs = function() {
        var basic = this;

        /* Define our line styles */
        basic.configureStyle();

        /* Calculate the amount of summary data we'll need */
        basic.calcSummaryRange();

        /* Query for all of the necessary data simultaneously and wait for
         * all queries to complete.
         */
        $.when(this.fetchSummaryData(), this.fetchEventData(),
                this.fetchDetailData())
            .done(function(sumdata, evdata, detaildata) {

                /* Create the envision components for our graphs */
                createEnvision(basic);

                /* Process the results of querying for detailed data. Note
                 * that we have to wait to do this processing because we
                 * also need the summary data.
                 *
                 * XXX Note that we need to use detaildata[0] NOT detaildata.
                 * The parameters you get in the .done function are more than
                 * just the results of the query.
                 */
                basic.processDetailedData(detaildata[0]);

                /* Trigger a selection event on the summary graph. This will
                 * cause our selection controls to be drawn.
                 */
                basic.triggerSelection(basic.detailgraph.start,
                        basic.detailgraph.end);

                /* Force the detail graph to be drawn and update our URL to
                 * match the current selection */
                basic.drawDetailGraph();

                /* once everything has loaded, display the legend */
                basic.displayLegend();
            });
    }

    /* display the list of current data series shown on the graph */
    this.displayLegend = function() {
        var legend = {};
        var sumdata = this.summarygraph.options.data;
        var colourid = 0;

        for ( var g in this.legenddata ) {
            var group = this.legenddata[g];
            serieskeys = [];

            for ( var key in group.keys ) {
                var line = group['keys'][key]
    
                serieskeys.push({'key':line[0], 'shortlabel':line[1], 
                        'colourid':line[2]});
                colourid ++;
            }
            legend[group.label] = {
                "series": serieskeys,
                "groupid": group.group_id,
            };
        }

        /*
        for ( var line in sumdata ) {
            var name = sumdata[line].name;
            if ( name == undefined ) {
                continue;
            }
            var parts = name.split("_");
            var label = parts[1] + " to " + parts[2];
            var options = parts[3];
            var aggregation;

            if ( parts[4] == undefined ) {
                aggregation = "FULL";
            } else if ( parts[4] == "ipv4" || parts[4] == "ipv6" ) {
                aggregation = "FAMILY";
            } else {
                aggregation = "NONE";
            }

            if ( legend[label] == undefined ) {
                legend[label] = {
                    "addresses": [],
                    "options": options,
                    "aggregation": aggregation,
                    "series": [],
                };
            }
            legend[label]["addresses"].push(parts[4]);
            legend[label]["series"].push(series);
            series++;
        }
        */

        if ( graphPage.displayLegend != undefined ) {
            graphPage.displayLegend(legend);
        }
    }

    /* Queries for data required to draw the summary graph. */
    this.fetchSummaryData = function() {
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
        });

        return this.summaryreq;
    }

    /* Queries for all of the events observed within the summary graph range */
    this.fetchEventData = function() {

        /* If we have an outstanding query for event data, abort it */
        if (this.eventreq)
            this.eventreq.abort();

        /* build up a url with all of the stream ids in it */
        var url = this.eventurl;
        for ( var line in this.lines ) {
            url += this.lines[line].id;
            if ( line < this.lines.length - 1 ) {
                url += "-";
            }
        }
        url += "/" + this.summarygraph.start + "/" + this.summarygraph.end;

        var graph = this;
        this.eventreq = $.getJSON(url, function(evdata) {
            /* When the events arrive, update our event lists */
            graph.detailgraph.options.config.events.events = evdata;
            graph.summarygraph.options.config.events.events = evdata;

            graph.processSummaryEvents();
        });
        return this.eventreq;
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
        this.detailreq = $.getJSON(url);

        /* Don't process the detail data in here -- we need to be sure we
         * have all the summary data first! */
        return this.detailreq;
    }

    /* Determines an appropriate range for the summary graph based on the
     * current selected region and updates the summary range accordingly. */
    this.calcSummaryRange = function() {
        var changeScale = false;
        var now = Math.round((new Date()).getTime() / 1000);
        var selrange = (this.detailgraph.end - this.detailgraph.start);
        var oneday = (24 * 60 * 60);

        /* Usual case, display one month of data */
        var days = 30;
        var sumrange = oneday * days;

        if (selrange > 0.75 * oneday * days) {
            /* Start at 3 months and keep doubling until we find a
             * summary range that covers our selection nicely */
            days = 90;
            while (selrange > 0.75 * oneday * days) {
                days *= 2;
                /* A bit of fudging so we can line up with the year
                 * boundary (not accounting for leap years!) */
                if (days == 360)
                    days = 365;
            }
            sumrange = oneday * days
        }

        /* Try to place our selection on the very left of the summary graph */
        var sumstart = this.detailgraph.start;
        var sumend = this.detailgraph.start + sumrange;

        /* EXCEPT, if our summary end is past "now". In this case, put "now"
         * hard up against the right edge of the summary graph. */
        if (sumend > now) {
            sumstart = now - sumrange;
            sumend = now;
        }

        /* If the scale has changed, let our caller know so they can fetch
         * new data and redraw the graph.
         */
        if (days != this.summarygraph.scale)
            changeScale = true;

        this.summarygraph.scale = days;
        this.summarygraph.start = sumstart;
        this.summarygraph.end = sumend;

        return changeScale;
    }

    this.updateSummaryGraph = function() {
        /* Don't bother changing anything if our summary range hasn't changed.
         */
        if (this.calcSummaryRange() == false)
            return;

        var basic = this;
        /* Fetch new summary and event data. When we've got that, draw
         * a new and improved summary graph */
        $.when(this.fetchSummaryData(), this.fetchEventData())
            .done(function(sumdata, evdata) {
                /* Redraw the summary, but leave detail alone */
                basic.summarycomponent.draw();
                /* Trigger a selection event to redraw the handles and
                 * selection box. */
                basic.triggerSelection(basic.detailgraph.start,
                        basic.detailgraph.end);
            })
            .fail(function() {
                /* TODO Put something in here to handle a request failing */
            });

    }

    /* Updates an existing detail graph to show the currently selected time
     * period.
     */
    this.updateDetailGraph = function() {
        var basic = this;
        window.clearTimeout(this.selectingtimeout);
        this.selectingtimeout = null;

        /* Fetch the data for the new time period */
        $.when(this.fetchDetailData())
            .done(function(detaildata) {
                /* Process the data */
                basic.processDetailedData(detaildata);
                /* Update the displayed summary range, if needed */
                basic.updateSummaryGraph();
                /* Draw the graph and update the URL */
                basic.drawDetailGraph();
            });
    }


    /* Triggers a Flotr "select" event on the summary component for a given
     * start and end value.
     */
    this.triggerSelection = function(start, end) {
        this.summarycomponent.trigger("select", {
            data: {
                x: {
                    max: end * 1000.0,
                    min: start * 1000.0,
                }
            }
        });
    }

    /* Given the summary data available, this function will re-align the
     * start of the summary graph so as to avoid the problem of having empty
     * space with no data.
     */
    this.determineSummaryStart = function() {
        var range = (this.summarygraph.end - this.summarygraph.start);
        var maxrange = this.summarygraph.end - this.summarygraph.startlimit;

        /* Add a little bit of whitespace to ensure it is obvious that we've
         * reached the maximum range of the summary graph */
        var padding = range * 0.025;
        var oneweek = 60 * 60 * 24 * 7;

        if (this.summarygraph.startlimit == 0) {
            /* No info from the stream about the first recorded datapoint, so
             * we'll try and use the first datapoint in our summary data */

            /* First, deal with the case where we have no data at all */
            if (this.summarygraph.options.data.length == 0) {
                this.summarygraph.start = this.summarygraph.end - oneweek;
                return;
            }

            var firstdata = this.summarygraph.options.data[0][0];
            if (firstdata / 1000.0 > this.summarygraph.start) {
                this.summarygraph.start = (firstdata / 1000.0);
                this.summarygraph.start -= padding;
            }
        } else {
            if (this.summarygraph.start < this.summarygraph.startlimit) {

                /* Always display at least a week on the summary graph */
                if (maxrange < oneweek + padding) {
                    this.summarygraph.start = this.summarygraph.end - oneweek;
                } else {
                    this.summarygraph.start = this.summarygraph.startlimit;
                }
                this.summarygraph.start -= padding;
            }
        }
    }

    this.processEvents = function(isDetailed) {
        var events,
            div,
            binsize,
            bin_ts = 0;

        if ( isDetailed ) {
            events = this.detailgraph.options.config.events.events,
            div = this.detailgraph.options.config.events.binDivisor,
            binsize = Math.round((this.detailgraph.end * 1000 -
                    this.detailgraph.start * 1000) / div);
        } else {
            events = this.summarygraph.options.config.events.events,
            div = this.summarygraph.options.config.events.binDivisor,
            binsize = Math.round((this.summarygraph.end * 1000 -
                    this.summarygraph.start * 1000) / div);
        }

        if ( events == undefined || events.length < 1 ) {
            return;
        }

        var hits = {};

        /*
        * Check each event bin to see if we need to merge any events, and
        * then display a line for each event bin containing events.
        */
        for ( var i = 0; i < events.length; i++ ) {
            if ( bin_ts > 0 &&
                    (events[i].ts - (events[i].ts % binsize)) == bin_ts ) {

                hits[bin_ts + (binsize / 2)].push(events[i]);

                continue;
            }

            /* new event or first event, reset statistics */
            bin_ts = events[i].ts - (events[i].ts % binsize);
            hits[bin_ts + (binsize / 2)] = [ events[i] ];
        }

        if ( isDetailed ) {
            this.detailgraph.options.config.events.hits = hits;
        } else {
            this.summarygraph.options.config.events.hits = hits;
        }
    }

    this.processSummaryEvents = function() {
        this.processEvents(false);
    }

    this.processDetailedEvents = function() {
        this.processEvents(true);
    }

    /* Processes the data fetched for the summary graph. */
    this.processSummaryData = function(sumdata) {
        this.processSummaryEvents();

        var sumopts = this.summarygraph.options;
        var legend = {};

        /* This is pretty easy -- just copy the data (by concatenating an
         * empty array onto it) and store it with the rest of our graph options
         */
        sumopts.data = []
        /* add the initial series back on that we use for eventing */
        sumopts.data.push([]);

        /*
         * The legend is our ground truth and is always sorted, so iterate
         * over the lines that are in the legend (in order) and add the data
         * as we go.
         */
        for ( var group_id in this.legenddata ) {
            for ( var index in this.legenddata[group_id].keys ) {
                var line = this.legenddata[group_id].keys[index][0];
                sumopts.data.push( {
                    name: line,
                    data: sumdata[line].concat([]),
                    events: {
                        /* only the first series needs to show these events */
                        show: false,
                    }
                });
            }

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
    }

    this.mergeDetailSummary = function(detaildata) {
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
                    var str = sumdata[index].data[i][0] + " " + detaildata[name][0][0];
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


    }

    /* Processes the data fetched for the detail graph and forms an
     * appropriate dataset for plotting.
     */
    this.processDetailedData = function(detaildata) {
        
        this.processDetailedEvents();

        var detopts = this.detailgraph.options;
        this.mergeDetailSummary(detaildata);
       
        /* Make sure we autoscale our yaxis appropriately */
        if ( this.maxy == null ) {
            detopts.config.yaxis.max = this.findMaximumY(detopts.data,
                    this.detailgraph.start, this.detailgraph.end) * 1.1;
        }

        return;
    }

    /* Forces the detail graph to be re-drawn and updates the URL to match
     * the current selection.
     */
    this.drawDetailGraph = function() {
        /* This will update the URL for us */
        updatePageURL(false);

        /* Make sure we are going to generate a "fresh" set of X tic labels */
        resetDetailXTics();

        /* A slightly complicated way of forcing the detail graph to be drawn */
        _.each(this.interaction.followers, function(follower) {
            follower.draw();
        }, this);
    }

    /* Callback that is invoked whenever a "select" event fires on the summary
     * graph. Will fire constantly as long as someone is clicking and dragging
     * on the summary graph, hence the timeouts to limit our reactions to
     * periods when the selection is not actively changing.
     */
    this.selectionCallback = function(sel) {

        var graph = this.actionOptions[0].graphobj;
        var newmin = Math.round(sel.data.x.min / 1000.0);
        var newmax = Math.round(sel.data.x.max / 1000.0);

        if (!graph.vis)
            return;

        /* If the selection hasn't changed, don't worry about trying to
         * change anything.
         */
        if (newmin == graph.detailgraph.start &&
                newmax == graph.detailgraph.end) {
            return;
        }

        /* Update our detail graph to cover the new selection */
        graph.detailgraph.start = newmin;
        graph.detailgraph.end = newmax;

        /* This will ensure the Y axis will autoscale while the user is
         * making a selection. If you don't do this, they may struggle to
         * see what they are selecting.
         */
        if (graph.selectingtimeout === null && graph.maxy == null) {
            graph.selectingtimeout = window.setTimeout.call(graph,
                    graph.ongoingSelect,250);
        }

        /* Don't update the detail graph itself until the user stops selecting
         * so as to prevent multiple incomplete fetches */
        window.clearTimeout(graph.detailtimeout);
        graph.detailtimeout = window.setTimeout.call(graph,
                graph.updateDetailGraph, 250);
    }

    /* Autoscales the Y axis while the user is currently making a selection */
    this.ongoingSelect = function(o) {
        var maxy = this.findMaximumY(this.detailgraph.options.data,
                this.detailgraph.start, this.detailgraph.end);

        this.detailgraph.options.config.yaxis.max = maxy * 1.1;
        this.selectingtimeout = null;

    }

    this.getSelectionRange = function() {

        var obj = {
            start: this.detailgraph.start,
            end: this.detailgraph.end,
            sumstart: this.summarygraph.start,
            sumend: this.summarygraph.end
        };

        return obj;
    }

    /**
     * Subclasses may override these functions if needed
     * -------------------------------------------------
     */


    /* Finds the largest displayable Y value in a given dataset. Datasets
     * usually include datapoints outside the viewable area, so 'start' and
     * 'end' indicate the boundaries of the displayed graph.
     *
     * This is a default function and will only look at the value in index
     * 1 for each datapoint. If your data is more complex, you may need to
     * override this function.
     */
    this.findMaximumY = function(data, start, end) {
        var maxy = 0;
        var startind, i, series;

        startind = null;
        for ( series = 0; series < data.length; series++ ) {
            if ( data[series].length == 0 ) continue;
            for (i = 0; i < data[series].data.length; i++) {
                if (startind === null) {
                    if (data[series].data[i][0] >= start * 1000) {
                        startind = i;

                        if (i != 0) {
                            if (data[series].data[i - 1][1] == null)
                                continue;
                            maxy = data[series].data[i - 1][1];
                        }
                    } else {
                        continue;
                    }
                }
                if (data[series].data[i][1] == null)
                    continue;
                if (data[series].data[i][1] > maxy)
                    maxy = data[series].data[i][1];

                if (data[series].data[i][0] > end * 1000)
                    break;
            }
        }

        if (maxy == 0 || maxy == null)
            return 1;

        return maxy;
    }

    /* Applies configuration that is specific to the style intended for
     * drawing the graphs.
     *
     * This will apply the default single line graph config. Override this
     * with your own Flotr styling options if creating a subclass.
     */
    this.configureStyle = function() {
        this.detailgraph.options.config.lines =
                jQuery.extend(true, {}, CuzBasicLineConfig);
        this.summarygraph.options.config.lines =
                jQuery.extend(true, {}, CuzBasicLineConfig);
    }


    /* Leave these down here */
    this.detailgraph.options.config.mouse.trackFormatter =
            BasicTimeSeriesGraph.prototype.displayEventTooltip;
    this.detailgraph.options.config.xaxis.tickFormatter = displayDetailXTics;

    return this;
}

/* Determines an appropriate tooltip to describe the event(s) being
 * moused over in the detail graph.
 *
 * This will produce a default tooltip with the severity, description etc,
 * but could be overridden to provide a more nuanced tooltip.
 */
BasicTimeSeriesGraph.prototype.displayEventTooltip = function(o) {
    var events = o.series.events.events;
    var desc = "";

    var hits = o.series.events.hits;
    for (var i = 0; i < hits[o.index].length; i++) {
        var date = new Date(hits[o.index][i].ts);
        desc += date.toLocaleTimeString();
        desc += " " + hits[o.index][i].tooltip;
        desc += " ( Severity: " + hits[o.index][i].severity + "/100 )";
        desc += "<br />";
    }

    if (desc.length > 0)
        return desc;
    return "Unknown event";
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
