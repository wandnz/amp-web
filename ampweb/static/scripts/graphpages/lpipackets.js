function LPIPacketsGraphPage() {
    CuzGraphPage.call(this);
    this.colname = "lpi-packets";
    this.generictitle = "Cuz - LPI Packets Graphs";
}

LPIPacketsGraphPage.prototype = new CuzGraphPage();
LPIPacketsGraphPage.prototype.constructor = LPIPacketsGraphPage;

LPIPacketsGraphPage.prototype.initDropdowns = function(stream) {
    this.dropdowns = new LPIBasicDropdown(stream, "lpi-packets");
}

LPIPacketsGraphPage.prototype.drawGraph = function(start, end, first) {
    this.graph = new BasicTimeSeriesGraph({
        container: $("#graph"),
        start: start,
        end: end,
        firstts: first,
        urlbase: API_URL + "/_graph/lpi-packets/" + this.streams[0],
        event_urlbase: API_URL + "/_event/lpi-packets/" + this.streams[0],
        miny: 0,
        ylabel: "Packets",
    });

    this.graph.createGraphs();
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
