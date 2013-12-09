function AmpTracerouteGraphPage() {
    CuzGraphPage.call(this);
    this.colname = "amp-traceroute";
    this.graphstyle = "amp-traceroute";
    this.generictitle = "Cuz - AMP Traceroute Graphs";
    this.modal = new AmpTracerouteModal();
}

function AmpTracerouteRainbowGraphPage() {
    CuzGraphPage.call(this);
    this.colname = "amp-traceroute";
    this.graphstyle = "amp-traceroute-rainbow";
    this.generictitle = "Cuz - AMP Traceroute Graphs";
    this.modal = new AmpTracerouteRainbowModal();
}
    

AmpTracerouteGraphPage.prototype = new CuzGraphPage();
AmpTracerouteGraphPage.prototype.constructor = AmpTracerouteGraphPage;

AmpTracerouteRainbowGraphPage.prototype = new CuzGraphPage();
AmpTracerouteRainbowGraphPage.prototype.constructor = AmpTracerouteRainbowGraphPage;

AmpTracerouteGraphPage.prototype.initDropdowns = function(stream) {
    this.dropdowns = new AmpTracerouteDropdown(stream);
}

AmpTracerouteRainbowGraphPage.prototype.drawGraph = function(start, end,
        first, legend) {
    this.graph = new RainbowGraph({
        container: $("#graph"),
        start: start,
        end: end,
        firstts: first,
        legenddata: legend,
        lines: [ {id:this.view} ], //XXX to work with existing streams code
        urlbase: API_URL + "/_view/amp-traceroute/hops/",
        event_urlbase: API_URL + "/_event/amp-traceroute/",
        miny: 0,
        ylabel: "Number of Hops",
        measureLatency: false,
        minHopHeight: 5
    });

    this.graph.createGraphs();
}

AmpTracerouteGraphPage.prototype.drawGraph = function(start, end, first, legend) {
    /* TODO create another traceroute page that will show the rainbow graph */
    /*
    */

    this.graph = new SmokepingGraph({
        container: $("#graph"),
        start: start,
        end: end,
        firstts: first,
        legenddata: legend,
        lines: [ {id:this.view} ], //XXX to work with existing streams code
        urlbase: API_URL + "/_view/amp-traceroute/full/",
        event_urlbase: API_URL + "/_event/amp-traceroute/",
        miny: 0,
        ylabel: "Number of Hops",
    });


    this.graph.createGraphs();
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
