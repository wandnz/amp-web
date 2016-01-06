function AmpLossGraphPage(style) {
    CuzGraphPage.call(this);
    this.colname = "amp-latency";
    this.graphstyle = "amp-loss";
    this.generictitle = "AMP Loss Graphs";
    this.modal = new AmpLossModal(style);
}

AmpLossGraphPage.prototype = new CuzGraphPage();
AmpLossGraphPage.prototype.constructor = AmpLossGraphPage;

AmpLossGraphPage.prototype.getTabs = function() {
    return [];
}

AmpLossGraphPage.prototype.drawGraph = function(start, end, first, legend) {
    this.graph = new LossGraph({
        container: $("#graph"),
        start: start,
        end: end,
        firstts: first,
        legenddata: legend,
        lines: [ {id:this.view} ], //XXX to work with existing streams code
        urlbase: API_URL + "/_view/amp-latency/",
        event_urlbase: API_URL + "/_event/amp-loss/",
        miny: 0,
        maxy: 105,
        dataindex: 2,
        units: "%",
        ylabel: "Loss (%)"
    });

    this.graph.createGraphs();
}

AmpLossGraphPage.prototype.getTabs = function() {
    return [
        { 'graphstyle': 'amp-latency', 'title': 'Latency', 'selected': false},
        { 'graphstyle': 'amp-loss', 'title': 'Loss', 'selected': true},
    ];
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
