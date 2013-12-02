function AmpTracerouteGraphPage() {
    CuzGraphPage.call(this);
    this.colname = "amp-traceroute";
    this.generictitle = "Cuz - AMP Traceroute Graphs";
    this.modal = new AmpTracerouteModal();
}

AmpTracerouteGraphPage.prototype = new CuzGraphPage();
AmpTracerouteGraphPage.prototype.constructor = AmpTracerouteGraphPage;

AmpTracerouteGraphPage.prototype.initDropdowns = function(stream) {
    this.dropdowns = new AmpTracerouteDropdown(stream);
}

AmpTracerouteGraphPage.prototype.drawGraph = function(start, end, first) {
    /* TODO create another traceroute page that will show the rainbow graph */
    /*
    this.graph = new RainbowGraph({
        container: $("#graph"),
        start: start,
        end: end,
        firstts: first,
        lines: [ {id:this.view} ], //XXX to work with existing streams code
        urlbase: API_URL + "/_view/amp-traceroute/",
        event_urlbase: API_URL + "/_event/amp-traceroute/",
        miny: 0,
        ylabel: "Number of Hops",
        measureLatency: false,
        minHopHeight: 5
    });
    */

    this.graph = new SmokepingGraph({
        container: $("#graph"),
        start: start,
        end: end,
        firstts: first,
        lines: [ {id:this.view} ], //XXX to work with existing streams code
        urlbase: API_URL + "/_view/amp-traceroute/",
        event_urlbase: API_URL + "/_event/amp-traceroute/",
        miny: 0,
        ylabel: "Number of Hops",
    });


    this.graph.createGraphs();
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
