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

    /* If miny and maxy aren't explicitly set, set them to null otherwise
     * envision gets very unhappy */
    if (this.miny == undefined) {
        this.miny = null;
    }

    if (this.maxy == undefined) {
        this.maxy = null;
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
        start: params.generalstart,
        end: params.generalend,
        options: jQuery.extend(true, {}, CuzDefaultSummaryConfig),
    }
    
    /* Set config options that are dependent on passed parameters */
    this.detailgraph.options.config.yaxis.min = this.miny;
    this.detailgraph.options.config.yaxis.max = this.maxy;
    this.summarygraph.options.config.yaxis.min = this.miny;
    this.summarygraph.options.config.yaxis.max = this.maxy;
    this.detailgraph.options.config.yaxis.title = params.ylabel;


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
            });

    }


    /* Queries for data required to draw the summary graph. */
    this.fetchSummaryData = function() {
        /* If we have an outstanding query for summary data, abort it */
        if (this.summaryreq)
            this.summaryreq.abort();
        
        var url = this.dataurl + "/" + this.summarygraph.start + "/" + 
                this.summarygraph.end;

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

        var url = this.eventurl + "/" + this.summarygraph.start + "/" +
                this.summarygraph.end;
        
        var graph = this;
        this.eventreq = $.getJSON(url, function(evdata) {
            /* When the events arrive, update our event lists */   
            graph.detailgraph.options.config.events.events = evdata;
            graph.summarygraph.options.config.events.events = evdata;
        });
        return this.eventreq;
    }

    /* Queries for the data required to draw the detail graph */
    this.fetchDetailData = function() {
        /* If we have an outstanding query for detail data, abort it */
        if (this.detailreq)
            this.detailreq.abort();

        var url = this.dataurl + "/" + this.detailgraph.start + "/" +
                this.detailgraph.end;
        this.detailreq = $.getJSON(url);

        /* Don't process the detail data in here -- we need to be sure we
         * have all the summary data first! */
        return this.detailreq;
    }

    /* Updates an existing summary graph to cover a new time period */
    this.updateSummaryGraph = function(start, end) {
        
        /* Summary covers a new time period, update our internal vars */
        this.summarygraph.start = start;
        this.summarygraph.end = end;

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

    /* Processes the data fetched for the summary graph. */
    this.processSummaryData = function(sumdata) {
        var sumopts = this.summarygraph.options;

        /* This is pretty easy -- just copy the data (by concatenating an
         * empty array onto it) and store it with the rest of our graph options
         */
        sumopts.data = sumdata.concat([]);
        
        /* Update the X axis and generate some new tics based on the time
         * period that we're covering.
         */
        sumopts.config.xaxis.min = this.summarygraph.start * 1000.0;
        sumopts.config.xaxis.ticks = 
                generateSummaryXTics(this.summarygraph.start,
                                     this.summarygraph.end);

    }

    /* Processes the data fetched for the detail graph and forms an 
     * appropriate dataset for plotting.
     */
    this.processDetailedData = function(detaildata) {
        var newdata = [];
        var i;
        var detopts = this.detailgraph.options;
        var sumdata = this.summarygraph.options.data

        detopts.config.xaxis.min = this.detailgraph.start * 1000.0;
        detopts.config.xaxis.max = this.detailgraph.end * 1000.0;

        if (detaildata.length < 1)
            return;

        /* Our detail data set also includes all of the summary data
         * that is not covered by the detail data itself. This is so we can
         * show something when a user pans or selects outside of the current
         * detail view, even if it is highly aggregated summary data.
         *
         * This first loop puts in all the summary data from before the start
         * of our detail data.
         */
        for (i = 0; i < sumdata.length; i++) {
            if (sumdata[i][0] < detaildata[0][0] ) {
                newdata.push(sumdata[i]);
            } else {
                break;
            }
        }

        /* Now chuck in the actual detail data that we got */
        newdata = newdata.concat(detaildata);

        /* Finally, append the remaining summary data */
        for ( ; i < sumdata.length; i++) {
            if (sumdata[i][0] > detaildata[detaildata.length - 1][0]) {
                newdata.push(sumdata[i]);
            }
        }

        /* Save the data in our detail graph options -- make sure we put it
         * in index 0 so we don't clobber our event series */
        detopts.data[0].data = newdata;
        
        /* Make sure we autoscale our yaxis appropriately */
        if (this.maxy == null) {
            detopts.config.yaxis.max = this.findMaximumY(detaildata, 
                    this.detailgraph.start, this.detailgraph.end) * 1.1;
        }

    }

    /* Forces the detail graph to be re-drawn and updates the URL to match
     * the current selection.
     */
    this.drawDetailGraph = function() {
        var times = {
            "specificstart": this.detailgraph.start,
            "specificend": this.detailgraph.end
        };
        /* This will update the URL for us */
        updateSelectionTimes(times);

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
        var maxy = this.findMaximumY(this.detailgraph.options.data[0].data,
                this.detailgraph.start, this.detailgraph.end);

        this.detailgraph.options.config.yaxis.max = maxy * 1.1;
        this.selectingtimeout = null;


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
        var startind, i;

        startind = null;
        for (i = 0; i < data.length; i++) {
            if (startind === null) {
                if (data[i][0] >= start * 1000) {
                    startind = i;

                    if (i != 0) {
                        if (data[i - 1][1] == null)
                            continue
                        maxy = data[i - 1][1];
                    }
                } else {
                    continue;
                }
            }
            if (data[i][1] == null)
                continue;
            if (data[i][1] > maxy)
                maxy = data[i][1];

            if (data[i][0] > end * 1000)
                break;
        }
        if (maxy == 0 || maxy == null)
            return 1;

        return maxy;
    }
    
    /* Determines an appropriate tooltip to describe the event(s) being
     * moused over in the detail graph.
     *
     * This will produce a default tooltip with the severity, description etc,
     * but could be overridden to provide a more nuanced tooltip.
     */
    this.displayEventTooltip = function(o) {
        var i;
        var events = o.series.events.events;
        var desc = "";
        
        var binsize = Math.round((o.series.xaxis.max - o.series.xaxis.min) /
                o.series.events.binDivisor);

        /* XXX Looping over all the events to form our tooltip seems kinda
         * inefficient. Also, should we consider caching these so we don't
         * have to recalculate them?
         */
        for (i = 0; i < events.length; i++) {
            var bin_ts = events[i].ts - (events[i].ts % binsize);
            if (bin_ts == o.x) {
                var date = new Date(events[i].ts);
                desc += date.toLocaleString();
                desc += " " + events[i].metric_name;
                desc += " " + events[i].severity + "/100";
                desc += " " + events[i].description + "<br/>";
            }
            if (bin_ts > o.x)
                break;
        }
        if (desc.length > 0)
            return desc;
        return "Unknown event";
    
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
            this.displayEventTooltip;
    this.detailgraph.options.config.xaxis.tickFormatter = displayDetailXTics;

}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
