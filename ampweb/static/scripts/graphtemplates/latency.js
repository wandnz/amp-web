/*
 * TODO Figure out a stable way to store start and end times - should it be
 * in seconds and converted to ms at the right time, or stored in ms and
 * converted to seconds at the right time? Currently it's very random.
 *
 * TODO set default selection to the last day?
 *
 * TODO where the hell has the left axis gone? why are the graphs different
 * sizes to each other and the old graphs?
 */

function Latency(object) {
    //var summarydata = object.summarydata;
    //var detaildata = object.detaildata;
    /* container is the part of the page the graph should be drawn in */
    var container = object.container;
    /* vis is a reference to the envision visualisation - the graph */
    var vis;
    var summary;
    /* timeout stores a javascript timeout function that will refresh data */
    var timeout;

    var host = "http://wand.net.nz:6544";
    var metric = "latency";
    var src = "ampz-waikato";
    var dst = "ampz-auckland";
    var start = 1360371618;
    var end = 1362963618;
    var urlbase = host+"/api/_graph/timeseries/"+metric+"/"+src+"/"+dst;
    var url = urlbase + "/" + start + "/" + end;


    $.getJSON(url, function (initial_data) {
        var current_data = initial_data;
        var options;
        var detail_options;
        var summary_options;

        detail_options = {
            name: "detail",
            /* TODO should we have detailed data in initial view? */
            data: current_data.concat([]), // make a copy so I can trash others
            //data: detaildata,
            height: 300,
            config: {
                HtmlText: false,
                title: " ",
                //"lite-lines": {
                /* use "lines" to get missing values properly displaying */
                "lines": {
                    show: true,
                    fill: true,
                    fillColor: "#CEE3F6",
                    fillOpacity: 0.7,
                    lineWidth: 2,
                },
                /* TODO make x selection in detail do something */
                selection: {
                    mode: "x",
                },
                xaxis: {
                    showLabels: true,
                    mode: "time",
                    timeformat: "%h:%M:%S",
                    timeMode: "local",
                    margin: true,
                    max: end * 1000,
                    min: (end - (60*60*48)) * 1000,
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
            //data: summarydata,
            height: 70,
            config: {
                HtmlText: false,
                //"lite-lines": {
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
                $.getJSON(urlbase+"/"+start+"/"+end, function (fetched) {
                    /*
                     * Setting this here means that after doing a select, the
                     * detail graph *only* has the information from that select
                     * so won't show data in any new select that doesn't
                     * overlap. Is this what Chris was trying to solve by
                     * interleaving low and high res data in the api?
                     *
                     * Could keep a copy of the original low res data around
                     * and merge it with the newly fetched high res data each
                     * time? Would that give the annoying flicker/change that
                     * the original system did?
                     */
                    //detail_options.data = fetched;//XXX put this back?

                    /*
                     * this reimplements what was done in api.py, which is
                     * best? less fetches of data or more work in javascript?
                     */
                    var i;
                    detail_options.data[0] = [];
                    detail_options.data[1] = [];
                    for ( i=0; i<initial[0].length; i++ ) {
                        /* fill in original data up to the point of new data */
                        if ( initial[0][i] < fetched[0][0] ) {
                            detail_options.data[0].push(initial[0][i]);
                            detail_options.data[1].push(initial[1][i]);
                        } else {
                            break;
                        }
                    }
                    detail_options.data[0] =
                        detail_options.data[0].concat(fetched[0]);
                    detail_options.data[1] =
                        detail_options.data[1].concat(fetched[1]);
                    for ( ; i<initial[0].length; i++ ) {
                        /* fill in original data up to the point of new data */
                        if ( initial[0][i] >
                                fetched[0][fetched[0].length-1] ) {
                            detail_options.data[0].push(initial[0][i]);
                            detail_options.data[1].push(initial[1][i]);
                        }
                    }

                    detail_options.config.xaxis.min = start * 1000;
                    detail_options.config.xaxis.max = end * 1000;

                    /* TODO update url to reflect current view */

                    //alert(summary);
                    //_.each(summary.selection.followers, function (follower) {
                    //    follower.trigger("zoom", o);
                    //}, this);
                    /* force the detail view (which follows this) to update */
                    _.each(interaction.followers, function (follower) {
                        //follower.trigger("zoom", o);
                        follower.draw();
                    }, this);
                });
            }

            // this is the function stored in summary_options.selectionCallback
            return function (o) {
                if ( vis ) {
                    /*
                     * Wait before fetching new data to prevent multiple
                     * spurious data fetches.
                     */
                    start = Math.round(o.data.x.min / 1000);
                    end = Math.round(o.data.x.max / 1000);
                    window.clearTimeout(timeout);
                    timeout = window.setTimeout(fetchData, 250);
                }
            }
        })();

        /* create the visualisation/graph object */
        vis = new envision.Visualization();
        /* create detail graph, using the specific detail options */
        var detail = new envision.Component(detail_options);
        /* create the summary, using the specific summary options */
        summary = new envision.Component(summary_options);
        /* create an interaction object that will link the two graphs */
        var interaction = new envision.Interaction();

        /* add both graphs to the visualisation object */
        vis.add(detail).add(summary).render(container);
        /*
         * Set up the interaction so that the detail graph follows the
         * summary graph and responds to changes there
         */
        interaction.leader(summary)
            .follower(detail)
            .add(envision.actions.selection,
                    { callback: summary_options.selectionCallback });
    });
}
