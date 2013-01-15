/* Global Variables */
    var source = "";  /* The source amplet */
    var dest = "";  /* The destination amplet/site */
    var graph = "";  /* Graph currently displayed */
    var specificstart = "";  /* Start timestamp on the detail graph */
    var specificend = "";  /* End timestamp on the detail graph */
    var generalstart = "";  /* Start timestamp on the summary graph */
    var generalend = "";  /* End timestamp on the summary graph */

/* Variables for processed data. These need to be global so that data can be passed from ajax function to ajax function. */
    var x = [],
        y = [],
        detailData = [x, y],
        x2 = [],
        y2 = [],
        summaryData = [x2, y2],
        rawDetailData,
        rawSummaryData;

function changeGraph(graph) {
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
    if (graph == undefined) {
        graph = {graph: "" };
    }

    /* Resets the styling on the tabs */
    $("#latency").removeAttr("style");
    $("#jitter").removeAttr("style");
    $("#loss").removeAttr("style");
    $("#path").removeAttr("style");  

    /* Based on graph, display */
    switch (graph.graph) {
        case "latency":
            drawLatencyGraph(graph);
            $("#latency").attr("style", "border-left: 1px solid white; background-color: white;");
            break;
        case "jitter":
            drawJitterGraph(graph);
            $("#jitter").attr("style", "border-left: 1px solid white; background-color: white;");
            break;
        case "loss":
            drawLossGraph(graph);
            $("#loss").attr("style", "border-left: 1px solid white; background-color: white;");
            break;
        case "path":
            $("#graph").empty();
            $("#graph").append("<p>Not Yet Implemented</p>");
            $("#path").attr("style", "border-left: 1px solid white; background-color: white;");
            break;
    }

    var graphurl = graph.graph;
    if (graph.specificstart != undefined) {
        graphurl += "/" + graph.specificstart;
        if (graph.specificend != undefined) {
            graphurl += "/" + graph.specificend;
            if (graph.generalstart != undefined) {
                graphurl += "/" + graph.generalstart;
                if (graph.generalend != undefined) {
                    graphurl += "/" + graph.generalend;
                }
            }
        }
    }
    
    /* Draw sparklines */
    drawSparkLines();

    /* Update the url */
    if (graph.graph != "") {
        goToURL({"name": "graph", "value": graphurl});
    }
}

function goToURL(object) {

    /* Initialize/Set variables */
    var base = $(location).attr('href').toString().split("graph")[0] + "graph/";
    var urlparts = [];

    /* Is a source set? */
    var elements = [];
    $($(location).attr('href').toString().split("graph")[1].toString().split("/")).each(
        function(index, val) {
            if (val != '') {
                elements.push(val);
            }
        });

    /* 0-Source, 1-Dest, 2-Graph, 3-StartTime, 4-Endtime */
    if (elements[0] != undefined && elements[0] != "" && elements[0].toString().substring(0, 1) == "#") {  /* Handles Hashbang support */
        urlparts[0] = elements[0].substring(1) + "/";
    }
    else {
        urlparts[0] = elements[0] + "/";
    }
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
    var url = $(location).attr('href').toString().split("graph")[1];
    var urlparts = url.split("/");

    /* Get rid of leading blank */
    urlparts.splice(0, 1);

    /* Checks to see if the url is a hashbang, then adjusts if it is */
    if (urlparts.length > 0 && urlparts[0].substring(0, 1) == "#") {
	    urlparts[0] = urlparts[0].substring(1);
    }

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
                graph = "";
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
    var url = "/api/" + source + "/" + dest + "/icmp/0084/" + starttime + "/" +  endtime + "/480/";

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
        var mean = 0;
        for (var i = 0; i < rawdata.length; i++) {
            if (rawdata[i].rtt_ms.loss != 1) {          
                actualdata.push(rawdata[i].rtt_ms.mean);
                mean += rawdata[i].rtt_ms.mean;
            }
        }
        mean = mean / rawdata.length;
        var processed = [];
        for (var i = 0; i < actualdata.length; i++) {
            if (mean - actualdata[i] < 0) {
                processed.push((mean - actualdata[i]) * -1);
            }
            else {
                processed.push(mean - actualdata[i]);
            }
        }
        $("#sparklineJitter").sparkline(processed, latency_template);
        
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

    /* Make the request for Detail data */
    $.getJSON(url + "/300", function(da) {
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
        $.getJSON(url + "/900", function(daa) {
            /* Get raw data */
            rawSummaryData = daa.response.data;        

            var offset = (new Date()).getTimezoneOffset() * 60;            
            
            /* Extract Detail Data */
            for (var i = 0; i < rawDetailData.length; i++) {
                x.push((rawDetailData[i].time - offset) * 1000);
                y.push(rawDetailData[i].rtt_ms.mean);
            } 

            /* Extract Summary Data */
            for (var i = 0; i < rawSummaryData.length; i++) {
                x2.push((rawSummaryData[i].time - offset) * 1000);
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
 *  Loss graph
 */
function drawLossGraph(graph){
    /* Get currect unix timestamp */   
    var endtime = Math.round((new Date()).getTime() / 1000);
    /* 1 day ago */
    var starttime = endtime - (60 * 60 * 24);

    /* Where to get the data from */
    var url = "/api/" + source + "/" + dest + "/icmp/0084/" + starttime + "/" + endtime;

    /* Make the request for the data */
    $.getJSON(url + "/300", function(da) {
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
        $.getJSON(url + "/900", function(daa) {
            
            /* Get raw data */
            rawSummaryData = daa.response.data;

            var offset = (new Date()).getTimezoneOffset() * 60;            

            /* Extracts Detail Data */            
            for (var i = 0; i < rawDetailData.length; i++) {
                x.push((rawDetailData[i].time - offset)* 1000);
                y.push(rawDetailData[i].rtt_ms.missing / (rawDetailData[i].rtt_ms.missing + rawDetailData[i].rtt_ms.count) * 100);
            }

            /* Extracts Summary Data */
            for (var i = 0; i < rawSummaryData.length; i++) {
                x2.push((rawSummaryData[i].time - offset)* 1000);
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
 *  Jitter graph
 */
function drawJitterGraph(graph) {
    /* Get current unix timestamp */
    var endtime = Math.round((new Date()).getTime() / 1000);
    /* 1 day ago */
    var starttime = endtime - (60 * 60 * 24);

    /* Where to get data from */
    var url = "/api/" + source + "/" + dest + "/icmp/0084/" + starttime + "/" + endtime;

    /* Make the request for the Detail data */
    $.getJSON(url + "/300", function(da) {
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
        $.getJSON(url + "/900", function(daa) {
            /* Get raw data */
            rawSummaryData = daa.response.data;    

            var offset = (new Date()).getTimezoneOffset() * 60;        

            /* Extract Detail Data */
            for (var i = 0; i < rawDetailData.length; i++) {
                x.push((rawDetailData[i].time - offset) * 1000);
                y.push(rawDetailData[i].rtt_ms.jitter);
            }
        
            /* Extract Summary Data */
            for (var i = 0; i < rawSummaryData.length; i++) {
                x2.push((rawSummaryData[i].time - offset) * 1000);
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
