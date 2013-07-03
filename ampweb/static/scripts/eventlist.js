var scrolled = false;
var last_start = 0;
var period = (60 * 60 * 24);
var request = false;
var container;


$(document).ready(function() {
    /* load the initial set of events on page load */
    var start, end;
    end = Math.round((new Date()).getTime() / 1000);
    start = end - period;
    /* get the container once and cache it */
    container = $("#recent_events");
    /* fetch initial events to display */
    getEvents(start, end);
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
            getEvents(last_start - period, last_start - 1);
        }
    }
}, 500);

function getEvents(start, end) {
    /*
     * Don't make a new request if there is one outstanding. This will
     * also catch the case where the request completes but with a non-200
     * status. Is there more checking we want to do around this?
     */
    if ( request ) {
        console.log("skipping");
        console.log(request);
        return;
    }

    request = $.getJSON(API_URL + "/_event/groups/" + start + "/" + end,
        function(data) {
            var i, j;
            var line;
            var group, ev;

            for ( i=0; i<data.length; i++ ) {
                /*
                 * TODO would it be nice here to have some sort of marker
                 * between days in this list? Would it make it easier to read?
                 */
                group = data[i];
                line = "<p class='group' onclick='showGroup(\"" +
                    group["id"] + "\");'>" + group["label"] +
                    "<div id='group_" + group["id"] +
                    "' style='display:none'>";

                for ( j=0; j<group["events"].length; j++ ) {
                    ev = group["events"][j];
                    line += "<p class='event'>" +
                        "<a href='" + ev["href"] + "'>" + ev["label"] +
                        "<br />" + ev["description"] + "</a></p>";
                }
                line += "</div></p>";
                container.append(line);
            }
            last_start = start;
            request = false;

            /*
             * Make sure that there are enough events to fill the screen so
             * that we get a scrollbar. If we don't get a scrollbar then we
             * can't get any scroll events!
             */
            if ( $(document).height() <= $(window).height() ) {
                getEvents(last_start - period, last_start - 1);
            }
        }
    );
}
