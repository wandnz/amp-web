function LPIPacketsGraph() {
    NNTSCGraph.call(this);
    this.colname = "lpi-packets";
}

LPIPacketsGraph.prototype = new NNTSCGraph();
LPIPacketsGraph.prototype.constructor = LPIPacketsGraph;

LPIPacketsGraph.prototype.initDropdowns = function(stream) {
    this.dropdowns = new LPIBasicDropdown(stream, "lpi-packets");
}

LPIPacketsGraph.prototype.drawGraph = function() {
    BasicTimeSeries({
        container: $("#graph"),
        start: this.starttime * 1000,
        end: this.endtime * 1000,
        generalstart: this.generalstart * 1000,
        generalend: this.generalend * 1000,
        urlbase: API_URL + "/_graph/lpi-packets/" + this.stream,
        event_urlbase: API_URL + "/_event/lpi-packets/" + this.stream,
        xticlabels: this.generateSummaryXTics(),
        miny: 0,
        ylabel: "Packets",
    });
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
