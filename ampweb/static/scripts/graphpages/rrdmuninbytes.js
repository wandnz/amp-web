function RRDMuninbytesGraphPage() {
    CuzGraphPage.call(this);
    this.colname = "rrd-muninbytes";
}

RRDMuninbytesGraphPage.prototype = new CuzGraphPage();
RRDMuninbytesGraphPage.prototype.constructor = RRDMuninbytesGraphPage;

RRDMuninbytesGraphPage.prototype.initDropdowns = function(stream) {
    this.dropdowns = new MuninDropdown(stream);
}

RRDMuninbytesGraphPage.prototype.drawGraph = function() {
    this.graph = new BasicTimeSeriesGraph({
        container: $("#graph"),
        start: this.starttime ,
        end: this.endtime ,
        generalstart: this.generalstart ,
        generalend: this.generalend ,
        urlbase: API_URL + "/_graph/rrd-muninbytes/" + this.stream,
        event_urlbase: API_URL + "/_event/rrd-muninbytes/" + this.stream,
        miny: 0,
        ylabel: "Mbps",
    });

    this.graph.createGraphs();
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
