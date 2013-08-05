function RRDSmokepingGraph() {
    NNTSCGraph.call(this);
    this.colname = "rrd-smokeping";
}

RRDSmokepingGraph.prototype = new NNTSCGraph();
RRDSmokepingGraph.prototype.constructor = RRDSmokepingGraph;

RRDSmokepingGraph.prototype.initDropdowns = function() {
    this.dropdowns = new SmokepingDropdown();
}

RRDSmokepingGraph.prototype.drawGraph = function() {
    BasicTimeSeries({
        container: $("#graph"),
        start: this.starttime * 1000,
        end: this.endtime * 1000,
        generalstart: this.generalstart * 1000,
        generalend: this.generalend * 1000,
        urlbase: API_URL + "/_graph/rrd-smokeping/" + this.stream,
        event_urlbase: API_URL + "/_event/rrd-smokeping/" + this.stream,
        xticlabels: this.generateSummaryXTics(),
        miny: 0,
        ylabel: "Latency (ms)",
        graphtype: "smoke",
    });
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
