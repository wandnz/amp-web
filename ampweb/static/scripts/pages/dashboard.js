
var ratingModal = undefined;

function FilterOptions(prevJson) {

    this.maxgroups = 10;
    this.showcommon = true;
    this.asincludes = [];
    this.asexcludes = [];
    this.srcincludes = [];
    this.srcexcludes = [];
    this.dstincludes = [];
    this.dstexcludes = [];
    this.latencyincr = true;
    this.latencydecr = true;
    this.routechange = true;

    if (prevJson != undefined) {
        var obj = $.parseJSON(prevJson);

        if (obj.maxgroups != undefined)
            this.maxgroups = obj.maxgroups;
        if (obj.showcommon != undefined)
            this.showcommon = obj.showcommon;
        if (obj.asincludes != undefined)
            this.asincludes = obj.asincludes;
        if (obj.asexcludes != undefined)
            this.asexcludes = obj.asexcludes;
        if (obj.srcincludes != undefined)
            this.srcincludes = obj.srcincludes;
        if (obj.srcexcludes != undefined)
            this.srcexcludes = obj.srcexcludes;
        if (obj.dstincludes != undefined)
            this.dstincludes = obj.dstincludes;
        if (obj.dstexcludes != undefined)
            this.dstexcludes = obj.dstexcludes;
        if (obj.latencyincr != undefined)
            this.latencyincr = obj.latencyincr;
        if (obj.latencydecr != undefined)
            this.latencydecr = obj.latencydecr;
        if (obj.routechange != undefined)
            this.routechange = obj.routechange;

    }
}

/* TODO link these to a little database for storing a user's filter
 * preferences.
 */
function insertFilterOptions(opts, id) {
    return 1;
}

function lookupFilterOptions(opts) {
    return undefined;
}

/*
 * Display all the graphs shown on the dashboard on page load.
 */
$(document).ready(function() {
    var recent_container = $("#tsgraph");
    var source_container = $("#source_graph");
    var common_container = $('#common_table');
    var end;
    var start;
    var now;

    /* end the graph on the next 30min boundary, and start 24 hours earlier */
    now = Math.round(new Date().getTime() / 1000);
    end = now + ((60 * 30) - (now % (60 * 30)))
    start = end - (60 * 60 * 24);

    var panelstate = $.cookie("dashboardPanels");

    var evfilt = $.cookie('lastEventFilterName');
    if (!evfilt)
        evfilt = 'default';
    loadDashFilter($('#recentevents'), evfilt);

    /* draw time series graph showing when most recent events occurred */
    $('#tspanel').on('shown.bs.collapse', function(e) {
            drawEventFrequencies({
                container: recent_container[0],
                start: start,
                end: end,
                urlbase: API_URL + "/_event/count/"

            });
            openCollapsed('#tsicon', 0);
    });

    /* draw bar graph showing most common event sources */
    $('#topaspanel').on('shown.bs.collapse', function(e) {
            drawEventSiteFrequencies({
                container: source_container[0],
                start: start,
                end: end,
                urlbase: API_URL + "/_event/asns/"
            });
            openCollapsed('#sourceicon', 1);
    });

    $('#commonpanel').on('shown.bs.collapse', function(e) {
            drawCommonEventFrequencies({
                container: common_container[0],
                start: start,
                end: end,
                maxstreams: 10,
                urlbase: API_URL + "/_event/commons/"
            });
            openCollapsed('#commonicon', 2);
    });

    $('#tspanel').on('hidden.bs.collapse', function(e) {
            closeCollapsed('#tsicon', 0);
    });
    $('#topaspanel').on('hidden.bs.collapse', function(e) {
            closeCollapsed('#sourceicon', 1);
    });
    $('#commonpanel').on('hidden.bs.collapse', function(e) {
            closeCollapsed('#commonicon', 2);
    });

    if (panelstate) {
        var ps = panelstate.split("-");

        if (ps[0] == "1")
            $('#tsgraphpanel').collapse('show');
        if (ps[1] == "1")
            $('#topasgraphpanel').collapse('show');
        if (ps[2] == "1")
            $('#commongraphpanel').collapse('show');
    }

});

function openCollapsed(icon, cookieindex) {
    var panelstate = $.cookie("dashboardPanels");
    var ps;

    $(icon).removeClass('glyphicon-collapse-down');
    $(icon).addClass('glyphicon-collapse-up');

    if (!panelstate)
        ps = [0, 0, 0]
    else
        ps = panelstate.split('-');
    ps[cookieindex] = 1;
    $.cookie("dashboardPanels", ps.join("-"));

}

function closeCollapsed(icon, cookieindex) {
    var panelstate = $.cookie("dashboardPanels");
    var ps;
    $(icon).removeClass('glyphicon-collapse-up');
    $(icon).addClass('glyphicon-collapse-down');

    if (!panelstate)
        ps = [0, 0, 0]
    else
        ps = panelstate.split('-');

    ps[cookieindex] = 0;
    $.cookie("dashboardPanels", ps.join("-"));

}

function rateDashEvent(streamid, eventid) {

    if (!ratingModal)
        ratingModal = new RatingModal();
    $('#modal-rateevent').load(RATING_URL + "/" + eventid
            + "/" + streamid,
            function(response, status, xhr) {
                if (status == "success")
                    ratingModal.setInitialState();
                    $('#modal-rateevent').modal('show');
                }
    );
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
