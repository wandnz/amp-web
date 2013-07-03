var smokepingSource = "";
var smokepingDest = "";

var munin = {"switch":"", "interface":"", "direction":""};

function sortDropdown(ddName, selected) {
    var r1 = $(ddName + " option");
    r1.sort( function(a, b) {
        if (a.text < b.text) return -1;
        if (a.text == b.text) return 0;
        return 1;
    });
    $(r1).remove();
    $(ddName).append($(r1));
   
    /* Set the selected value to our "please select" option */ 
    if (selected == "") {
        selected = "--SELECT--";
    }
    
    /* VERY IMPORTANT: don't use object:contains() here! It doesn't do an
     * exact match, so if you have two text options with similar names you can
     * often end up with the wrong option being selected.
     *
     * The below approach is much more explicit and will perform an exact
     * match only.
     */
    $(ddName + " option").each(function() {
        if ($(this).text() == selected) {
            $(this).attr('selected', 'selected');
            return;
        } else {
            $(this).attr('selected', false);
        }
    });
}

function populateDropdown(name, data, selected) {
    /* Clear the current population */
    $(name).empty();
    $(name).append(
            "<option value=\"--SELECT--\">--SELECT--</option>");
    $.each(data, function(index, dst){
            $("<option value=\"" + dst + "\">" + dst +
                "</option>").appendTo(name);
            });

    /* Enable the dropdown */
    $(name).removeAttr('disabled');
    sortDropdown(name, selected);

}

function muninGetSelected() {
    if ($("#drpSwitch option:selected").text() != "--SELECT--") {
        munin["switch"] = $("#drpSwitch option:selected").text();
    } else {
        munin["switch"] = "";
    }
    if ($("#drpInterface option:selected").text() != "--SELECT--") {
        munin["interface"] = $("#drpInterface option:selected").text();
    } else {
        munin["interface"] = "";
    }

    if ($("#drpDirection option:selected").text() != "--SELECT--") {
        munin["direction"] = $("#drpDirection option:selected").text();
    } else {
        munin["direction"] = "";
    }
}

function smokepingGetSelected() {

    if ($("#drpSource option:selected").text() != "--SELECT--") {
        smokepingSource = $("#drpSource option:selected").text();
    } else {
        smokepingSource = "";
    }

    if ($("#drpDest option:selected").text() != "--SELECT--") {
        smokepingDest = $("#drpDest option:selected").text();
    } else {
        smokepingDest = "";
    }


}

function getSmokepingDropdownState() {
    var obj = {
        type: "smokeping",
        source:  smokepingSource,
        dest: smokepingDest,
    };

    return obj;

}

function getMuninDropdownState() {
    var obj = {
        "type" : "munin",
        "switch" : munin["switch"],
        "interface":  munin["interface"],
        "direction" : munin["direction"]
    };

    return obj;

}

function setSmokepingDropdownState(state) {

    smokepingSource = state["source"];
    smokepingDest = state["dest"];
    sortDropdown("#drpSource", smokepingSource);
    sortDropdown("#drpDest", smokepingDest);

}

function setMuninDropdownState(state) {

    munin["switch"] = state["switch"];
    munin["interface"] = state["interface"];
    munin["direction"] = state["direction"];
    sortDropdown("#drpSwitch", munin["switch"]);
    sortDropdown("#drpInterface", munin["interface"]);
    sortDropdown("#drpDirection", munin["direction"]);
}


function initMuninDropdown() {

    muninGetSelected();
    sortDropdown("#drpSwitch", munin["switch"]);
    sortDropdown("#drpInterface", munin["interface"]);
    sortDropdown("#drpDirection", munin["direction"]);
}

function initSmokepingDropdown(currentstream) {

    smokepingGetSelected();
    sortDropdown("#drpSource", smokepingSource);
    sortDropdown("#drpDest", smokepingDest);

}

function muninDropdownCB(object) {

    muninGetSelected();

    if (object.name == "switch") {
        $("#drpInterface").empty();
        $('<option value="--SELECT--">--SELECT--</option>').appendTo("#drpInterface");
        $("#drpInterface").attr('disabled', '');
        $("#drpDirection").empty();
        $('<option value="--SELECT--">--SELECT--</option>').appendTo("#drpDirection");
        $("#drpDirection").attr('disabled', '');
    
        munin["interface"] = "";
        munin["direction"] = "";
            
        if (munin["switch"] != "") {
            /* Populate the interfaces dropdown */

            $.ajax({
                url: API_URL + "/_destinations/rrd-muninbytes/" + munin["switch"] + "/",
                success: function(data) {
                    populateDropdown("#drpInterface", data, munin["interface"]);
                }
            });
        } 
    }

    if (object.name == "interface") {
        $("#drpDirection").empty();
        $('<option value="--SELECT--">--SELECT--</option>').appendTo("#drpDirection");
        $("#drpDirection").attr('disabled', '');
        
        munin["direction"] = "";
        if (munin["interface"] != "") {
            /* Populate the directions dropdown */

            $.ajax({
                url: API_URL + "/_destinations/rrd-muninbytes/" + munin["switch"] + "/" + munin["interface"] + "/",
                success: function(data) {
                    populateDropdown("#drpDirection", data, munin["direction"]);
                }
            });
        } 
    }

    if (munin["direction"] != "") {
        $.ajax({
            url: API_URL + "/_streams/rrd-muninbytes/" + munin["switch"] + "/" + munin["interface"] + "/" + munin["direction"] + "/",
            success: function(data) {
                changeGraph({graph:"rrd-muninbytes", stream:data});
                updatePageURL(true);

            }
       });

    }

}

function smokepingDropdownCB(object) {

    smokepingGetSelected();

    /* Second Dropdown */
    if (object.name == "source" && object.value != "--SELECT--") {
        $("#drpDest").empty();
        $("#drpDest").append("<option value=\"loading...\">Loading...</option>");
        $("#drpDest").attr('disabled', '');
        
        smokepingDest = "";

        /* Get data, update box */
        $.ajax({
            url: API_URL + "/_destinations/rrd-smokeping/" + smokepingSource + "/",
            success: function(data) {
                populateDropdown("#drpDest", data, smokepingDest);
            }
        });
    }

    /* Reset second dropdown */
    if (object.name == "source" && object.value == "--SELECT--") {
        $('#drpDest').empty();
        $('<option value="--SELECT--">--SELECT--</option>').appendTo("#drpDest");
        $('#drpDest').attr('disabled', '');
    }


    /* Get the stream ID from the selection and return it */
    if (smokepingSource != "" && smokepingDest != "") {
        $.ajax({
            url: API_URL + "/_streams/rrd-smokeping/" + smokepingSource + "/" + smokepingDest + "/",
            success: function(data) {
                changeGraph({graph:"rrd-smokeping", stream:data});
                updatePageURL(true);
            }
       });
    }

}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :

