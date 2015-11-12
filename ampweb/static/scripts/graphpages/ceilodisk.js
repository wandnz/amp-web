function CeiloDiskGraphPage() {
    CuzGraphPage.call(this);
    this.colname = "ceilo-disk";
    this.graphstyle = "ceilo-disk";
    this.generictitle = "Celiometer Disk Activity Graphs";
    this.modal = new CeiloDiskModal();
}

CeiloDiskGraphPage.prototype = new CuzGraphPage();
CeiloDiskGraphPage.prototype.constructor = CeiloDiskGraphPage;

CeiloDiskGraphPage.prototype.drawGraph = function(start, end, first, legend) {
    this.graph = new BasicTimeSeriesGraph({
        container: $("#graph"),
        start: start,
        end: end,
        firstts: first,
        legenddata: legend, 
        lines: [ {id:this.view} ],
        urlbase: API_URL + "/_view/ceilo-disk/",
        event_urlbase: API_URL + "/_event/ceilo-disk/",
        miny: 0,
        units: "KBps",
        ylabel: "Disk Activity (KBps)"
    });

    this.graph.createGraphs();
}

CeiloDiskGraphPage.prototype.getTabs = function() {
    return [];
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab:
