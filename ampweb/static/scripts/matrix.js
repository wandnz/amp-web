var matrix;
$(document).ready(function(){
    matrix = $('#AMP_matrix').dataTable({
        "bInfo": false, //disable table information
        "bProcessing": true, //enabling processing indicator
        "bStateSave": true, //saves user table state in a cookie
        "bPaginate": false, //disable pagination
        "bJQueryUI": true, //enable JQuery UI for ThemeRoller support
        "sAjaxSource": "/update_matrix", //get ajax data from this source
        /*
            overrides the default function for getting the data from the server,
            so that we can pass data in the ajax request 
        */
        "fnServerData": function(sSource, aoData, fnCallback) {
            //load up some default values, incase none are specified
            var src = "nz";
            var dst = "nz";
            var ipVersion = "ipv4";
            var test = "icmp";
            var uri = new URI(window.location); //pull the current url
            var segments = uri.segment(); //split the url path into segments

            if((segments[1] != undefined) && (segments[1] != "")) {
                ipVersion = segments[1];
                if((segments[2] != undefined) && (segments[2] != "")) {
                    test = segments[2];
                    if((segments[3] != undefined) && (segments[3] !=  "")) {
                        src = segments[3];
                        if((segments[4] != undefined) && (segments[4] != "")) {
                            dst = segments[4];
                        }
                    }
                }
            }

            aoData.push({"name": "ipVersion", "value": ipVersion});
            aoData.push({"name": "testType", "value": test});
            aoData.push({"name": "source", "value": src});
            aoData.push({"name": "destination", "value": dst});
            $.ajax({
                "dataType": "json",
                "type": "GET",
                "url": sSource,
                "data": aoData,
                "success": fnCallback
            });
        }
    });
    setInterval("reDraw()", 1000);
});

function reDraw() {
    matrix.fnReloadAjax();
}
