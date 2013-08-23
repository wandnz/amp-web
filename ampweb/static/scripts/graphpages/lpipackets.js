function LPIPacketsGraphPage() {
    CuzGraphPage.call(this);
    this.colname = "lpi-packets";
}

LPIPacketsGraphPage.prototype = new CuzGraphPage();
LPIPacketsGraphPage.prototype.constructor = LPIPacketsGraphPage;

LPIPacketsGraphPage.prototype.initDropdowns = function(stream) {
    this.dropdowns = new LPIBasicDropdown(stream, "lpi-packets");
}

LPIPacketsGraphPage.prototype.drawGraph = function() {
    this.graph = new BasicTimeSeriesGraph({
        container: $("#graph"),
        start: this.starttime,
        end: this.endtime,
        generalstart: this.generalstart,
        generalend: this.generalend,
        urlbase: API_URL + "/_graph/lpi-packets/" + this.stream,
        event_urlbase: API_URL + "/_event/lpi-packets/" + this.stream,
        miny: 0,
        ylabel: "Packets",
    });

    this.graph.createGraphs();
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
