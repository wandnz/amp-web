function AmpLatencyGraphPage(style) {
    CuzGraphPage.call(this);
    this.colname = "amp-latency";
    this.graphstyle = "amp-latency";
    this.generictitle = "AMP Latency Graphs";
    this.modal = new AmpLatencyModal(style);
}

AmpLatencyGraphPage.prototype = new CuzGraphPage();
AmpLatencyGraphPage.prototype.constructor = AmpLatencyGraphPage;

AmpLatencyGraphPage.prototype.getTabs = function() {
    return [];
}

AmpLatencyGraphPage.prototype.drawGraph = function(start, end, first, legend) {
    this.graph = new SmokepingGraph({
        container: $("#graph"),
        start: start,
        end: end,
        firstts: first,
        legenddata: legend,
        lines: [ {id:this.view} ], //XXX to work with existing streams code
        urlbase: API_URL + "/_view/amp-latency/",
        event_urlbase: API_URL + "/_event/amp-latency/",
        miny: 0,
        units: "ms",
        ylabel: "Latency (ms)"
    });

    this.graph.createGraphs();
}

AmpLatencyGraphPage.prototype.getTabs = function() {
    return [
        { 'graphstyle': 'amp-latency', 'title': 'Latency', 'selected': true},
        { 'graphstyle': 'amp-loss', 'title': 'Loss', 'selected': false},
        { 'graphstyle': 'amp-astraceroute', 'title': 'AS Path', 'selected': false}
    ];
}


// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
