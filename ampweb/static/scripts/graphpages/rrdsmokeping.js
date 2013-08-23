function RRDSmokepingGraphPage() {
    CuzGraphPage.call(this);
    this.colname = "rrd-smokeping";
}

RRDSmokepingGraphPage.prototype = new CuzGraphPage();
RRDSmokepingGraphPage.prototype.constructor = RRDSmokepingGraphPage;

RRDSmokepingGraphPage.prototype.initDropdowns = function(stream) {
    this.dropdowns = new SmokepingDropdown(stream);
}

RRDSmokepingGraphPage.prototype.drawGraph = function() {
    this.graph = new SmokepingGraph({
        container: $("#graph"),
        start: this.starttime ,
        end: this.endtime ,
        generalstart: this.generalstart ,
        generalend: this.generalend ,
        urlbase: API_URL + "/_graph/rrd-smokeping/" + this.stream,
        event_urlbase: API_URL + "/_event/rrd-smokeping/" + this.stream,
        miny: 0,
        ylabel: "Latency (ms)",
    });

    this.graph.createGraphs();
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
