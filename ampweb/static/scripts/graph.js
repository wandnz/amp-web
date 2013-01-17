/* Global Variables */
    var source = "";  /* The source amplet */
    var dest = "";  /* The destination amplet/site */
    var graph = "";  /* Graph currently displayed */
    var specificstart = "";  /* Start timestamp on the detail graph */
    var specificend = "";  /* End timestamp on the detail graph */
    var generalstart = "";  /* Start timestamp on the summary graph */
    var generalend = "";  /* End timestamp on the summary graph */
    var ajax1;  /* Ajax Request 1 (Used to request the detailed data) */
    var ajax2;  /* Ajax Request 2 (Used to request the summary data) */

/* Variables for processed data. These need to be global so that data can be passed from ajax function to ajax function. */
    var x = [],
        y = [],
        detailData = [x, y],
        x2 = [],
        y2 = [],
        summaryData = [x2, y2],
        rawDetailData,
        rawSummaryData;

function changeGraph(input) {
    /* If source + dest are not set, stop */
    if (source == "" || dest == "") {
        $("#graph").empty();
        $("#sparklineLatency").empty();
        $("#sparklineLoss").empty();
        $("#sparklineJitter").empty();
        return;
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
            drawLatencyGraph(input);
            $("#latency").attr("style", "border: 3px solid #0F0F0F; border-left: 1px solid white; background-color: white;");
            break;
        case "jitter":
            drawJitterGraph(input);
            $("#jitter").attr("style", "border: 3px solid #0F0F0F; border-left: 1px solid white; background-color: white;");
            break;
        case "loss":
            drawLossGraph(input);
            $("#loss").attr("style", "border: 3px solid #0F0F0F; border-left: 1px solid white; background-color: white;");
            break;
        case "path":
            $("#graph").empty();
            $("#graph").append("<p>Not Yet Implemented</p>");
            abortAjax();
            $("#path").attr("style", "border: 3px solid #0F0F0F; border-left: 1px solid white; background-color: white;");
            break;
    }

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
    
    /* Draw sparklines */
    drawSparkLines();

    /* Update the url */
    if (input.graph != "") {
        goToURL({"name": "graph", "value": graphurl});
    }
}

function goToURL(object) {

    /* Initialize/Set variables */
    var base = $(location).attr('href').toString().split("graph")[0] + "graph/";
    var urlparts = [];

    /* Is a source set? */
    var elements = [];
    $($(location).attr('href').toString().replace("#", "").split("graph")[1].toString().split("/")).each(
        function(index, val) {
            if (val != '') {
                elements.push(val);
            }
        });


    urlparts[0] = elements[0] + "/";
    urlparts[1] = elements[1] + "/";
    urlparts[2] = elements[2] + "/";
    urlparts[3] = elements[3] + "/";
    urlparts[4] = elements[4] + "/";

    /* Sets based on users decision */
    switch (object.name) {
        case "source":
            urlparts[0] = object.value + "/";
            for (var i = 1; i < urlparts.length; i++) {
                urlparts[i] = "undefined/";
            }
            break;

        case "dest":
            urlparts[1] = object.value + "/";
            for (var i = 2; i < urlparts.length; i++) {
                urlparts[i] = "undefined/";
            }
            break;

        case "graph":
            urlparts[2] = object.value + "/";
            for (var i = 3; i < urlparts.length; i++) {
                urlparts[i] = "undefined/";
            }
            break;
    }

    /* Build URL */
    var url = base;
    for (var i = 0; i < urlparts.length; i++) {
        if (urlparts[i] != "undefined/" && urlparts[i] != "--SELECT--/") {
                url += urlparts[i];
            }
            else {
                break;
            }
    }
    History.pushState(null, null, url);
}

/*
 * Updates the variables based on the url
 */
function updateVars() {
    /* Get url */
    var url = $(location).attr('href').toString();
    url = url.replace("#", "");
    var urlparts = url.split("graph")[1].split("/");

    /* Get rid of leading blank */
    urlparts.splice(0, 1);

    /* Make up array to at least 7 */
    for (var i = 0; i <= 7; i++) {
	    urlparts.push("");
    }

    /* Set variables */
    source = urlparts[0];
    dest = urlparts[1];
    graph = urlparts[2];
    specificstart = urlparts[3];
    specificend = urlparts[4];
    generalstart = urlparts[5];
    generalend = urlparts[6];
}

/*
 * Updates page based on variables already stored
 */
function updatePage() {
    /* Update Destination */
    if (source != "") {
        sortSource();
        $("#drpDest").empty();
        $("#drpDest").append("<option value=\"loading...\">Loading...</option>");
        $("#drpDest").attr('disabled', ''); 

        /* Get data, update box */
        $.ajax({url: "/api/_graph/dest/" + source + "/", success: function(data) {
                                 
            /* Clear current destinations */
            $("#drpDest").empty();
            $("#drpDest").append("<option value=\"--SELECT--\">--SELECT--</option>");
            $.each(data, function(index, dst){
                $("<option value=\"" + dst + "\">" + dst + "</option>").appendTo("#drpDest");
            });

            /* Enable second dropdown */
            $("#drpDest").removeAttr('disabled'); 

            sortDest();       

        }});
    }				
}


/*
 * Updates page based on object (generally a dropdown)
 */
function pageUpdate(object) {

    /* Set the global variables */
    switch (object.name) {
        case "source":
            if (object.value == "--SELECT--") {
                source = "";
                dest = "";
                graph = "";
                specificstart = "";
                specificend = "";
                generalstart = "";
                generalend = "";
            }
            else {
                source = object.value;
                dest = "";
                graph = "";
                specificstart = "";
                specificend = "";
                generalstart = "";
                generalend = "";
            }
            break;
        case "dest":
            if (object.value == "--SELECT--") {
                dest = "";
                graph = "";
                specificstart = "";
                specificend = "";
                generalstart = "";
                generalend = "";
            }
            else {
                dest = object.value;
                if (graph == "" && graph == undefined) {
                    graph = "latency";
                }
                specificstart = "";
                specificend = "";
                generalstart = "";
                generalend = "";
            }
            break;
        case "graph":
            graph = object.value;
            specificstart = "";
            specificend = "";
            generalstart = "";
            generalend = "";
            break;
        case "specificstart":
            specificstart = object.value;
            specificend = "";
            generalstart = "";
            break;
        case "specificend":
            specificend = object.value;
            generalstart = "";
            generalend = "";
            break;
        case "generalstart":
            generalstart = object.value;
            generalend = "";
            break;
        case "generalend":
            generalend = object.value;
            break;
    }

    /* Second Dropdown */
    if (object.name == "source" && object.value != "--SELECT--") {
        $("#drpDest").empty();
        $("#drpDest").append("<option value=\"loading...\">Loading...</option>");
        $("#drpDest").attr('disabled', ''); 

        /* Get data, update box */
        $.ajax({url: "/api/_graph/dest/" + source + "/", success: function(data) {
                /* Clear current destinations */
                $("#drpDest").empty();
                $("#drpDest").append("<option value=\"--SELECT--\">--SELECT--</option>");
                $.each(data, function(index, dst){
                    $("<option value=\"" + dst + "\">" + dst + "</option>").appendTo("#drpDest");
                });
             
                /* Enable second dropdown */
                $("#drpDest").removeAttr('disabled');

                sortDest();        
        }});
    }

    /* Reset second dropdown */
    if (object.name == "source" && object.value == "--SELECT--") {
        $('#drpDest').empty();
        $('<option value="--SELECT--">--SELECT--</option>').appendTo("#drpDest");
        $('#drpDest').attr('disabled', '');
    }

    /* Update url */
    goToURL(object);

}

/*
 * Templates for Sparklines
 */
var latency_template = {
            type: "line",
            disableInteration: "true",
            disableTooltips: "true",
            width: "15em",
            height: "1.5em",
            chartRangeMin: 0,
            spotColor: false,
            minSpotColor: false,
            maxSpotColor: false,
            highlightSpotColor: false,
            highlightLineColor: false
        },
    loss_template = {
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
 */
function drawSparkLines() {
    /* Initial Setup For data fetching */
    var endtime = Math.round((new Date()).getTime() / 1000);
    var starttime = endtime - (60 * 60 * 24);
    var url = "/api/" + source + "/" + dest + "/icmp/0084/" + starttime + "/" +  endtime + "/900";

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
        $("#sparklineLatency").sparkline(actualdata, latency_template);
        
        /* Jitter */
        actualdata = [];
        for (var i = 0; i < rawdata.length; i++) {
            actualdata.push(rawdata[i].rtt_ms.jitter);
        }
        $("#sparklineJitter").sparkline(actualdata, latency_template);
        
        /* Loss */
        actualdata =[];
        for (var i = 0; i < rawdata.length; i++) {
            actualdata.push(rawdata[i].rtt_ms.missing / (rawdata[i].rtt_ms.missing + rawdata[i].rtt_ms.count) * 100);    
        }
        $("#sparklineLoss").sparkline(actualdata, loss_template);
    });
    
}

/* FIXME: There is definitely a better way of coding this so that only one json function is needed instead of three */

/*
 *  Latency Graph
 */
function drawLatencyGraph(graph) {
    /* Get current unix timestamp */
    var endtime = Math.round((new Date()).getTime() / 1000);
    /* 1 day ago */
    var starttime = endtime - (60 * 60 * 24);
    
    /* Where to get the data from */
    var url = "/api/" + source + "/" + dest + "/icmp/0084/" + starttime + "/" +  endtime;

    abortAjax();
    
    /* Make the request for Detail data */
    ajax1 = $.getJSON(url + "/300", function(da) {
        /* Get raw data */
        rawDetailData = da.response.data;

        /* Clear Variables */
        x = [],
        y = [],
        detailData = [x, y],
        x2 = [],
        y2 = [],
        summaryData = [x2, y2];
        
        /* Request summary data */
        ajax2 = $.getJSON(url + "/900", function(daa) {
            /* Get raw data */
            rawSummaryData = daa.response.data;                
            
            /* Extract Detail Data */
            for (var i = 0; i < rawDetailData.length; i++) {
                x.push(rawDetailData[i].time * 1000);
                y.push(rawDetailData[i].rtt_ms.mean);
            } 

            /* Extract Summary Data */
            for (var i = 0; i < rawSummaryData.length; i++) {
                x2.push(rawSummaryData[i].time * 1000);
                y2.push(rawSummaryData[i].rtt_ms.mean);
            } 

            /* No data, no graph */
            if (detailData[0].length == 0 || detailData[1].length == 0 || summaryData[0].length == 0 || summaryData[1].length == 0) {
                $("#graph").empty();            
                $("<p>No Data Available.</p>").appendTo("#graph");
            }
            else { 
                /* Clear, then Draw graph */
                $("#graph").empty();
                Latency({summarydata: detailData, detaildata: summaryData, container: $("#graph")});
            }
        });
    });
}

/*
 *  Jitter graph
 */
function drawJitterGraph(graph) {
    /* Get current unix timestamp */
    var endtime = Math.round((new Date()).getTime() / 1000);
    /* 1 day ago */
    var starttime = endtime - (60 * 60 * 24);

    /* Where to get data from */
    var url = "/api/" + source + "/" + dest + "/icmp/0084/" + starttime + "/" + endtime;

    abortAjax();

    /* Make the request for the Detail data */
    ajax1 = $.getJSON(url + "/300", function(da) {
        /* Get raw data */
        rawDetailData = da.response.data;
        
        /* Clear Variables */
        x = [],
        y = [],
        detailData = [x, y],
        x2 = [],
        y2 = [],
        summaryData = [x2, y2];        

        /* Request summary data */
        ajax2 = $.getJSON(url + "/900", function(daa) {
            /* Get raw data */
            rawSummaryData = daa.response.data;         

            /* Extract Detail Data */
            for (var i = 0; i < rawDetailData.length; i++) {
                x.push(rawDetailData[i].time * 1000);
                y.push(rawDetailData[i].rtt_ms.jitter);
            }
        
            /* Extract Summary Data */
            for (var i = 0; i < rawSummaryData.length; i++) {
                x2.push(rawSummaryData[i].time * 1000);
                y2.push(rawSummaryData[i].rtt_ms.jitter);
            }           

            /* No data, no graph */
            if (rawDetailData[0].length == 0 || rawDetailData[1].length == 0 || rawSummaryData[0].length == 0 || rawSummaryData[1].length == 0) {
            $("#graph").empty();            
            $("<p>No Data Available</p>").appendTo("#graph");
            }
            else {           
                /* Clear, then Draw graph */
                $("#graph").empty();
                Latency({summarydata: detailData, detaildata: summaryData, container: $("#graph")});
            }
        });
    });
}

/*
 *  Loss graph
 */
function drawLossGraph(graph){
    /* Get currect unix timestamp */   
    var endtime = Math.round((new Date()).getTime() / 1000);
    /* 1 day ago */
    var starttime = endtime - (60 * 60 * 24);

    /* Where to get the data from */
    var url = "/api/" + source + "/" + dest + "/icmp/0084/" + starttime + "/" + endtime;

    abortAjax();

    /* Make the request for the data */
    ajax1 = $.getJSON(url + "/300", function(da) {
        /* Get raw data */
        rawDetailData = da.response.data;

        /* Clear Variables */
        x = [],
        y = [],
        detailData = [x, y],
        x2 = [],
        y2 = [],
        summaryData = [x2, y2];
        
        /* Request summary data */
        ajax2 = $.getJSON(url + "/900", function(daa) {
            
            /* Get raw data */
            rawSummaryData = daa.response.data;          

            /* Extracts Detail Data */            
            for (var i = 0; i < rawDetailData.length; i++) {
                x.push(rawDetailData[i].time * 1000);
                y.push(rawDetailData[i].rtt_ms.missing / (rawDetailData[i].rtt_ms.missing + rawDetailData[i].rtt_ms.count) * 100);
            }

            /* Extracts Summary Data */
            for (var i = 0; i < rawSummaryData.length; i++) {
                x2.push(rawSummaryData[i].time * 1000);
                y2.push(rawSummaryData[i].rtt_ms.missing / (rawSummaryData[i].rtt_ms.missing + rawSummaryData[i].rtt_ms.count) * 100);
            }

            /* No data, no graph */
            if (detailData[0].length == 0 || detailData[1].length == 0 || summaryData[0].length == 0 || summaryData[1].length == 0) {
                $("#graph").empty();            
                $("<p>No Data Available</p>").appendTo("#graph");
            }
            else {
                /* Clear, then Draw graph */
                $("#graph").empty();
                Loss({summarydata: detailData, detaildata: summaryData, container: $("#graph")});
            }
        });
    });
}

/*
 * Sorts the source listbox
 */
function sortSource() {
    var r1 = $("#drpSource option");
    r1.sort( function(a, b) {
        if (a.text < b.text) return -1;
        if (a.text == b.text) return 0;
        return 1;
    });
    $(r1).remove();
    $("#drpSource").append($(r1));
    /* Currently Selected Source */
    if (source != "") {
        var index = $("#drpSource > option:contains("+source+")").index();
        $("#drpSource").prop("selectedIndex", index);
    }
    else {
        var index = $("#drpSource > option:contains(--SELECT--)").index();
        $("#drpSource").prop("selectedIndex",index);
    }
}

/*
 * Sorts the destination listbox
 */
function sortDest() {
    var r1 = $("#drpDest option");
    r1.sort( function(a, b) {
        if (a.text < b.text) return -1;
        if (a.text == b.text) return 0;
        return 1;
    });
    $(r1).remove();
    $("#drpDest").append($(r1));

    /* Currently Selected Destination */
    if (dest != "") {
        var index = $("#drpDest > option:contains("+dest+")").index();
        $("#drpDest").prop("selectedIndex",index);
    }
    else {
        var index = $("#drpDest > option:contains(--SELECT--)").index();
        $("#drpDest").prop("selectedIndex",index);
    }
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
    }
    else {
        window.location = "/matrix/latency/nz/nz";
    }
}

/*
 * Abort Any Outstanding Ajax Requests
 */
function abortAjax() {
    /* Check for ajax requests */
    if (ajax1 && ajax1.readyState != 4) {
        ajax1.abort();
    }
    if (ajax2 && ajax2.readyState != 4) {
        ajax2.abort();
    }
}
