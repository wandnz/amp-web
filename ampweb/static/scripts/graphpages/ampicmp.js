function AmpIcmpGraphPage() {
    CuzGraphPage.call(this);
    this.colname = "amp-icmp";
}

AmpIcmpGraphPage.prototype = new CuzGraphPage();
AmpIcmpGraphPage.prototype.constructor = AmpIcmpGraphPage;

AmpIcmpGraphPage.prototype.initDropdowns = function(stream) {
    this.dropdowns = new AmpIcmpDropdown(stream);
}

AmpIcmpGraphPage.prototype.drawGraph = function(start, end, first) {
    this.graph = new SmokepingGraph({
        container: $("#graph"),
        start: start,
        end: end,
        firstts: first,
        urlbase: API_URL + "/_graph/amp-icmp/" + this.stream,
        event_urlbase: API_URL + "/_event/amp-icmp/" + this.stream,
        miny: 0,
        ylabel: "Latency (ms)",
    });

    this.graph.createGraphs();
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
