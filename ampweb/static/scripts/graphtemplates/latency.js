/*
 *
 * Already set by previous scripts:
 *      source
 *      dest
 *
 * Object contains:
 *      container: reference to DOM object that the graph should be drawn in
 *      start: summary graph start time in milliseconds
 *      end: summary graph end time in milliseconds
 */
function Latency(object) {
    /* container is the part of the page the graph should be drawn in */
    var container = object.container;
    /* vis is a reference to the envision visualisation - the graph */
    var vis;
    var summary;
    /* timeout stores a javascript timeout function that will refresh data */
    var timeout;

    var host = "http://wand.net.nz:6544";
    var metric = "latency";
    var start = object.start;
    var end = object.end;
    var urlbase = host+"/api/_graph/timeseries/"+metric+"/"+source+"/"+dest;
    var url = urlbase + "/" + (start/1000) + "/" + (end/1000);

    /* stack of previous detail graph positions to use as a selection history */
    var previous = [];

    $.getJSON(url, function (initial_data) {
        var current_data = initial_data;
        var options;
        var detail_options;
        var summary_options;

        detail_options = {
            name: "detail",
            /* this is a copy of data so we can mess with it later */
            data: current_data.concat([]),
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
                selection: {
                    mode: "x",
                },
                xaxis: {
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
                     * different time period.
                     */
                    var i;
                    detail_options.data[0] = [];
                    detail_options.data[1] = [];

                    /* fill in original data up to the point of detailed data */
                    for ( i=0; i<initial[0].length; i++ ) {
                        if ( initial[0][i] < fetched[0][0] ) {
                            detail_options.data[0].push(initial[0][i]);
                            detail_options.data[1].push(initial[1][i]);
                        } else {
                            break;
                        }
                    }

                    /* concatenate the detailed data to the list so far */
                    detail_options.data[0] =
                        detail_options.data[0].concat(fetched[0]);
                    detail_options.data[1] =
                        detail_options.data[1].concat(fetched[1]);

                    /* append original data after the new detailed data */
                    for ( ; i<initial[0].length; i++ ) {
                        if ( initial[0][i] >
                                fetched[0][fetched[0].length-1] ) {
                            detail_options.data[0].push(initial[0][i]);
                            detail_options.data[1].push(initial[1][i]);
                        }
                    }

                    /* set the start and end points of the detail graph */
                    detail_options.config.xaxis.min = start;
                    detail_options.config.xaxis.max = end;

                    /* TODO update url to reflect current view */

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

        /* create the visualisation/graph object */
        vis = new envision.Visualization();
        /* create detail graph, using the specific detail options */
        var detail = new envision.Component(detail_options);
        /* create the summary, using the specific summary options */
        summary = new envision.Component(summary_options);
        /*
         * create an interaction object that will link the two graphs so that
         * summary selection updates the detail graph
         */
        var interaction = new envision.Interaction();
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
            data: {
                x: {
                    max: end,
                    min: Math.max(end - (60 * 60 * 24 * 2 * 1000), start),
                }
            }
        });
    });

}
