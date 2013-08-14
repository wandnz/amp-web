function LPIUsersGraph() {
    NNTSCGraph.call(this);
    this.colname = "lpi-users";
}

LPIUsersGraph.prototype = new NNTSCGraph();
LPIUsersGraph.prototype.constructor = LPIUsersGraph;

LPIUsersGraph.prototype.initDropdowns = function(stream) {
    this.dropdowns = new LPIUserDropdown(stream);
}

LPIUsersGraph.prototype.drawGraph = function() {
    BasicTimeSeries({
        container: $("#graph"),
        start: this.starttime * 1000,
        end: this.endtime * 1000,
        generalstart: this.generalstart * 1000,
        generalend: this.generalend * 1000,
        urlbase: API_URL + "/_graph/lpi-users/" + this.stream,
        event_urlbase: API_URL + "/_event/lpi-users/" + this.stream,
        xticlabels: this.generateSummaryXTics(),
        miny: 0,
        ylabel: "Users",
    });
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
