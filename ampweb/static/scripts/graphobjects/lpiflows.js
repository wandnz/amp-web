function LPIFlowsGraph() {
    NNTSCGraph.call(this);
    this.colname = "lpi-flows";
}

LPIFlowsGraph.prototype = new NNTSCGraph();
LPIFlowsGraph.prototype.constructor = LPIFlowsGraph;

LPIFlowsGraph.prototype.initDropdowns = function() {
    this.dropdowns = new LPIBasicDropdown();
}

LPIFlowsGraph.prototype.drawGraph = function() {
    BasicTimeSeries({
        container: $("#graph"),
        start: this.starttime * 1000,
        end: this.endtime * 1000,
        generalstart: this.generalstart * 1000,
        generalend: this.generalend * 1000,
        urlbase: API_URL + "/_graph/lpi-flows/" + this.stream,
        event_urlbase: API_URL + "/_event/lpi-flows/" + this.stream,
        xticlabels: this.generateSummaryXTics(),
        miny: 0,
        ylabel: "Flows",
    });
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
