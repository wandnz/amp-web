/*
 * Display all the graphs shown on the dashboard on page load.
 */
$(document).ready(function() {
    var recent_container = $("#recent_graph");
    var source_container = $("#source_graph");
    var target_container = $("#target_graph");
    var end;
    var start;
    var now;

    /* end the graph on the next 30min boundary, and start 24 hours earlier */
    now = Math.round(new Date().getTime() / 1000);
    end = now + ((60 * 30) - (now % (60 * 30)))
    start = end - (60 * 60 * 24);

    var togglestate = $.cookie("dashboardFilter")
    var evfilter = null;

    if (!togglestate) {
        togglestate = "show";
    }

    if (togglestate == "show") {
        evfilter = "rare";
        $('#filterbutton').text("Show Common Events");
    }
    else {
        $('#filterbutton').text("Hide Common Events");
    }

    getEvents($('#recentevents'), now - (60 * 60), now, 10, evfilter);

    /* draw time series graph showing when most recent events occurred */
    drawEventFrequencies({
        container: recent_container[0],
        start: start,
        end: end,
        urlbase: API_URL + "/_event/count/"
    });

    /* draw bar graph showing most common event sources */
    drawEventSiteFrequencies({
        container: source_container[0],
        start: start,
        end: end,
        urlbase: API_URL + "/_event/asns/"
    });


});

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
