function LPIUsersGraphPage() {
    CuzGraphPage.call(this);
    this.colname = "lpi-users";
}

LPIUsersGraphPage.prototype = new CuzGraphPage();
LPIUsersGraphPage.prototype.constructor = LPIUsersGraphPage;

LPIUsersGraphPage.prototype.initDropdowns = function(stream) {
    this.dropdowns = new LPIUserDropdown(stream);
}

LPIUsersGraphPage.prototype.drawGraph = function(start, end) {
    this.graph = new BasicTimeSeriesGraph({
        container: $("#graph"),
        start: start,
        end: end,
        urlbase: API_URL + "/_graph/lpi-users/" + this.stream,
        event_urlbase: API_URL + "/_event/lpi-users/" + this.stream,
        miny: 0,
        ylabel: "Users",
    });

    this.graph.createGraphs();
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :