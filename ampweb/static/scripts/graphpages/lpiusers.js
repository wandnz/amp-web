function LPIUsersGraphPage() {
    CuzGraphPage.call(this);
    this.colname = "lpi-users";
}

LPIUsersGraphPage.prototype = new CuzGraphPage();
LPIUsersGraphPage.prototype.constructor = LPIUsersGraphPage;

LPIUsersGraphPage.prototype.initDropdowns = function(stream) {
    this.dropdowns = new LPIUserDropdown(stream);
}

LPIUsersGraphPage.prototype.drawGraph = function() {
    this.graph = new BasicTimeSeriesGraph({
        container: $("#graph"),
        start: this.starttime,
        end: this.endtime,
        generalstart: this.generalstart,
        generalend: this.generalend,
        urlbase: API_URL + "/_graph/lpi-users/" + this.stream,
        event_urlbase: API_URL + "/_event/lpi-users/" + this.stream,
        miny: 0,
        ylabel: "Users",
    });

    this.graph.createGraphs();
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
