function changeGraph(graph){
    //Clear current graph
    document.getElementById("graph").innerHTML = "";

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
        default:
            drawLatencyGraph();
            break;
    }
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

    //0-Source, 1-Dest, 2-Type, 3-Args, 4-StartTime, 5-Endtime
    urlparts[0] = elements[0] + "/";
    urlparts[1] = elements[1] + "/";
    urlparts[2] = elements[2] + "/";
    urlparts[3] = elements[3] + "/";
    urlparts[4] = elements[4] + "/";
    urlparts[5] = elements[5] + "/";

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

    window.location.href = url; 
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

    //Configure the detailed graph
    var detailOptions = {
        name: 'detail',
        data: dummydata,
        height: 300,
        //Flotr config
        config: {
            yaxis: {
                min: 0
            }
        }
    };

    //Configure the summary graph
    var summaryOptions = {
        name: 'summary',
        data: dummydata,
        height: 50,
        //Flotr config
        config: {
            selection: {
                mode: 'x'
            }
        }
    };
    
    //Get the graph ready
    var vis = new envision.Visualization();
    var detail = new envision.Component(detailOptions);
    var summary = new envision.Component(summaryOptions);
    var interaction = new envision.Interaction();
    
    //Render Graph
    vis.add(detail);
    vis.add(summary);
    vis.render(container);
    
    //Wireup the interaction
    interaction.leader(summary);
    interaction.follower(detail);
    interaction.add(envision.actions.selection);
}
