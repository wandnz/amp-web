/*
 * Object contains:
 *      container: reference to DOM object that the graph should be drawn in
 *      start: summary graph start time in milliseconds
 *      end: summary graph end time in milliseconds
 *      urlbase: base url to query for graph data
 *	    miny: minimum y-axis value
 * 	    maxy: maximum y-axis value
 *	    ylabel: label for the y-axis
 */

var basicts_request = undefined;

function BasicTimeSeries(object) {
    /* container is the part of the page the graph should be drawn in */
    var container = object.container;
    /* vis is a reference to the envision visualisation - the graph */
    var vis;
    var summary;
    /* timeout stores a javascript timeout function that will refresh data */
    var timeout;
    /* a second timeout for updating the y-axis while a selection is in
     * progress */
    var selecting_timeout = null;
    var interaction;

    /* start/end times for the detail graph */
    var start = object.start;
    var end = object.end;
    var urlbase = object.urlbase;
    var miny = object.miny
    var maxy = object.maxy
    var ylabel = object.ylabel
    var url = urlbase + "/" + Math.round(object.generalstart/1000) + "/" +
        Math.round(object.generalend/1000);
    var event_urlbase = object.event_urlbase;
    var sumxtics = object.xticlabels;
    var graphtype = object.graphtype;

    /*
     * Arbitrary number used to create event bins - if they are too close
     * together they look cluttered, so this can merge them. The default
     * divisor for binning data is 300.0 but the duration of the resulting
     * bins was too short, so now trying bins of double that duration.
     * TODO can we calculate this rather than hardcoding it?
     */
    var binDivisor = 150.0;

    if (maxy == undefined) {
        maxy = null;
    }
    if (miny == undefined) {
        miny = null;
    }

    if (basicts_request) {
        basicts_request.abort();
    }

    basicts_request = $.getJSON(url, function (initial_data) {
        var current_data = initial_data;
        var options;
        var detail_options;
        var summary_options;

        addZoomControl = function(image, leftoffset, topoffset, zoom) {
            var button =
                $('<img class="zoombutton" src="' + STATIC_URL + '/img/' +
                        image + '.png" ' + 'style="left:' + leftoffset +
                        'px; top:' + topoffset + 'px;' +
                        ' position:absolute; z-index:10; cursor:pointer;' +
                        ' opacity:0.6;">');

            button.click(function(e) {
                    e.preventDefault(); zoomButtonCallback(zoom);
            });
            button.appendTo(container);
        }

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
                events: {
                    show: true,
                    events: [], /* events are populated via an ajax request */
                    binDivisor: binDivisor,
                },
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
                                desc += " " + events[i].metric_name;
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
        var datestr = getTZLabel();

        summary_options = {
            name: "summary",
            /* easier to give data in a sensible format straight to flotr */
            skipPreprocess: true,
            data: current_data.concat([]),
            height: 70,
            config: {
                HtmlText: false,
                events: {
                    show: true,
                    events: [], /* events are populated via an ajax request */
                    binDivisor: binDivisor,
                },
                /*
                 * TODO may want to create our own selection plugin to make
                 * it easier to modify. I think it might be nice to be able
                 * to click and drag on the selection box to scroll rather
                 * than having to use the bottom handle. Would need to check
                 * if a mousedown event takes place within the area of the
                 * current selection and drag, or if outside then do selection.
                 * Also, might be a good idea to take no action on a single
                 * click, rather than clearing the selection.
                 */
                selection: {
                    mode: "x",
                    color: "#00AAFF",
                },
                handles : {
                    show: true,
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
                    /*
                     * Arbitrary multiplier to give more vertical room to
                     * display event marker digits. If this gets too high
                     * it compresses the y-axis and you can't see peaks, if
                     * it gets too low then the digits overlap the data line
                     * too much. 2.0 seems to work well so far for the data
                     * sources that I have seen.
                     */
                    autoscaleMargin: 2.0,
                    min: miny,
                    max: maxy,
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

        /* set up the small differences in graph types */
        if ( graphtype == "smoke" ) {
            /* enable smokey lines */
            detail_options.config.smoke = summary_options.config.smoke = {
                show: true
            };
        } else {
            /* enable regular lines */
            detail_options.config.lines = summary_options.config.lines = {
                show: true,
                fill: true,
                fillColor: "#CEE3F6",
                fillOpacity: 0.7,
                lineWidth: 2,
            };
        }

        /* this callback is used whenever the summary graph is selected on */
        summary_options.selectionCallback = (function () {
            /* this is local, persistent storage for the callback to use */
            var initial = initial_data;

            /* fetch data based on the current start and end of the detail
             * graph and update the current views
             */
            function fetchData(o) {
                if (selecting_timeout != null) {
                    window.clearTimeout(selecting_timeout);
                    selecting_timeout = null;
                }

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
                    if ( fetched.length > 0 ) {
                        var i;
                        var j;
                        var maxy = 0;
                        var newdata = [];

                        /* fill in original data up to start of detailed data */
                        for ( i=0; i<initial.length; i++ ) {
                            if ( initial[i][0] < fetched[0][0] ) {
                                newdata.push(initial[i]);
                            } else {
                                break;
                            }
                        }

                        /* Find out the maximum y value so we can set the y
                         * axis appropriately */
                        maxy = find_maximum_y(fetched);

                        /* concatenate the detailed data to the list so far */
                        newdata = newdata.concat(fetched);

                        /* append original data after the new detailed data */
                        for ( ; i<initial.length; i++ ) {
                            if ( initial[i][0]>fetched[fetched.length-1][0] ) {
                                newdata.push(initial[i]);
                            }
                        }

                        /*
                         * make sure the right series is updated, if we clobber
                         * the second series then we mess up mouse tracking
                         */
                        detail_options.data[0].data = newdata;
                    }
                    
                    detail_options.config.yaxis.max = maxy * 1.1;

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

            function find_maximum_y(alldata) {
                var maxy = 0;
                var i, startind, j;
                
                startind = null;
                for (i = 0; i < alldata.length; i++) {

                    /* Make sure we consider the datapoints either side of
                     * our displayed region to ensure that the line linking
                     * them to the displayed points doesn't go off the top
                     * of the graph.
                     */
                    if (startind === null) {
                        if (alldata[i][0] >= start) {
                            startind = i;

                            if (i != 0) {
                                if (graphtype == "smoke") {
                                    /* Account for the smoke by looking at the
                                     * individual ping measurements */
                                    for ( j = 3; j < alldata[i-1].length; j++) {
                                        if (alldata[i-1][j] == null)
                                            continue;
                                        if (alldata[i-1][j] > maxy)
                                            maxy = alldata[i-1][j];
                                    }
                                } else {
                                    if (alldata[i-1][j] == null)
                                        continue;
                                    maxy = alldata[i - 1][1];
                                }
                            }
                        } else {
                            continue;
                        }
                    }
                    
                    if (graphtype == "smoke") {
                        for ( j = 3; j < alldata[i].length; j++) {
                            if (alldata[i][j] == null) 
                                continue;
                            if (alldata[i][j] > maxy) 
                                maxy = alldata[i][j];
                        }
                    } else {
                        if (alldata[i][1] == null)
                            continue;
                        if (alldata[i][1] > maxy)
                            maxy = alldata[i][1];
                    }
                    
                    if (alldata[i][0] > end) {
                        break;    
                    }

                }
                if (maxy == 0 || maxy == null)
                    maxy = 1;
                return maxy;
            }


            function ongoingSelect(o) {
                /* User has been clicking and dragging for a wee while, so
                 * let's just make sure our max y-axis adjusts itself to 
                 * properly display the data in their ongoing selection.
                 */

                var maxy = 0;
                
                maxy = find_maximum_y(detail_options.data[0].data)

                detail_options.config.yaxis.max = maxy * 1.1;
                /* reset the timer */
                selecting_timeout = window.setTimeout(ongoingSelect, 200); 
                
            }

            return function (o) {
                if ( vis ) {
                    /*
                     * Wait before fetching new data to prevent multiple
                     * spurious data fetches.
                     */
                    start = Math.round(o.data.x.min);
                    end = Math.round(o.data.x.max);

                    if (selecting_timeout == null) {
                        selecting_timeout = window.setTimeout(ongoingSelect, 200);
                    }

                    window.clearTimeout(timeout);
                    timeout = window.setTimeout(fetchData, 250);
                }
            }
        })();
            
        summary_options.foo = function() {
        }


        /* fetch all the event data, then put all the graphs together */
        $.getJSON(event_urlbase + "/" + Math.round(object.generalstart/1000) +
            "/" + Math.round(object.generalend/1000),
            function(event_data) {

            var connection = new envision.Component({
                name: "connection",
                adapterConstructor: envision.components.QuadraticDrawing
            });

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
            interaction
                .follower(detail)
                .follower(connection)
                .leader(summary)
                .add(envision.actions.selection,
                { callback: summary_options.selectionCallback });

            /*
             * When we start dragging (a mousedown event) we need to listen
             * for a mousemove event (to update the graph) and a mouseup event
             * (to stop dragging).
             */
            function initDrag(e) {
                /*
                 * Record the location of the initial click so we can tell
                 * how far the mouse has been dragged
                 */
                drag_start = detail.api.flotr.getEventPosition(e);
                Flotr.EventAdapter.observe(detail.node, "mousemove", scroll);
                /* try to catch mouseup even if they move outside the graph */
                Flotr.EventAdapter.observe(document, "mouseup", stopDrag);
            }

            /* stop listening for mousemove events after getting a mouseup */
            function stopDrag() {
                Flotr.EventAdapter.stopObserving(detail.node, "mousemove",
                        scroll);
            }

            /*
             * Zoom in on a targetted location based on mousewheel scrolling.
             */
            function zoom(e) {
                var delta;
                var adjust;
                var position;
                var range;
                var ratio;

                /* don't pass this event on (prevent scrolling etc) */
                e.preventDefault();

                /* zoom in or out by 10% of the current view */
                adjust = 0.1;

                /* calculate multiplier to apply to current range */
                delta = e.originalEvent.detail ?
                    ((e.originalEvent.detail < 0) ? 1-adjust:1+adjust) :
                    ((e.originalEvent.wheelDelta) < 0) ? 1+adjust:1-adjust;

                /*
                 * Timestamp nearest to where the mouse pointer is. Ideally
                 * I think this should use offsetX to be relative to the target
                 * element, except that Firefox doesn't do that.
                 */
                position = detail.api.flotr.axes.x.p2d(
                    e.originalEvent.offsetX || e.originalEvent.layerX);
                /* new range that should be displayed after zooming */
                range = (end - start) * delta;
                /* ratio of the position within the range, to centre zoom */
                ratio = (position - start) / (end - start);

                /* lets not zoom in to less than a 30 minute range */
                if ( range <= (60 * 30 * 1000) ) {
                    return;
                }

                /* TODO: do something when we hit the edge of the summary */

                /*
                 * zoom in/out while trying to keep the same part of the graph
                 * under the mouse pointer.
                 */
                summary.trigger("select", {
                    data: {
                        x: {
                            max: position + (range * (1 - ratio)),
                            min: position - (range * ratio)
                        }
                    }
                });
            }

            /*
             * Scroll the graph using either a drag or the mousewheel.
             */
            function scroll(e) {
                var delta;
                var last_data;
                var first_data;

                /* don't pass this event on (prevent scrolling etc) */
                e.preventDefault();

                if ( e.type == "mousemove" ) {
                    /* mousemove event, see how far we have dragged */
                    var drag_end = detail.api.flotr.getEventPosition(e);
                    delta = drag_start.x - drag_end.x;

                } else if ( e.type == "mousewheel" ||
                        e.type == "DOMMouseScroll" ) {
                    /*
                     * mousewheel event, scroll the graph by a fraction of
                     * the time displayed
                     */
                    var adjust = (end - start) * 0.05;
                    /*
                     * FF has different ideas about how events work.
                     * FF: .detail property, x > 0 scrolling down
                     * Others: .wheelDelta property, x > 0 scrolling up
                     */
                    delta = e.originalEvent.detail ?
                        ((e.originalEvent.detail < 0) ? -adjust:adjust) :
                        ((e.originalEvent.wheelDelta) < 0) ? adjust:-adjust;
                }

                /* find endpoints of summary data, clamp to these */
                last_data = summary.api.flotr.axes.x.max;
                first_data = summary.api.flotr.axes.x.min;

                /* make sure we don't go past the right hand edge */
                if ( end + delta >= last_data ) {
                    if ( end >= last_data ) {
                        return;
                    }
                    delta = last_data - end;
                }

                /*
                 * Make sure we don't go past the left hand edge.
                 * TODO expand summary one level to include more data
                 */
                if ( start + delta <= first_data ) {
                    if ( start <= first_data ) {
                        return;
                    }
                    delta = first_data - start;
                }

                /*
                 * Update all the graphs as if this was a new selection.
                 * TODO can we be smarter and fetch less data? Only a little
                 * bit of the view is actually new.
                 */
                summary.trigger("select", {
                    data: {
                        x: {
                            max: end + delta,
                            min: start + delta,
                        }
                    }
                });
            }

            /* add both graphs to the visualisation object */
            container.empty();
            addZoomControl("zoom-out2", 80, 540, false);
            addZoomControl("zoom-in2", 890, 540, true);
            vis.add(detail).add(connection).add(summary).render(container);

            /* add the listener for mousedown that will detect dragging */
            Flotr.EventAdapter.observe(detail.node, "mousedown", initDrag);
            Flotr.EventAdapter.observe(detail.node, "mousewheel", zoom);
            Flotr.EventAdapter.observe(summary.node, "mousewheel", scroll);

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
