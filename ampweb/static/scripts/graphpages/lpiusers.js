function LPIUsersGraphPage() {
    CuzGraphPage.call(this);
    this.colname = "lpi-users";
    this.generictitle = "Cuz - LPI Users Graphs";
}

LPIUsersGraphPage.prototype = new CuzGraphPage();
LPIUsersGraphPage.prototype.constructor = LPIUsersGraphPage;

LPIUsersGraphPage.prototype.initDropdowns = function(stream) {
    this.dropdowns = new LPIUserDropdown(stream);
}

LPIUsersGraphPage.prototype.drawGraph = function(start, end, first) {
    this.graph = new BasicTimeSeriesGraph({
        container: $("#graph"),
        start: start,
        end: end,
        firstts: first,
        lines: this.streams,
        urlbase: API_URL + "/_graph/lpi-users/",
        event_urlbase: API_URL + "/_event/lpi-users/",
        miny: 0,
        ylabel: "Users",
    });

    this.graph.createGraphs();
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
