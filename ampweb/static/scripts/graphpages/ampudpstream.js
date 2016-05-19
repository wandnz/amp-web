function AmpUdpstreamGraphPage() {
    CuzGraphPage.call(this);
    this.colname = "amp-udpstream";
    this.graphstyle = "amp-udpstream";
    this.generictitle = "AMP UDPStream Graphs";
    this.modal = new AmpUdpstreamModal();

}

AmpUdpstreamGraphPage.prototype = new CuzGraphPage();
AmpUdpstreamGraphPage.prototype.constructor = AmpUdpstreamGraphPage;

AmpUdpstreamGraphPage.prototype.getTabs = function() {
    return [
        {'graphstyle': 'amp-udpstream', 'title': 'Jitter', 'selected': true}
    ];
}

AmpUdpstreamGraphPage.prototype.drawGraph = function(start, end, first,
        legend) {

    this.graph = new JitterPercentileGraph({
        container: $('#graph'),
        start: start,
        end: end,
        firstts: first,
        legenddata: legend,
        lines: [ {id: this.view} ],
        urlbase: API_URL + "/_view/amp-udpstream/",
        event_urlbase: API_URL + "/_event/amp-udpstream/",
        drawEventsBehind: false,
        units: "ms",
        ylabel: "Packet Delay Variation (ms)",
    });
    this.graph.createGraphs();
}


// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
