/*
 * Display all the graphs shown on the dashboard on page load.
 */
$(document).ready(function() {
    var recent_container = $("#recent_graph");
    var source_container = $("#source_graph");
    var target_container = $("#target_graph");
    var end;
    var start;

    /* end the graph on the next 30min boundary, and start 24 hours earlier */
    end = Math.round(new Date().getTime() / 1000);
    end = end + ((60 * 30) - (end % (60 * 30)))
    start = end - (60 * 60 * 24);

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
        urlbase: API_URL + "/_event/source/"
    });

    /* draw bar graph showing most common event targets */
    drawEventSiteFrequencies({
        container: target_container[0],
        start: start,
        end: end,
        urlbase: API_URL + "/_event/target/"
    });

});
