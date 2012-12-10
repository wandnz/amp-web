//Global Variables
    var source = "";  //The source amplet
    var dest = "";  //The destination amplet/site
    var graph = "";  //Graph currently displayed
    var starttime = "";  //Current time selected on the graph (start)
    var endtime = "";  //Current time selected on the graph (finish)


function changeGraph(graph){
    //If source + dest are not set, stop
    if(source == "" || dest == ""){
        $("#graph").empty();
        return;
    }
    
    //Clear current graph
    $("#graph").html("");

    //Based on graph, display
    switch(graph){
        case "Latency":
            drawLatencyGraph();
            break;
        case "Jitter":
            drawLatencyGraph();
            break;
        case "Loss":
            drawLatencyGraph();
            break;
        case "Path":
            drawLatencyGraph();
            break;
    }

    //Update the url
    goToURL({"name": "graph", "value": graph});
}

function goToURL(object){

    //Initialize/Set variables
    var base = window.location.toString().split("graph")[0] + "graph/";
    var urlparts = [];

    //Is a source set?
    var elements = [];
    window.location.toString().split("graph")[1].toString().split("/").forEach(
        function(p){
            if(p != ''){
                elements.push(p);
            }
        });

    //0-Source, 1-Dest, 2-Graph, 3-StartTime, 4-Endtime
    urlparts[0] = elements[0] + "/";
    urlparts[1] = elements[1] + "/";
    urlparts[2] = elements[2] + "/";
    urlparts[3] = elements[3] + "/";
    urlparts[4] = elements[4] + "/";

    //Sets based on users decision
    switch(object.name){
        case "source":
            urlparts[0] = object.value + "/";
            for(var i = 1; i < urlparts.length; i++){
                urlparts[i] = "undefined/";
            }
            break;

        case "dest":
            urlparts[1] = object.value + "/";
            for(var i = 2; i < urlparts.length; i++){
                urlparts[i] = "undefined/";
            }
            break;

        case "graph":
            urlparts[2] = object.value + "/";
            for(var i = 3; i < urlparts.length; i++){
                urlparts[i] = "undefined/";
            }
            break;
    }

    //Build URL
    var url = base;
    for(var i = 0; i < urlparts.length; i++){
        if(urlparts[i] != "undefined/" && urlparts[i] != "--SELECT--/"){
                url += urlparts[i];
            }else{
                break;
            }
    }

    window.history.pushState("object or string", "THIS IS A TITLE", url);
}



////
//Updates page based on object (generally a dropdown)
////
function pageUpdate(object) {
    //Set the global variables
    switch(object.name){
        case "source":
            if(source == "--SELECT--")
                source = "";
            else
                source = object.value;
            break;
        case "dest":
            if(dest == "--SELECT--")
                dest = "";
            else
                dest = object.value;
            break;
        case "graph":
            graph = object.value;
            break;
        case "starttime":
            starttime = object.value;
            break;
        case "endtime":
            starttime = object.value;
            break;
    }

    //Second Dropdown
    if(object.name == "source" && object.value != "--SELECT--"){
        //Get data, update box
        $.ajax({url: "/data/" + source + "/", success: function(data){
            data = data.split(",");
            //Clear current destinations
            $("#dest").empty();
            $("#dest").append("<option>--SELECT--</option>");
            $.each(data, function(index, dst){
                $("<option>" + dst + "</option>").appendTo("#dest");
            });
        //Enable second dropdown
        $("#dest").removeAttr('disabled');
        }});
    }

    //Reset second dropdown
    if(object.name == "source" && object.value == "--SELECT--"){
        $('#dest').empty();
        $('<option>--SELECT--</option>').appendTo("#dest");
        $('#dest').attr('disabled', '');
    }

    //Update url
    goToURL(object);
}



///////////////////////////////////////////////////////////////////////////////
//                                                                           //
//                      Graphing Functions. . .                              //
//                                             ||                            //
//                                             VV                            //
///////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////
//                        Latency Graph                                      //
///////////////////////////////////////////////////////////////////////////////
function drawLatencyGraph(){
    var dummydata = [
        [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14],
        [7,8,9,4,5,6,1,2,3,7,8,9,4,5,6]
        ];
    
    var container = $("#graph");
    //Draw graph
    Latency({data: dummydata, container: container});
}
