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
    /* This is used in a few places to refer to the graph itself from within
     * another function */
    var basic = this;

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

    this.stylename = "basic";

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
        dataAvail: false,
        options: jQuery.extend(true, {}, CuzDefaultDetailConfig)
    }


    /* Configuration for the summary graph
     *
     * Note: CuzDefaultSummaryConfig is defined in config.js
     */
    this.summarygraph = {
        start: null,
        end: null,
        scale: 30,
        dataAvail: false,
        options: jQuery.extend(true, {}, CuzDefaultSummaryConfig)
    }

    var detconf = this.detailgraph.options.config;
    var sumconf = this.summarygraph.options.config;

    /* Set config options that are dependent on passed parameters */
    detconf.yaxis.min = this.miny;
    detconf.yaxis.max = this.maxy;
    sumconf.yaxis.min = this.miny;
    sumconf.yaxis.max = this.maxy;
    detconf.yaxis.title = params.ylabel;

    if (params.firstts == undefined || params.firstts == null)
        this.summarygraph.startlimit = 0;
    else
        this.summarygraph.startlimit = params.firstts;

    var deb = params.drawEventsBehind;
    if ( !(deb == undefined || deb == null) ) {
        if ( deb === true || deb === false ) {
            detconf.events.drawBehind = deb;
            sumconf.events.drawBehind = deb;
        } else if ( deb === "detail" ) {
            detconf.events.drawBehind = true;
            sumconf.events.drawBehind = false;
        } else if ( deb === "summary" ) {
            sumconf.events.drawBehind = true;
            detconf.events.drawBehind = false;
        }
    }


    /* Core functions
     * --------------
     *
     * Avoid overriding these functions!
     */

    /**
     * Creates both the summary and detail graphs, populates them with data
     * based on the initial selection and draws the graphs.
     *
     * Generally, you'll want to call this as soon as you've instantiated
     * your instance of this class.
     */
    this.createGraphs = function() {
        /* Define our line styles */
        basic.configureStyle();

        /* Calculate the amount of summary data we'll need */
        basic.calcSummaryRange();

        basic.processLegend();

        basic.setSummaryAxes();
        basic.setDetailAxes();
        basic.fetchEventData();
        basic.displayLegend();

        basic.fetchSummaryData();
        basic.fetchDetailData(true);

    }

    this.processLegend = function() {
        var sumopts = this.summarygraph.options;
        var groups = [];
        var legenddata = this.legenddata;


        this.summarygraph.fetched = this.summarygraph.end + 1;
        this.summarygraph.drawn = this.summarygraph.end + 1;
        sumopts.data = [];
        sumopts.data.push([]);

        /*
         * Neither the python that this came from or javascript can guarantee
         * any sort of order for objects/dicts, so grab the keys and sort them.
         */
        for ( var group_id in legenddata ) {
            if ( legenddata.hasOwnProperty(group_id) )
                groups.push(group_id);
        }
        groups.sort();
        /*
         * Iterate over the lines that are in the legend (in order) and add
         * the appropriate data to the list as we go.
         */
        $.each(groups, function(index, group_id) {
            for ( var index in legenddata[group_id].lines ) {
                if ( legenddata[group_id].lines.hasOwnProperty(index) ) {
                    var line = legenddata[group_id].lines[index][0];
                    sumopts.data.push( {
                        name: line,
                        data: {
                            colourid: legenddata[group_id].lines[index][2],
                            series: []
                        },
                        events: {
                            /* only first series needs to show these events */
                            show: false
                        }
                    });
                }
            }

        });
    }

    /* display the list of current data series shown on the graph */
    this.displayLegend = function() {
        var legend = {};
        var colourid = 0;

        for ( var g in this.legenddata ) {
            if ( this.legenddata.hasOwnProperty(g) ) {
                var group = this.legenddata[g];
                serieskeys = [];

                for ( var line in group.lines ) {
                    if ( group.lines.hasOwnProperty(line) ) {
                        var key = group['lines'][line]

                        serieskeys.push({'key':key[0], 'shortlabel':key[1],
                                'colourid':key[2]});
                        colourid ++;
                    }
                }

                legend[group.group_id] = {
                    "label": group.label,
                    "series": serieskeys
                };
            }
        }

        if ( graphPage.displayLegend != undefined ) {
            graphPage.displayLegend(legend, this.stylename);
        }
    }

    /* build up a url with all of the stream ids in it */
    this.makeURL = function(baseurl) {
        var url = baseurl;

        for ( var line in this.lines ) {
            if ( this.lines.hasOwnProperty(line) ) {
                url += this.lines[line].id;
                if ( line < this.lines.length - 1 ) {
                    url += "-";
                }
            }
        }

        return url;
    }

    this._receivedSummaryData = function() {
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
    }

    this.receivedSummaryData = function(callback) {
        this._receivedSummaryData();

        if ( callback )
            callback();
    }

    /* Queries for data required to draw the summary graph. */
    this.fetchSummaryData = function(callback) {
        /* If we have an outstanding query for summary data, abort it */
        //if (this.summaryreq)
        //    this.summaryreq.abort();

        if (this.summarygraph.fetched >= this.summarygraph.end)
            this.summarygraph.dataAvail = false;

        var fetchstart = this.summarygraph.fetched - (60 * 60 * 24 * 3);
        var fetchend = this.summarygraph.fetched - 1;
        if (fetchstart - 1 <= this.summarygraph.start)
            fetchstart = this.summarygraph.start;
        //this.summarygraph.fetched = fetchstart;

        var url = this.formSummaryURL(fetchstart, fetchend); 
        var graph = this;

        if (fetchstart > this.summarygraph.start) {
            this.summaryreq = $.getJSON(url, function(sumdata) {
                graph.processSummaryData(sumdata);
                graph.receivedSummaryData(callback);
            }).then(function() {
                return graph.fetchSummaryData();
            }).fail(function(jqXHR, textStatus, errorThrown) {
                /* Don't error on user aborted requests */
                if (globalVars.unloaded || errorThrown == 'abort') {
                    return;
                }
                displayAjaxAlert("Failed to fetch summary data",
                    textStatus, error);
            });
        } else {
            this.summaryreq = $.getJSON(url, function(sumdata) {
                graph.processSummaryData(sumdata);
                graph.receivedSummaryData(callback);
            }).fail(function(jqXHR, textStatus, errorThrown) {
                /* Don't error on user aborted requests */
                if (globalVars.unloaded || errorThrown == 'abort') {
                    return;
                }
                displayAjaxAlert("Failed to fetch summary data",
                    textStatus, errorThrown);
            });
        }

        return this.summaryreq;
    }

    /* Queries for all of the events observed within the summary graph range */
    this.fetchEventData = function(callback) {

        /* If we have an outstanding query for event data, abort it */
        if (this.eventreq)
            this.eventreq.abort();

        /* build up a url with all of the stream ids in it */
        var url = this.makeURL(this.eventurl);
        url += "/" + this.summarygraph.start + "/" + this.summarygraph.end;

        var graph = this;
        this.eventreq = $.getJSON(url, function(evdata) {
            /* When the events arrive, update our event lists */
            graph.detailgraph.options.config.events.events = evdata;
            graph.summarygraph.options.config.events.events = evdata;

            if (graph.summarygraph.dataAvail) {
                graph.processSummaryEvents();
                graph.drawSummaryGraph();

            }
            if (graph.detailgraph.dataAvail) {
                graph.processDetailedEvents();
                graph.drawDetailGraph();
            }
        }).fail(function(jqXHR, textStatus, errorThrown) {
            /* Don't error on user aborted requests */
            if (globalVars.unloaded || errorThrown == 'abort') {
                return;
            }
            displayAjaxAlert("Failed to fetch event data",
                textStatus, errorThrown);
        });
        return this.eventreq;
    }

    this.formDataURL = function() {

        var url = this.dataurl + "full/" + this.lines[0].id;
        url += "/" + this.detailgraph.start + "/" + this.detailgraph.end;

        return url;
    }

    this.formSummaryURL = function(fetchstart, fetchend) {

        var url = this.dataurl + "summary/" + this.lines[0].id;
        url += "/" + fetchstart + "/" + fetchend;

        return url;
    }

    /* Queries for the data required to draw the detail graph */
    this.fetchDetailData = function(firstfetch, callback) {
        /* If we have an outstanding query for detail data, abort it */
        if (this.detailreq)
            this.detailreq.abort();

        /* Update our URL to match the graph we're going to be showing */
        updatePageURL();
        /* Make sure we are going to generate a "fresh" set of X tic labels */
        resetDetailXTics();

        var url = this.formDataURL();
        var graph = this;
        this.detailgraph.dataAvail = false;
        this.detailreq = $.getJSON(url, function(detaildata) {
            graph.processDetailedData(detaildata, function() {
                if (graph.detailcomponent == null)
                    createEnvision(graph);

                if (graph.summarygraph.dataAvail && firstfetch) {
                    graph.triggerSelection(graph.detailgraph.start, graph.detailgraph.end);
                }
                graph.drawDetailGraph();

                if ( callback )
                    callback();
            });

        }).fail(function(jqXHR, textStatus, errorThrown) {
            /* Don't error on user aborted requests */
            if (globalVars.unloaded || errorThrown == 'abort') {
                return;
            }
            displayAjaxAlert("Failed to fetch detailed data",
                textStatus, errorThrown);
        });

        return this.detailreq;
    }

    /* Determines an appropriate range for the summary graph based on the
     * current selected region and updates the summary range accordingly. */
    this.calcSummaryRange = function() {
        var changeScale = false;
        var now = Math.round((new Date()).getTime() / 1000);
        /* Round to next minute boundary */
        now = Math.ceil(now / 60) * 60;
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

        /* Fetch new summary and event data. When we've got that, draw
         * a new and improved summary graph */

        /* Remove all the old summary data in preparation for our new data */
        this.processLegend();

        this.fetchEventData();

        this.fetchSummaryData(function() {
            basic.mergeDetailSummary();
            basic.drawDetailGraph();
        });

    }

    /* Updates an existing detail graph to show the currently selected time
     * period.
     */
    this.updateDetailGraph = function() {
        window.clearTimeout(this.selectingtimeout);
        this.selectingtimeout = null;

        this.fetchDetailData(false, function() {
            basic.mergeDetailSummary();

            if (basic.calcSummaryRange() == true)
                basic.updateSummaryGraph();
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
                    min: start * 1000.0
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

            /* First, deal with the case where we have no data at all 
             * Remember the empty event series! */
            if (this.summarygraph.options.data.length <= 1) {
                this.summarygraph.start = this.summarygraph.end - oneweek;
                return;
            }

            var firstdata = this.summarygraph.options.data[1][0];
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
            events = this.detailgraph.options.config.events.events;
            div = this.detailgraph.options.config.events.binDivisor;
            binsize = Math.round((this.detailgraph.end * 1000 -
                    this.detailgraph.start * 1000) / div);
        } else {
            events = this.summarygraph.options.config.events.events;
            div = this.summarygraph.options.config.events.binDivisor;
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

    this.setSummaryAxes = function() {
        var sumopts = this.summarygraph.options;
        /* Update the X axis and generate some new tics based on the time
         * period that we're covering.
         */
        sumopts.config.xaxis.min = this.summarygraph.start * 1000.0;
        sumopts.config.xaxis.max = this.summarygraph.end * 1000.0;
        sumopts.config.xaxis.ticks =
                generateSummaryXTics(this.summarygraph.start,
                                     this.summarygraph.end);
        sumopts.config.yaxis.max = 1;
    }

    this.setDetailAxes = function() {
        var detopts = this.detailgraph.options;

        detopts.config.xaxis.min = this.detailgraph.start * 1000.0;
        detopts.config.xaxis.max = this.detailgraph.end * 1000.0;
        detopts.config.yaxis.max = 1;

    }


    /* Processes the data fetched for the summary graph. */
    this.processSummaryData = function(sumdata) {

        var sumopts = this.summarygraph.options;
        var newdata = [];
        var graph = this;
        var fetched = this.summarygraph.fetched;

        /* This is pretty easy -- just copy the data (by concatenating an
         * empty array onto it) and store it with the rest of our graph options


        /* Replace existing summary data for each line with the summary
         * data we just received.
         */
        $.each(sumopts.data, function(index, series) {
            var name = series.name;
            if ( name == undefined || !sumdata.hasOwnProperty(name) )
                return;

            var result = sumdata[name];
            /* Reverse-iterate through the result and pop any values
             * for timestamps that we already have. Block alignments often
             * mean that we get a few extra datapoints after our requested
             * end timestamp, so we need to avoid duplicating them in our
             * series.
             */
            for (var i = result.length - 1; i >= 0; i--) {
                if (result[i][0] / 1000.0 >= graph.summarygraph.fetched) {
                    result.splice(i,1);
                } else {
                    /* As soon as we hit a timestamp we haven't already 
                     * got, we can stop rather than iterating through the
                     * whole result */
                    break;
                }
            };

            newdata = result.concat(series.data.series);
            series.data.series = newdata;

            /* Update fetched to the first datapoint in the returned series.
             * Due to block alignments, this may be a timestamp < what we
             * requested.
             */
            if (series.data.series.length > 0) {
                var firstfetch = series.data.series[0][0] / 1000.0;
                if (firstfetch < fetched)
                    fetched = firstfetch;
            }

        });

        if (fetched < this.summarygraph.fetched) 
            this.summarygraph.fetched = fetched;
    }

    this.mergeDetailSummary = function() {
        var detopts = this.detailgraph.options;
        var sumdata = this.summarygraph.options.data;
        /* Take a copy of the current detail data */
        var detaildata = detopts.data.concat([]);

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

                var sumvals = sumdata[index].data.series;
                var detvals = detaildata[index].data.series;

                var name = sumdata[index].name;
                var colourid = sumdata[index].data.colourid
                if ( detaildata[index].name == sumdata[index].name ) {
                    /* Our detail data set also includes all of the summary
                     * data that is not covered by the detail data itself.
                     * This is so we can show something when a user pans or
                     * selects outside of the current detail view, even if it
                     * is highly aggregated summary data.
                     *
                     * This first loop puts in all the summary data from before
                     * the start of our detail data.
                     */
                    for (i = 0; i < sumvals.length; i++) {
                        //var str = sumdata[index].data[i][0] + " " + detaildata[name][0][0];

                        if (detaildata[index].name == null ||
                                detvals.length < 1 ||
                                sumvals[i][0] < detvals[0][0]) {
                            newdata.push(sumvals[i]);
                        } else {
                            break;
                        }
                    }

                    /* Now chuck in the actual detail data that we got */
                    newdata = newdata.concat(detvals);

                    /* Finally, append the remaining summary data */
                    for ( ; i < sumvals.length; i++) {
                        if (sumvals[i][0] > detvals[detvals.length - 1][0]) {
                            newdata.push(sumvals[i]);
                        }
                    }
                }

                /* add the data series, making sure mouse tracking stays off */
                detopts.data.push( {
                    data: {
                        colourid: colourid,
                        series: newdata,
                    },
                    name: detaildata[index].name,
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
    }

    /**
     * Process the data fetched for the detail graph and form an appropriate
     * data set for plotting. No callback is fired when this method completes.
     */
    this._processDetailedData = function(detaildata) {
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
    }

    /**
     * Process the data fetched for the detail graph and form an appropriate
     * data set for plotting. A callback is fired when this method completes.
     */
    this.processDetailedData = function(detaildata, callback) {
        this._processDetailedData(detaildata);

        /* This comes from the traceroute-map code... */
        /*
        if ( callback )
            callback();
        */
        return;
    }

    /* Forces the detail graph to be re-drawn */
    this.drawDetailGraph = function() {
        if ( !this.interaction ) {
            createEnvision(this);
        }

        /* A slightly complicated way of forcing the detail graph to be drawn */
        _.each(this.interaction.followers, function(follower) {
            follower.draw();
        }, this);
    }

    this.drawSummaryGraph = function() {

        var undrawn = this.summarygraph.drawn - this.summarygraph.fetched;
        if (undrawn > 24 * 60 * 60 * 7 || 
                this.summarygraph.drawn >= this.summarygraph.end ||
                this.summarygraph.fetched == this.summarygraph.start) {
            this.summarycomponent.draw();
            this.summarygraph.drawn = this.summarygraph.fetched;
        }

        /* Trigger a selection event so that our selection controls get
         * drawn properly */
        if (this.detailgraph.dataAvail) {
            this.triggerSelection(this.detailgraph.start, this.detailgraph.end);
        }
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
                    graph.ongoingSelect, 250);
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
            
            var currseries = data[series].data.series;

            if (startind === null) {
                for (i = 0; i < currseries.length; i++) {
                    if (currseries[i][0] >= start * 1000) {
                        startind = i;
                        break;
                    } else {
                        continue;
                    }
                }
            } 
            
            if (startind > 0) {
                if (currseries[startind - 1][1] != null) {
                    if (maxy < currseries[startind - 1][1])
                        maxy = currseries[startind - 1][1];
                }
            }
            
            if (startind === null)
                continue;
             
            for (i = startind; i < currseries.length; i++) {    
                
                if (currseries[i][1] == null)
                    continue;
                if (currseries[i][1] > maxy)
                    maxy = currseries[i][1];

                if (currseries[i][0] > end * 1000)
                    break;
            }
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
        var events = o.series.events.events;
        var desc = "";

        var hits = o.series.events.hits;
        for (var i = 0; i < hits[o.index].length; i++) {
            var date = new Date(hits[o.index][i].ts);
            desc += "<p>";
            desc += date.toLocaleTimeString();
            desc += " " + hits[o.index][i].tooltip;
            desc += " (Detected by " + hits[o.index][i].detectors + ")";
            desc += "</p>";

            if ( i + 1 < hits[o.index].length ) {
                desc += "<hr />";
            }
        }

        if (desc.length > 0)
            return desc;
        return "Unknown event";
    }

    this.displayTooltip = function(o) {
        if (o.nearest.event) {
            return this.displayEventTooltip(o);
        }

        var legenddata = o.nearest.series.basicts.legenddata;

        /* Quick loop to count number of groups - break early if possible */
        var count = 0;
        for ( var group in legenddata ) {
            if ( legenddata.hasOwnProperty(group) ) {
                count++;
                if ( count > 1)
                    break; /* We don't care if the count is any greater */
            }
        }

        for ( var group in legenddata ) {
            if ( legenddata.hasOwnProperty(group) ) {
                for ( var i = 0; i < legenddata[group].lines.length; i++ ) {
                    var colourid = legenddata[group].lines[i][2];
                    if ( colourid === o.nearest.index ) {
                        var ip = legenddata[group].lines[i][1];
                        var colour = getSeriesStyle(colourid);
                        var key = "<em style='color:"+colour+";'>&mdash;</em>";
                        var disambiguate = "";

                        /* If there is more than one group displayed on the
                         * graph, we need to distinguish between them */
                        if ( count > 1 ) {
                            disambiguate = legenddata[group].label + "<br />";
                        }

                        return disambiguate + key + " " + ip;
                    }
                }

            }
        }

        return "Unknown point";
    }


    /* Applies configuration that is specific to the style intended for
     * drawing the graphs.
     *
     * This will apply the default single line graph config. Override this
     * with your own Flotr styling options if creating a subclass.
     */
    this.configureStyle = function() {
        this.detailgraph.options.config.basicts =
                jQuery.extend(true, {}, CuzBasicLineConfig);
        this.detailgraph.options.config.basicts.legenddata = this.legenddata;
        this.summarygraph.options.config.basicts =
                jQuery.extend(true, {}, CuzBasicLineConfig);
        this.summarygraph.options.config.basicts.legenddata = this.legenddata;
                jQuery.extend(true, {}, CuzBasicLineConfig);
    }


    /* Leave these down here */
    this.detailgraph.options.config.xaxis.tickFormatter = displayDetailXTics;

    /* Setup mouse tracking tooltips: replace the value of "this" with something
     * that is useful to us */
    this.detailgraph.options.config.mouse.trackFormatter = function(o) {
        return basic.displayTooltip.call(basic, o);
    }
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
