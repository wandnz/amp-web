var scrolled = false;
var period = (60 * 60 * 6);
var container;

/* TODO: use existing filtering options for full list */
var infinitefilter = {};
infinitefilter.maxgroups = 0;
infinitefilter.showcommon = true;

$(document).ready(function() {
    /* load the initial set of events on page load */
    var start, end;
    end = Math.round((new Date()).getTime() / 1000);
    start = end - period;
    /* get the container once and cache it */
    container = $("#eventspace");
    /* fetch initial events to display */

    var foo = {};
    foo.maxgroups = 0;
    foo.showcommon = true;
    getEvents(container, start, end, infinitefilter);
});

/*
 * On every scroll event, mark the page as having scrolled. This is about
 * the bare minimum we can do in the scroll handler, so should be nice and
 * lightweight. Doing too much here would hurt performance.
 */
$(window).scroll(function() {
    scrolled = true;
});

/*
 * Check regularly if the page has scrolled and if so, check if it is near
 * the bottom of the page. If so, fetch new data. The frequency of these
 * checks is a tradeoff between performance and responsiveness.
 */
setInterval(function() {
    if ( scrolled ) {
        scrolled = false;
        if ( $(document).height() - 50 <=
                $(window).scrollTop() + $(window).height()) {

            /* Grab our last start cookie */
            var last_start = $.cookie("lastEventListScroll");
            if (!last_start)
                return;
            getEvents(container, last_start - period, last_start - 1, infinitefilter);
        }
    }
}, 500);


// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
