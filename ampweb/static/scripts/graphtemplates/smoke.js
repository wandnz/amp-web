/*
 * TODO: the only real difference between the smokeping and latency graphs
 * is how the data is interpreted and that "smoke" is true. They both do
 * exactly the same sorts of interactions, selections, summary/detail windows
 * etc, could they be combined in a nice way?
 *
 * TODO: fetch event data at a more sensible time? more sensible way? or is
 * this the best we can do?
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
 */
function Smoke(object) {
    /* container is the part of the page the graph should be drawn in */
    var container = object.container;
    /* vis is a reference to the envision visualisation - the graph */
    var vis;
    var summary;
    var interaction;
    /* timeout stores a javascript timeout function that will refresh data */
    var timeout;

    /* start/end times for the detail graph */
    var start = object.start;
    var end = object.end;
    var urlbase = object.urlbase;
    var event_urlbase = object.event_urlbase;
    var url = urlbase + "/" + Math.round(object.generalstart/1000) + "/" +
        Math.round(object.generalend/1000);

    /* stack of previous detail graph positions to use as selection history */
    var previous = [];

    request = $.getJSON(url, function (initial_data) {
        var current_data = initial_data;
        var options;
        var detail_options;
        var summary_options;

        detail_options = {
            name: "detail",
            /* easier to give data in a sensible format straight to flotr */
            skipPreprocess: true,
            /*
             * We only want mouse tracking on the events, not on the main
             * data series. One way to do this is to enable mouse tracking
             * globally, disable it on the main data series, and have an
             * extra dummy series that still has it enabled. (The events
             * currently exist in a weird state outside of any series, maybe
             * they should be their own one). If every series has tracking
             * disabled then no tracking will occur despite the global
             * config option.
             */
                /* this is a copy of data so we can mess with it later */
            data: [{data:current_data.concat([]),mouse:{track:false}}, []],
            height: 300,
            config: {
                HtmlText: false,
                title: " ",
                smoke: {
                    show: true,
                },
                events: {
                    show: true,
                    events: [], /* events are populated via an ajax request */
                },
                mouse: {
                    track: true,
                    relative: true,
                    trackY: true,
                    trackAll: false,
                    /* format the tooltip that appears on a hit */
                    trackFormatter: function(o) {
                        var i;
                        var events = o.series.events.events;
                        var desc = "";
                        for ( i = 0; i < events.length; i++ ) {
                            if ( events[i].ts == o.x ) {
                                if ( desc.length == 0 ) {
                                    var date = new Date(events[i].ts);
                                    desc = date.toLocaleString();
                                }
                                /* TODO sort by severity? */
                                desc += "<br />" + events[i].severity +
                                    "/100 " + events[i].description;
                            }
                            if ( events[i].ts > o.x ) {
                                break;
                            }
                        }
                        if ( desc.length > 0 ) {
                            return desc;
                        }
                        return "Unknown event"; },
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
                    min: 0,
                    showLabels: true,
                    /* TODO add max value here to fix yaxis? */
                    autoscale: true,
                    title: "Latency (ms)",
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
	        /* easier to give data in a sensible format straight to flotr */
    	    skipPreprocess: true,
	        data: current_data.concat([]),
            height: 70,
            config: {
                HtmlText: false,
                smoke: {
                    show: true,
                },
                events: {
                    show: true,
                    events: [], /* events are populated via an ajax request */
                },
                selection: {
                    mode: "x",
                    color: "#00AAFF",
                },
                xaxis: {
                    noTicks: 30,
                    mode: "time",
                    title: datestr,
                    showLabels: true,
                    timeformat: "%h:%M:%S",
                    timeMode: "local",
                    margin: true,
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
                     * different time period. We also have to be careful to
                     * preserve any other datasets that might be present,
                     * in our case the special config for this dataset to
                     * prevent mouse tracking and the dummy dataset that
                     * allows it.
                             */
                    var i;
                    var newdata = [];

                    /* fill in original data up to point of detailed data */
                    for ( i=0; i<initial.length; i++ ) {
                        if ( initial[i][0] < fetched[0][0] ) {
                            newdata.push(initial[i]);
                        } else {
                            break;
                        }
                    }
                    /* concatenate the detailed data to the list so far */
                    newdata = newdata.concat(fetched);

                    /* append original data after the new detailed data */
                    for ( ; i<initial.length; i++ ) {
                        if ( initial[i][0] > fetched[fetched.length-1][0] ) {
                            newdata.push(initial[i]);
                        }
                    }

                    /*
                     * make sure the right series is updated, if we clobber
                     * the second series then we mess up mouse tracking
                     */
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
                    start = Math.round(o.data.x.min);
                    end = Math.round(o.data.x.max);
                    window.clearTimeout(timeout);
                    timeout = window.setTimeout(fetchData, 250);
                }
            }
        })();

        var zoomCallback = (function () {
            var prev_start;
            var prev_end;
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
                        start = Math.round(o.data.x.min);
                        end = Math.round(o.data.x.max);
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
