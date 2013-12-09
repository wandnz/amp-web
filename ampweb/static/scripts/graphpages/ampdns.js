function AmpDnsGraphPage() {
    CuzGraphPage.call(this);
    this.colname = "amp-dns";
    this.graphstyle = "amp-dns";
    this.generictitle = "Cuz - AMP DNS Graphs";
}

AmpDnsGraphPage.prototype = new CuzGraphPage();
AmpDnsGraphPage.prototype.constructor = AmpDnsGraphPage;

AmpDnsGraphPage.prototype.initDropdowns = function(stream) {
    this.dropdowns = new AmpDnsDropdown(stream);
}

AmpDnsGraphPage.prototype.drawGraph = function(start, end, first) {
    this.graph = new SmokepingGraph({
        container: $("#graph"),
        start: start,
        end: end,
        firstts: first,
        lines: this.streams,
        urlbase: API_URL + "/_graph/amp-dns/",
        event_urlbase: API_URL + "/_event/amp-dns/",
        miny: 0,
        ylabel: "Latency (ms)",
    });

    this.graph.createGraphs();
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
