function LPIFlowsGraphPage() {
    CuzGraphPage.call(this);
    this.colname = "lpi-flows";
    this.graphstyle = "lpi-flows";
    this.generictitle = "Cuz - LPI Flows Graphs";
}

LPIFlowsGraphPage.prototype = new CuzGraphPage();
LPIFlowsGraphPage.prototype.constructor = LPIFlowsGraphPage;

LPIFlowsGraphPage.prototype.initDropdowns = function(stream) {
    this.dropdowns = new LPIBasicDropdown(stream, "lpi-flows");
}

LPIFlowsGraphPage.prototype.drawGraph = function(start, end, first, legend) {
    this.graph = new BasicTimeSeriesGraph({
        container: $("#graph"),
        start: start,
        end: end,
        firstts: first,
        legenddata: legend,
        lines: [ {id:this.view} ],
        urlbase: API_URL + "/_view/lpi-flows/full/",
        event_urlbase: API_URL + "/_event/lpi-flows/",
        miny: 0,
        ylabel: "Flows",
    });

    this.graph.createGraphs();
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
