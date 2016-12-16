function CeiloNetGraphPage() {
    CuzGraphPage.call(this);
    this.colname = "ceilo-net";
    this.graphstyle = "ceilo-net";
    this.generictitle = "Celiometer Net Activity Graphs";
    this.modal = new CeiloNetModal();
}

CeiloNetGraphPage.prototype = new CuzGraphPage();
CeiloNetGraphPage.prototype.constructor = CeiloNetGraphPage;

CeiloNetGraphPage.prototype.drawGraph = function(start, end, first, legend) {
    this.graph = new BasicTimeSeriesGraph({
        container: $("#graph"),
        start: start,
        end: end,
        firstts: first,
        legenddata: legend,
        lines: [ {id:this.view} ],
        urlbase: API_URL + "/_view/ceilo-net/",
        event_urlbase: API_URL + "/_event/ceilo-net/",
        miny: 0,
        units: "Kbps",
        ylabel: "Network Activity (Kbps)"
    });

    this.graph.createGraphs();
}

CeiloNetGraphPage.prototype.getTabs = function() {
    return [];
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab:
