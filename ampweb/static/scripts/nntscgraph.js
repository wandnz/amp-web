/* Global Variables */
var stream = "";
var graph = "";  /* Graph currently displayed */
var endtime = Math.round((new Date()).getTime() / 1000); /* End timestamp on the detail graph */
var starttime = endtime - (24 * 60 * 60 * 2);  /* Start timestamp of detail graph */
var generalstart = "";  /* The startime of the bottom graph */
var generalend = "";  /* The endtime of the bottom graph */
var host = "http://prophet.cms.waikato.ac.nz:7543";
var request; /* save an ongoing ajax request so that it can be cancelled */

/*
 * Variables for processed data. These need to be global so that data
 * can be passed from ajax function to ajax function.
 */
var x = [],
    y = [],
    detailData = [x, y],
    x2 = [],
    y2 = [],
    summaryData = [x2, y2],
    rawDetailData,
    rawSummaryData;


function changeGraph(input) {
    /* TODO move the styles to CSS */
    var graphStyle = "border: 3px solid #0F0F0F; " +
	"border-left: 1px solid white; " +
	"background-color: white;";

    if (input.stream != undefined) {
        stream = input.stream;
    }

    /* If source + dest are not set, stop */
    if (stream == "") {
        $("#graph").empty();
        $("#sparklineLatency").empty();
        $("#sparklineLoss").empty();
        $("#sparklineJitter").empty();
        return;
    }

    /* Get currect unix timestamp */
    generalend = Math.round((new Date()).getTime() / 1000);
    /* 1 Month ago */
    generalstart = generalend - (30 * 24 * 60 * 60);
        
    starttime = generalend - (60 * 60 * 24 * 2);
    endtime = generalend;

    /* abort any outstanding requests for graphs */
    if ( request ) {
        request.abort()
    }
    /* Clear current graph */
    $("#graph").empty();
    $("#graph").append("<p>Loading...</p>");

    /* If undefined, set as blank */
    if (input == undefined) {
        input = {graph: "latency" };
    }

    /* Resets the styling on the tabs */
    $("#latency").removeAttr("style");
    $("#jitter").removeAttr("style");
    $("#loss").removeAttr("style");
    $("#path").removeAttr("style");

    /* Based on graph, display */
    switch (input.graph) {
        case "latency":
            graph = "latency";
            drawLatencyGraph(input);
            $("#latency").attr("style", graphStyle);
            break;
        case "jitter":
            graph = "jitter";
            drawJitterGraph(input);
            $("#jitter").attr("style", graphStyle);
            break;
        case "loss":
            graph = "loss";
            drawLossGraph(input);
            $("#loss").attr("style", graphStyle);
            break;
        case "path":
            tracerouteGraph();
            $("#path").attr("style", graphStyle);
            break;
        case "smokeping":
            graph = "smokeping";
            drawSmokepingGraph(input);
            $("#smokeping").attr("style", graphStyle);
            break;
        case "muninbytes":
            graph = "muninbytes";
            drawMuninbytesGraph(input);
            $("#muninbytes").attr("style", graphStyle);
            break;
    }
    
    /* Draw sparklines */
    if ( input.graph != "smokeping" && input.graph != "muninbytes" ) {
	    drawSparkLines();
    }

    /*

    var graphurl = input.graph;
    if (input.specificstart != undefined) {
        graphurl += "/" + input.specificstart;
        if (input.specificend != undefined) {
            graphurl += "/" + input.specificend;
            if (input.generalstart != undefined) {
                graphurl += "/" + input.generalstart;
                if (input.generalend != undefined) {
                    graphurl += "/" + input.generalend;
                }
            }
        }
    }
    if (input.generalstart != undefined) {
        graphurl += "/" + input.generalstart;
        if (input.generalend != undefined) {
            graphurl += "/" + input.generalend;
            if (input.specificstart != undefined) {
                graphurl += "/" + input.specificstart;
                if (input.specificend != undefined) {
                    graphurl += "/" + input.specificend;
                }
            }
        }
    }
    */

    /* Update the url */
    //XXX the graphs with a selector at the bottom update the url on their
    // own, so we don't need to do this here. Surely this can be arranged
    // better?
    /*
    if (input.graph != "" && input.graph != "latency" &&
            input.graph != "loss" && input.graph != "smokeping" &&
	    input.graph != "muninbytes") {
        goToURL({"name": "graph", "value": graphurl});
    }
    */
}

function updatePageURL() {
    var base = $(location).attr('href').toString().split("graph")[0] + "graph/";
    
    var newurl = base + graph + "/" + stream + "/";

    /* XXX I'm so sorry for this code */
    if (generalstart != "") {
        newurl += generalstart + "/";

        if (generalend != "") {
            newurl += generalend + "/";
        
            if (starttime != "") {
                newurl += starttime + "/";
            
                if (endtime != "") {
                    newurl += endtime + "/";
                }
            }
        }
    }

    // TODO: Make titles work again
    var title = graph + " - ";
    
    History.pushState(null, title, newurl);
} 

function updateSelectionTimes(times) {

    if (times.generalstart != undefined) 
        generalstart = times.generalstart;
    if (times.generalend != undefined) 
        generalend = times.generalend;
    if (times.specificstart != undefined)
        starttime = times.specificstart;
    if (times.specificend != undefined)
        endtime = times.specificend;

    /* Update the URL using the current graph / stream info */
    updatePageURL();

}

function goToURL(object) {
    /* Initialize/Set variables */
    var base = $(location).attr('href').toString().split("graph")[0] + "graph/";
    var urlparts = [];

    /* Is a stream set? */
    var elements = [];
    $($(location).attr('href').toString().replace("#", "").split("graph")[1].toString().split("/")).each(
        function(index, val) {
            if (val != '') {
                elements.push(val);
            }
        });


    urlparts[0] = elements[0] + "/"; /* graph */
    urlparts[1] = elements[1] + "/"; /* stream */
    urlparts[2] = elements[2] + "/"; /* graph start time */
    urlparts[3] = elements[3] + "/"; /* graph end time */
    urlparts[4] = elements[4] + "/"; /* detail graph start time */
    urlparts[5] = elements[5] + "/"; /* detail graph end time */
 
    /* Sets based on users decision */
    switch (object.name) {
        case "source":
            urlparts[1] = object.value + "/";
            for (var i = 2; i < urlparts.length; i++) {
                urlparts[i] = "undefined/";
            }
            break;

        case "dest":
            urlparts[2] = object.value + "/";
            for (var i = 3; i < urlparts.length; i++) {
                urlparts[i] = "undefined/";
            }
            break;

        case "graph":
            urlparts[0] = object.value + "/";
            urlparts[3] = object.generalstart + "/";
            urlparts[4] = object.generalend + "/";
            urlparts[5] = object.starttime + "/";
            urlparts[6] = object.endtime + "/";
            break;
    }

    /* Build URL */
    var url = base;
    for (var i = 0; i < urlparts.length; i++) {
        if (urlparts[i] != "undefined/" && urlparts[i] != "--SELECT--/") {
                url += urlparts[i];
            } else {
                break;
            }
    }

    /* Builds Title */
    var title = "";
    if (graph != "") {
        title += graph + " - ";
    }
    //title += source + " to " + dest;

    History.pushState(null, title, url);
    /* if we change url, make sure all the variables associated update too */
    decomposeURLParameters();
}

/*
 * Updates the variables based on the url
 */
function decomposeURLParameters() {
    /* Get url */
    var url = $(location).attr('href').toString();
    url = url.replace("#", "");
    var urlparts = url.split("graph")[1].split("/");

    /* Get rid of leading blank */
    urlparts.splice(0, 1);

    /* Make up array to at least 7 */
    for (var i = 0; i <= 6; i++) {
	    urlparts.push("");
    }

    /* Set variables */
    graph = urlparts[0];
    stream = urlparts[1];

    if ( urlparts[2] == "" ) {
        /* default to starting one month ago if no date is given */
        generalstart = Math.round((new Date()).getTime() / 1000) -
            (60 * 60 * 24 * 30)
    } else {
        generalstart = urlparts[2];
    }

    if ( urlparts[3] == "" ) {
        generalend = Math.round((new Date()).getTime() / 1000);
    } else {
        generalend = urlparts[3];
    }
    if ( urlparts[4] == "" ) {
        starttime = generalend - (60 * 60 * 24 * 2);
    } else {
        starttime = urlparts[4];
    }

    if ( urlparts[5] == "" ) {
        endtime = generalend;
    } else {
        endtime = urlparts[5];
    }
}

function initSelectors() {
    
    switch(graph) {
        case "smokeping":
            initSmokepingDropdown(stream);
            break;
        case "muninbytes":
            initMuninDropdown(stream);
            break;
    }
}


/*
 * Updates page based on object (generally a dropdown)
 */
function dropdownCallback(origin, basetype) {

    //endtime = "";
    //starttime = "";

    switch(basetype) {
        case "smokeping":
            smokepingDropdownCB(origin);
            break;
        case "muninbytes":
            muninDropdownCB(origin);
            break;
    }

}

/*
 * Templates for Sparklines
 */
var sparkline_ts_template = {
            type: "line",
            disableInteraction: "true",
            disableTooltips: "true",
            width: "15em",
            height: "1.5em",
            chartRangeMin: 0,
            spotColor: false,
            minSpotColor: false,
            maxSpotColor: false,
            highlightSpotColor: false,
            highlightLineColor: false
        };
/*
 *  Updates the sparklines
 *  FIXME: Process on the server side and send the raw data back to the clients
 */
function drawSparkLines() {
    /* Initial Setup For data fetching */
    var endtime = Math.round((new Date()).getTime() / 1000);
    var starttime = endtime - (60 * 60 * 24);
    var url = "/api/" + source + "/" + dest + "/icmp/0084/" + starttime +
        "/" +  endtime + "/900";

    /* Send request for data */
    $.getJSON(url, function(input) {

        /* Latency */
        var rawdata = input.response.data;
        var actualdata = [];
        for (var i = 0; i < rawdata.length; i++) {
            if (rawdata[i].rtt_ms.loss != 1) {
                actualdata.push(rawdata[i].rtt_ms.mean);
            }
        }
        $("#sparklineLatency").sparkline(actualdata, sparkline_ts_template);

        /* Jitter */
        actualdata = [];
        for (var i = 0; i < rawdata.length; i++) {
            actualdata.push(rawdata[i].rtt_ms.jitter);
        }
        $("#sparklineJitter").sparkline(actualdata, sparkline_ts_template);

        /* Loss */
        actualdata =[];
        for (var i = 0; i < rawdata.length; i++) {
            actualdata.push(rawdata[i].rtt_ms.missing /
                    (rawdata[i].rtt_ms.missing + rawdata[i].rtt_ms.count)*100);
        }
        $("#sparklineLoss").sparkline(actualdata, sparkline_ts_template);
    });
}

/* FIXME: There is definitely a better way of coding this so that only one json function is needed instead of three */

/*
 *  Latency Graph
 */
function drawLatencyGraph(graph) {
    $("#graph").empty();
    BasicTimeSeries({
        container: $("#graph"),
        /* TODO do something sensible with start and end times, urls */
        start: starttime * 1000,
        end: endtime * 1000,
        generalstart: generalstart * 1000,
        generalend: generalend * 1000,
        urlbase: host+"/api/_graph/latency/"+source+"/"+dest,
	miny: 0,
	ylabel: "Latency (ms)"
    });
}

/*
 *  Jitter graph
 */
function drawJitterGraph(graph) {
    $("#graph").empty();
    BasicTimeSeries({
        container: $("#graph"),
        start: starttime * 1000,
        end: endtime * 1000,
        generalstart: generalstart * 1000,
        generalend: generalend * 1000,
        urlbase: host+"/api/_graph/jitter/"+source+"/"+dest,
	miny: 0,
	ylabel: "Jitter (ms)"
    });
}

/*
 *  Loss graph
 */
function drawLossGraph(graph){
    $("#graph").empty();
    BasicTimeSeries({
        container: $("#graph"),
        start: starttime * 1000,
        end: endtime * 1000,
        generalstart: generalstart * 1000,
        generalend: generalend * 1000,
        urlbase: host+"/api/_graph/loss/"+source+"/"+dest,
	miny: 0,
	maxy: 100,
	ylabel: "Loss (%)"
    });
}

/*
 *  Smokeping Latency Graph
 */
function drawSmokepingGraph(graph) {
    $("#graph").empty();
    Smoke({
        container: $("#graph"),
        /* TODO do something sensible with start and end times, urls */
        start: starttime * 1000,
        end: endtime * 1000,
        generalstart: generalstart * 1000,
        generalend: generalend * 1000,
        urlbase: host+"/api/_graph/smokeping/"+stream,
        event_urlbase: host+"/api/_event/smokeping/"+stream,
    });
}

function drawMuninbytesGraph(graph) {
    $("#graph").empty();
    BasicTimeSeries({
        container: $("#graph"),
        /* TODO do something sensible with start and end times, urls */
        start: starttime * 1000,
        //start: (endtime - (60*60*2)) * 1000,
        end: endtime * 1000,
        generalstart: generalstart * 1000,
        generalend: generalend * 1000,
        urlbase: host+"/api/_graph/muninbytes/"+stream,
        event_urlbase: host+"/api/_event/muninbytes/"+stream,
	miny: 0,
	ylabel: "MBs"
    });
}

/*
 * Goes to the last visited matrix page
 */
function backToMatrix() {
    /* Get the cookies */
    var last_Matrix = $.cookie("last_Matrix").replace("matrix", "#matrix");

    /* Redirect */
    if (last_Matrix) {
        window.location = last_Matrix;
    } else {
        window.location = "/matrix/latency/nz/nz";
    }
}


/*
 * Function that deals with traceroute graphs
 */
function tracerouteGraph() {
    $("#graph").append("<p>(This will take a while)</p>");
    ajax1 = $.getJSON("/api/_graph/tracemap/" + source +"/" + dest + "/", function(data) {
        $("#graph").empty()
        $.amptraceview($('#graph'), data , "right", "pruned");
    });
}


$(document).ready(function() {
    /* Solves problem of no slash on the end of the url */
        /* Only a problem with Hashbangs */

    if ($(location).attr("href").slice(-5) == "graph") {
        window.location = "/graph/";
    }

    var urlparts = [];
    var isHashbang = false;

    /* Update page variables, and draw graph */
    decomposeURLParameters();
    initSelectors();
    if (stream != "") {
        changeGraph({graph: graph});
    }

    //updateSmokepingDropdown();

});

/* Get's history.js running */
(function(window,undefined) {
    /* Prepare */
    var History = window.History;
    if (!History.enabled) {
         /*
          * History.js is disabled for this browser.
          * This is because we can optionally choose to support HTML4 browsers or not.
          */
        return false;
    }
})(window);

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
