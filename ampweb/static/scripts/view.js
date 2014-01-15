
var graphPage = undefined;
var graphCollection = undefined;
var stream_mappings = new Array();
var currentview = "";

function parseURI() {
    var uri = getURI();
    var segments = uri.segment();

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

function updatePageURL() {
    var currentUrl = parseURI();
    var uri = History.getRootUrl() + 'view/';
    
    if ( graphCollection !== undefined && graphCollection ) {
        uri += graphCollection + '/';

        if ( graphPage !== undefined && graphPage ) {
            uri += currentview + '/';

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
                segments[1] == graphCollection && segments[2] == currentView ) {

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

function createGraphPage(collection) {
    switch(collection) {
        case "rrd-smokeping":
            graphPage = new RRDSmokepingGraphPage();
            break;
        case "rrd-muninbytes":
            graphPage = new RRDMuninbytesGraphPage();
            break;
        case "lpi-bytes":
            graphPage = new LPIBytesGraphPage();
            break;
        case "lpi-flows":
            graphPage = new LPIFlowsGraphPage();
            break;
        case "lpi-packets":
            graphPage = new LPIPacketsGraphPage();
            break;
        case "lpi-users":
            graphPage = new LPIUsersGraphPage();
            break;
        case "amp-icmp":
            graphPage = new AmpIcmpGraphPage();
            break;
        case "amp-traceroute":
            graphPage = new AmpTracerouteGraphPage();
            break;
        case "amp-dns":
            graphPage = new AmpDnsGraphPage();
            break;
        case "amp-traceroute-rainbow":
            graphPage = new AmpTracerouteRainbowGraphPage();
            break;
    }
    graphCollection = collection;
}

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
    var newurl = base + params.base + "/" + params.view + "/";
    newurl += params.newcol + "/"
    
    if (start != null && end != null) {
        newurl += start + "/" + end;
    }

    //console.log(newurl);
    window.location = newurl;
}

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

function streamToString(streams) {
    var streamstring = streams[0].id;
    var i = 1;

    for (i; i < streams.length; i++) {
        streamstring += "-";
        streamstring += streams[i].id;
    }

    return streamstring;
}

function stateChange() {
    var uri = parseURI();

    if ( uri.collection != graphCollection ) {
        createGraphPage(uri.collection);
    }

    if ( currentview != uri.viewid ) {
        currentview = uri.viewid ? uri.viewid : 0;

        graphPage.changeView(currentview, uri.starttime, uri.endtime);
        graphPage.updateTitle();
    }
};

/*
 * This is called whenever the graph page is first loaded. As such, it needs
 * to extract any user-provided info from the URL and then render the page
 * components appropriately.
 */
$(document).ready(stateChange);

/* If the user clicks the back or forward buttons, we want to return them
 * to that previous view as best we can */
$(window).bind('statechange', stateChange);


// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
