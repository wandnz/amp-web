
var graphPage = undefined;
var graphCollection = undefined;
var stream_mappings = new Array();
var currentview = "";

/* Internal functions for avoiding code duplication */

function decomposeURL(url) {
    var uri = getUrl();
    var segments = uri.segment();

    /*
     * We only care about the last few segments that describe the view. It's
     * a little bit hax, but try looking for the last instance of "view" in
     * our segments - it should be there somewhere or we would never have got
     * to this view.
     */
    var index = segments.lastIndexOf("view");

    var urlobj = {};
    var viewid;

    for (var i = 0; i <= 4; i++) {
        segments.push("");
    }

    urlobj.collection = segments[1];
    urlobj.viewid = segments[2];
/*
    urlobj.streams = new Array();
    $.each(streamids, function(index, sid) {
        if (sid == "")
            return;
        var streamobj = {
            id: sid,
            // XXX More things will eventually go in here, e.g. line colour,
            // hidden flag, label etc.
        }
        urlobj.streams.push(streamobj);
    });
*/
    if (segments[3] == "") {
        urlobj.starttime = null;
    } else {
        urlobj.starttime = parseInt(segments[3]);
    }

    if (segments[4] == "") {
        urlobj.endtime = null;
    } else {
        urlobj.endtime = parseInt(segments[4]);
    }

    return urlobj;

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


function updatePageURL() {
    var selected = graphPage.getCurrentSelection();
    var base = History.getRootUrl() + "view/";
    //var urlstream = streamToString(currentstream);
    var newurl = base + graphCollection + "/" + currentview + "/";
    var start = null;
    var end = null;

    if (selected != null) {
        start = selected.start;
        end = selected.end;
    }

    if (start != null && end != null) {
        newurl += start + "/" + end;
    }

    /* If this function has been called as a result of the graph showing a
     * different stream (e.g. the user has selected a new stream via the
     * dropdowns), we need to push a new History entry and generate a new
     * title.
     */
    History.pushState("", "", newurl);
}

/*
 * This is called whenever the graph page is first loaded. As such, it needs
 * to extract any user-provided info from the URL and then render the page
 * components appropriately.
 */
$(document).ready(function() {
    /* Solves problem of no slash on the end of the url */
        /* Only a problem with Hashbangs */
    startHistory(window);

    if ($(location).attr("href").slice(-5) == "view") {
        window.location = "/view/";
    }

    var urlparts = decomposeURL();
    createGraphPage(urlparts.collection);
    if ( urlparts.viewid.length > 0 ) {
        currentview = urlparts.viewid;
    } else {
        currentview = 0;
    }

    graphPage.changeView(currentview, urlparts.starttime, urlparts.endtime);
    graphPage.updateTitle();

});

/* If the user clicks the back or forward buttons, we want to return them
 * to that previous view as best we can */
/*window.addEventListener('popstate', function(event) {
    var urlparts = decomposeURL();

    if (urlparts.collection != graphCollection) {
        createGraphPage(urlparts.collection);
        currentstreams = urlparts.streams;
    } else {
        currentstreams = urlparts.streams;
    }

    graphPage.changeStream(currentstreams, urlparts.starttime, urlparts.endtime);

});*/


// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
