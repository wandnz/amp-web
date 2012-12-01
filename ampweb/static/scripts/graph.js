function changeText(text){
    //Get element, set text
    document.getElementById("graph").textContent = text;
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
        if(urlparts[i] != "undefined/"){
                url += urlparts[i];
            }else{
                break;
            }
    }

    document.location.href = (url)
}
