/*
 * GLOBALS
 */
var ratingModal = undefined;
var graphPage = undefined;
var graphCollection = undefined;
var currentView = null;

function parseURI() {
    var segments = getURI().segment();

    /*
     * If we are installed somewhere other than the root, we need to eat up
     * parts of the URI that we aren't interested in when parsing.
     */
    var index = segments.indexOf("view");

    for ( var i = 0; i <= 4; i++ ) {
        segments.push(null);
    }

    return {
        'prefix': (index == 0 ? "" : segments.slice(0, index).join("/") + "/"),
        'collection': segments[index + 1],
        'viewid': segments[index + 2],
        'starttime': segments[index + 3] ? parseInt(segments[index + 3]) : null,
        'endtime': segments[index + 4] ? parseInt(segments[index + 4]) : null
    };
}

function updatePageURL(params) {
    var currentUrl = parseURI();
    var uri = History.getRootUrl() + currentUrl.prefix + 'view/';

    var graphStyle = graphCollection,
        viewId = currentView;

    if ( params !== undefined ) {
        if ( params.graphStyle )
            graphStyle = params.graphStyle;
        if ( params.viewId )
            viewId  = params.viewId;
    }
    
    if ( graphStyle !== undefined && graphStyle ) {
        uri += graphStyle + '/';

        if ( graphPage !== undefined && graphPage ) {
            uri += viewId + '/';

            var start = null;
            var end = null;

            var selected = graphPage.getCurrentSelection();
            if (selected != null) {
                start = selected.start;
                end = selected.end;
            }

            if (start != null && end != null) {
                uri += start + "/" + end;
            }

            /* update the start and end times for the download button */
            graphPage.updateDownloadRawButton(start, end);
        }
    }

    if ( uri != History.getState().url ) {
        var segments = getURI().segment();
        if ( segments.length > 2 &&
                segments[1] == graphStyle && segments[2] == viewId ) {

            /* Overwrite the current state if we're only changing the start or
             * end timestamps */
            History.replaceState(History.getState().data,
                    History.getState().title, uri);

        } else {
            /* Otherwise add a new state */
            History.pushState("", "", uri);
        }
    }
}

function stateChange() {
    var uri = parseURI();

    if ( uri.collection != graphCollection ||
            (uri.viewid != null && currentView != uri.viewid) ) {
        function createGraphPage(collection) {
            switch (collection) {
                case "rrd-smokeping":
                    return new RRDSmokepingGraphPage();
                case "rrd-muninbytes":
                    return new RRDMuninbytesGraphPage();
                case "lpi-bytes":
                    return new LPIBytesGraphPage();
                case "lpi-flows":
                    return new LPIFlowsGraphPage();
                case "lpi-packets":
                    return new LPIPacketsGraphPage();
                case "lpi-users":
                    return new LPIUsersGraphPage();
                case "amp-icmp":
                case "amp-dns":
                case "amp-latency":
                case "amp-tcpping":
                case "amp-udpstream-latency":
                    return new AmpLatencyGraphPage(collection);
                case "amp-loss":
                    return new AmpLossGraphPage(collection);
                case "amp-http":
                    return new AmpHttpGraphPage();
                case "amp-traceroute":
                    return new AmpTracerouteMapPage();
                case "amp-throughput":
                    return new AmpThroughputGraphPage();
                case "amp-astraceroute":
                    return new AmpTracerouteRainbowGraphPage();
                case "amp-traceroute-hops":
                    return new AmpTracerouteHopsGraphPage();
                case "amp-udpstream":
                    return new AmpUdpstreamGraphPage();
                case "ceilo-cpu":
                    return new CeiloCpuGraphPage();
                case "ceilo-disk":
                    return new CeiloDiskGraphPage();
                case "ceilo-net":
                    return new CeiloNetGraphPage();
            }
        }

        graphPage = createGraphPage(uri.collection);
        graphCollection = graphPage.graphstyle;
        ratingModal = new RatingModal();

        currentView = uri.viewid ? uri.viewid : 0;

        graphPage.changeView(currentView, uri.starttime, uri.endtime);
        graphPage.updateTitle();
    }
};

function changeTab(params) {
    var selected = graphPage.getCurrentSelection();
    var start = null;
    var end = null;

    if (selected != null) {
        start = selected.start;
        end = selected.end;
    }

    var base = $(location).attr('href').toString().split("view")[0] +
            "tabview/";
    var newurl = base + params.base + "/" + params.view + "/" +
            params.newcol + "/";

    if (start != null && end != null) {
        newurl += start + "/" + end;
    }

    window.location = newurl;
}

$(document).ready(stateChange);

/* If the user clicks the back or forward buttons, we want to return them
 * to that previous view as best we can */
$(window).bind('statechange', stateChange);

/* XXX This is not currently used */
function streamToString(streams) {
    var streamstring = streams[0].id;
    var i = 1;

    for (i; i < streams.length; i++) {
        streamstring += "-";
        streamstring += streams[i].id;
    }

    return streamstring;
}


// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
