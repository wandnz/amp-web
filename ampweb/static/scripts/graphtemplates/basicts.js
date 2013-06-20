/*
 *
 * Already set by previous scripts:
 *      source
 *      dest
 *      request
 *
 * Object contains:
 *      container: reference to DOM object that the graph should be drawn in
 *      start: summary graph start time in milliseconds
 *      end: summary graph end time in milliseconds
 *      urlbase: base url to query for graph data
 *	miny: minimum y-axis value
 * 	maxy: maximum y-axis value
 *	ylabel: label for the y-axis
 */
function BasicTimeSeries(object) {
    /* container is the part of the page the graph should be drawn in */
    var container = object.container;
    /* vis is a reference to the envision visualisation - the graph */
    var vis;
    var summary;
    /* timeout stores a javascript timeout function that will refresh data */
    var timeout;
    var interaction;

    /* start/end times for the detail graph */
    var start = object.start;
    var end = object.end;
    var urlbase = object.urlbase;
    var miny = object.miny
    var maxy = object.maxy
    var ylabel = object.ylabel
    var url = urlbase + "/" + (object.generalstart/1000) + "/" +
        (object.generalend/1000);
    var event_urlbase = object.event_urlbase;
    var sumxtics = object.xticlabels;

    /* XXX Bad hard coding */
    var binDivisor = 150.0;

    if (maxy == undefined) {
        maxy = null;
    }
    if (miny == undefined) {
        miny = null;
    }

    /* stack of previous detail graph positions to use as a selection history */
    var previous = [];
    var prev_start;
    var prev_end;

    request = $.getJSON(url, function (initial_data) {
        var current_data = initial_data;
        var options;
        var detail_options;
        var summary_options;

        detail_options = {
            name: "detail",
            /* this is a copy of data so we can mess with it later */
            data: [{data:current_data.concat([]),mouse:{track:false}}, [[0],[0]]],
            height: 300,
            config: {
                HtmlText: false,
                title: " ",
                /* use "lines" to get missing values properly displaying */
                "lines": {
                    show: true,
                    fill: true,
                    fillColor: "#CEE3F6",
                    fillOpacity: 0.7,
                    lineWidth: 2,
                },
                events: {
                    show: true,
                    events: [], /* events are populated via an ajax request */
                    binDivisor: binDivisor,
                },
                /* XXX Copied blindly from smoke.js */
                mouse: {
                    track: true,
                    /* tooltips following the mouse were falling off screen */
                    relative: false,
                    trackY: true,
                    trackAll: false,
                    /* TODO nicer formatting for the tooltips? */
                    trackFormatter: function(o) {
                        var i;
                        var events = o.series.events.events;
                        var desc = "";
                        var binsize = Math.round((end - start) / binDivisor);
                        for ( i = 0; i < events.length; i++ ) {
                            /* find the timestamp at the start of this bin */
                            var bin_ts = events[i].ts - (events[i].ts%binsize);
                            /* if it matches the mouse hit, add the event */
                            if ( bin_ts == o.x ) {
                                var date = new Date(events[i].ts);
                                desc += date.toLocaleString();
                                desc += " " + events[i].severity + "/100";
                                desc += " " + events[i].description + "<br />";
                            }
                            /* abort checking early once we pass the hit */
                            if ( bin_ts > o.x ) {
                                break;
                            }
                        }
                        if ( desc.length > 0 ) {
                            return desc;
                        }
                        return "Unknown event";
                    },
                },

                selection: {
                    mode: "x",
                },
                xaxis: {
                    showLabels: true,
                    mode: "time",
                    timeformat: "%h:%M:%S",
                    timeMode: "local",
                    margin: true,
                },
                yaxis: {
                    min: miny,
                    max: maxy,
                    showLabels: true,
                    autoscale: true,
                    title: ylabel,
                    margin: true,
                    titleAngle: 90,
                },
                grid: {
                    color: "#0F0F0F",
                    verticalLines: true,
                    horizontalLines: true,
                    outline: "sw",
                    outlineWidth: 1,
                    labelMargin: 8,
                },
            },
        };

        /* create a useful label for the X axis based on the local timezone */
        var parts = (new Date()).toString().split(" ");
        var datestr = parts[5] + " " + parts[6];

        summary_options = {
            name: "summary",
            data: current_data.concat([]),
            height: 70,
            config: {
                HtmlText: false,
                "lines": {
                    show: true,
                    fill: true,
                    fillColor: "#CEE3F6",
                    fillOpacity: 0.7,
                    lineWidth: 2,
                },
                events: {
                    show: true,
                    events: [], /* events are populated via an ajax request */
                    binDivisor: binDivisor,
                },
                selection: {
                    mode: "x",
                    color: "#00AAFF",
                },
                xaxis: {
                    ticks: sumxtics,
                    mode: "time",
                    title: datestr,
                    showLabels: true,
                    timeformat: "%h:%M:%S",
                    timeMode: "local",
                    margin: true,
                    min: object.generalstart,
                },
                yaxis: {
                    autoscale: true,
                    min: 0,
                },
                grid: {
                    color: "#0F0F0F",
                    verticalLines: true,
                    labelMargin: 8,
                    outline: "s",
                    outlineWidth: 1,
                    outlineColor: "#999999",
                },
            },
        };


        /* this callback is used whenever the summary graph is selected on */
        summary_options.selectionCallback = (function () {
            /* this is local, persistent storage for the callback to use */
            var initial = initial_data;

            /* fetch data based on the current start and end of the detail
             * graph and update the current views
             */
            function fetchData(o) {
                $.getJSON(urlbase + "/" + Math.round(start/1000) + "/" +
                    Math.round(end/1000), function (fetched) {
                    /*
                     * Detailed data needs to be merged with the lower
                     * resolution data in order for lines to be visible in
                     * the detail view if selecting a new region in a
                     * different time period.
                     */
                    var i;
                    var newdata = []
                    newdata[0] = [];
                    newdata[1] = [];

                    /* fill in original data up to the point of detailed data */
                    for ( i=0; i<initial[0].length; i++ ) {
                        if ( initial[0][i] < fetched[0][0] ) {
                            newdata[0].push(initial[0][i]);
                            newdata[1].push(initial[1][i]);
                        } else {
                            break;
                        }
                    }

                    /* concatenate the detailed data to the list so far */
                    newdata[0] = newdata[0].concat(fetched[0]);
                    newdata[1] = newdata[1].concat(fetched[1]);

                    /* append original data after the new detailed data */
                    for ( ; i<initial[0].length; i++ ) {
                        if ( initial[0][i] >
                                fetched[0][fetched[0].length-1] ) {
                            newdata[0].push(initial[0][i]);
                            newdata[1].push(initial[1][i]);
                        }
                    }

                    detail_options.data[0].data = newdata;

                    /* set the start and end points of the detail graph */
                    detail_options.config.xaxis.min = start;
                    detail_options.config.xaxis.max = end;

                    /* update url to reflect current view */
                    var newtimes = {
                        "generalstart": Math.round(object.generalstart/1000),
                        "generalend": Math.round(object.generalend/1000),
                        "specificstart": Math.round(start/1000),
                        "specificend": Math.round(end/1000)
                    };

                    updateSelectionTimes(newtimes);

                    if (prev_start && prev_end) {
                        previous.push([prev_start, prev_end]);
                    }
                    prev_start = start;
                    prev_end = end;

                    /* force the detail view (which follows this) to update */
                    _.each(interaction.followers, function (follower) {
                        follower.draw();
                    }, this);
                });
            }

            return function (o) {
                if ( vis ) {
                    /*
                     * Wait before fetching new data to prevent multiple
                     * spurious data fetches.
                     */
                    start = o.data.x.min;
                    end = o.data.x.max;
                    window.clearTimeout(timeout);
                    timeout = window.setTimeout(fetchData, 250);
                }
            }
        })();

        var zoomCallback = (function () {
            function triggerSelect() {
                /* save the current position before moving to the new one */
                if ( prev_start && prev_end ) {
                    previous.push([prev_start, prev_end]);
                    prev_start = false;
                    prev_end = false;
                }
                /*
                 * trigger a select event on the summary graph using the
                 * coordinates from the detail graph - this will cause the
                 * select box in the summary graph to move and fetch detailed
                 * data for the main graph.
                 */
                summary.trigger("select", {
                    data: { x: { min: start, max: end } }
                });
            }
            return function(o) {
                if ( vis ) {
                    if ( o ) {
                        /* proper argument "o", this is a selection */
                        if ( !prev_start && !prev_end ) {
                            prev_start = start;
                            prev_end = end;
                        }
                        start = o.data.x.min;
                        end = o.data.x.max;
                    } else {
                        /* no proper argument "o", assume this is a click */
                        if ( previous.length == 0 ) {
                            return;
                        }
                        /* return to the previous view we saw */
                        prev = previous.pop();
                        start = prev[0];
                        end = prev[1];
                        prev_start = false;
                        prev_end = false;
                    }
                    /*
                     * Wait before fetching new data to prevent multiple
                     * spurious data fetches.
                     */
                    window.clearTimeout(timeout);
                    timeout = window.setTimeout(triggerSelect, 250);
                }
            }
        })();

        /* fetch all the event data, then put all the graphs together */
        $.getJSON(event_urlbase + "/" + Math.round(object.generalstart/1000) +
                "/" + Math.round(object.generalend/1000),
                function(event_data) {

            detail_options.config.events.events = event_data;
            summary_options.config.events.events = event_data;

            /* create the visualisation/graph object */
            vis = new envision.Visualization();
            /* create detail graph, using the specific detail options */
            var detail = new envision.Component(detail_options);
            /* create the summary, using the specific summary options */
            summary = new envision.Component(summary_options);
            /*
             * create an interaction object that will link the two graphs so
             * that the summary selection updates the detail graph
             */
            interaction = new envision.Interaction();
            interaction.leader(summary)
                .follower(detail)
                .add(envision.actions.selection,
                        { callback: summary_options.selectionCallback });

            /*
             * create an interaction object that will link them in the other
             * direction too (detail selection updates summary )
             */
            var zoom = new envision.Interaction();
            zoom.group(detail);
            zoom.add(envision.actions.zoom, { callback: zoomCallback });

            /* add both graphs to the visualisation object */
            vis.add(detail).add(summary).render(container);

            /*
             * Set the initial selection to be the previous two days, or the
             * total duration, whichever is shorter.
             */
            summary.trigger("select", {
                data: { x: { max: end, min: start, } }
            });
        });


    });

}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
