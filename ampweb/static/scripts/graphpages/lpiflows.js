function LPIFlowsGraphPage() {
    CuzGraphPage.call(this);
    this.colname = "lpi-flows";
    this.graphstyle = "lpi-flows";
    this.generictitle = "LPI Flows Graphs";
    this.modal = new LPIFlowsModal();
}

LPIFlowsGraphPage.prototype = new CuzGraphPage();
LPIFlowsGraphPage.prototype.constructor = LPIFlowsGraphPage;

LPIFlowsGraphPage.prototype.getTabs = function() {
    return [
        { 'graphstyle': 'lpi-bytes',
          'title': 'Bytes', 'selected':false},
        { 'graphstyle': 'lpi-packets',
          'title': 'Packets', 'selected':false},
        { 'graphstyle': 'lpi-flows',
          'title': 'Flows', 'selected':true},
        { 'graphstyle': 'lpi-users',
          'title': 'Users', 'selected':false}

    ];
}

LPIFlowsGraphPage.prototype.drawGraph = function(start, end, first, legend) {
    this.graph = new BasicTimeSeriesGraph({
        container: $("#graph"),
        start: start,
        end: end,
        firstts: first,
        legenddata: legend,
        lines: [ {id:this.view} ],
        urlbase: API_URL + "/_view/lpi-flows/",
        event_urlbase: API_URL + "/_event/lpi-flows/",
        miny: 0,
        units: "flows",
        ylabel: "Flows"
    });

    this.graph.createGraphs();
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
