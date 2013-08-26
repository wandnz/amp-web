function LPIFlowsGraphPage() {
    CuzGraphPage.call(this);
    this.colname = "lpi-flows";
}

LPIFlowsGraphPage.prototype = new CuzGraphPage();
LPIFlowsGraphPage.prototype.constructor = LPIFlowsGraphPage;

LPIFlowsGraphPage.prototype.initDropdowns = function(stream) {
    this.dropdowns = new LPIBasicDropdown(stream, "lpi-flows");
}

LPIFlowsGraphPage.prototype.drawGraph = function(start, end) {
    this.graph = new BasicTimeSeriesGraph({
        container: $("#graph"),
        start: start,
        end: end,
        urlbase: API_URL + "/_graph/lpi-flows/" + this.stream,
        event_urlbase: API_URL + "/_event/lpi-flows/" + this.stream,
        miny: 0,
        ylabel: "Flows",
    });

    this.graph.createGraphs();
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
