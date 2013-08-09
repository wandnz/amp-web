function LPIBytesGraph() {
    NNTSCGraph.call(this);
    this.colname = "lpi-bytes";
}

LPIBytesGraph.prototype = new NNTSCGraph();
LPIBytesGraph.prototype.constructor = LPIBytesGraph;

LPIBytesGraph.prototype.initDropdowns = function(stream) {
    this.dropdowns = new LPIBasicDropdown(stream, "lpi-bytes");
}

LPIBytesGraph.prototype.drawGraph = function() {
    BasicTimeSeries({
        container: $("#graph"),
        start: this.starttime * 1000,
        end: this.endtime * 1000,
        generalstart: this.generalstart * 1000,
        generalend: this.generalend * 1000,
        urlbase: API_URL + "/_graph/lpi-bytes/" + this.stream,
        event_urlbase: API_URL + "/_event/lpi-bytes/" + this.stream,
        xticlabels: this.generateSummaryXTics(),
        miny: 0,
        ylabel: "Mbps",
    });
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
