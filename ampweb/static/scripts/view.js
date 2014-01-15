/*
 * GLOBALS
 */
var graphPage = undefined;
var graphCollection = undefined;
var currentView = "";

function parseURI() {
    var segments = getURI().segment();

    for ( var i = 0; i <= 4; i++ ) {
        segments.push(null);
    }

    return {
        'collection': segments[1],
        'viewid': segments[2],
        'starttime': segments[3] ? parseInt(segments[3]) : null,
        'endtime': segments[4] ? parseInt(segments[4]) : null
    };
}

function updatePageURL(params) {
    var currentUrl = parseURI();
    var uri = History.getRootUrl() + 'view/';

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

    if ( uri.collection != graphCollection || currentView != uri.viewid ) {
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
                    return new AmpIcmpGraphPage();
                case "amp-traceroute":
                    return new AmpTracerouteGraphPage();
                case "amp-dns":
                    return new AmpDnsGraphPage();
                case "amp-traceroute-rainbow":
                    return new AmpTracerouteRainbowGraphPage();
            }
        }

        graphPage = createGraphPage(uri.collection);
        graphCollection = uri.collection;

        currentView = uri.viewid ? uri.viewid : 0;

        graphPage.changeView(currentView, uri.starttime, uri.endtime);
        graphPage.updateTitle();
    }
};

$(document).ready(stateChange);

/* If the user clicks the back or forward buttons, we want to return them
 * to that previous view as best we can */
$(window).bind('statechange', stateChange);

function setTitle(newtitle) {
    /* Despite appearances, the title argument of
     * History.replaceState isn't guaranteed to have any effect on
     * the current page title so we have to explicitly set the
     * page title */
    
    /* XXX Modifying the title in IE8 seems to throw an "unknown runtime error"
     * so let's try and avoid that for now until we work out a real fix */
    $('html:not(.lt-ie9) title').text(newtitle);

    /* Change the current entry in the History to match new title */
    History.replaceState(History.getState().data, newtitle,
            History.getState().url);

}

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
