function CeiloCpuGraphPage() {
    CuzGraphPage.call(this);
    this.colname = "ceilo-cpu";
    this.graphstyle = "ceilo-cpu";
    this.generictitle = "Celiometer CPU Usage Graphs";
    this.modal = new CeiloCpuModal();
}

CeiloCpuGraphPage.prototype = new CuzGraphPage();
CeiloCpuGraphPage.prototype.constructor = CeiloCpuGraphPage;

CeiloCpuGraphPage.prototype.drawGraph = function(start, end, first, legend) {
    this.graph = new BasicTimeSeriesGraph({
        container: $("#graph"),
        start: start,
        end: end,
        firstts: first,
        legenddata: legend, 
        lines: [ {id:this.view} ],
        urlbase: API_URL + "/_view/ceilo-cpu/",
        event_urlbase: API_URL + "/_event/ceilo-cpu/",
        miny: 0,
        units: "%",
        ylabel: "CPU Usage"
    });

    this.graph.createGraphs();
}

CeiloCpuGraphPage.prototype.getTabs = function() {
    return [];
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab:
