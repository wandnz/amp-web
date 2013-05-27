var smokepingSource = "";
var smokepingDest = "";

function sortDropdown(ddName, selected) {
    var r1 = $(ddName + " option");
    r1.sort( function(a, b) {
        if (a.text < b.text) return -1;
        if (a.text == b.text) return 0;
        return 1;
    });
    $(r1).remove();
    $(ddName).append($(r1));
    /* Currently Selected Source */
    if (selected != "") {
        var index = $(ddName + " > option:contains("+selected+")").index();
        $(ddName).prop("selectedIndex", index);
    } else {
        var index = $(ddName + " > option:contains(--SELECT--)").index();
        $(ddName).prop("selectedIndex",index);
    }
}

function updateSmokepingDropdown() {

    /* Update Destination */
    if (smokepingSource != "") {
        sortDropdown("#drpSource", smokepingSource);
        $("#drpDest").empty();
        $("#drpDest").append("<option value=\"loading...\">Loading...</option>");
        $("#drpDest").attr('disabled', '');

        /* Get data, update box */
        $.ajax({
            url: "/api/_destinations/smokeping/" + smokepingSource + "/",
            success: function(data) {
                /* Clear current destinations */
                $("#drpDest").empty();
                $("#drpDest").append(
                    "<option value=\"--SELECT--\">--SELECT--</option>");
                $.each(data, function(index, dst){
                    $("<option value=\"" + dst + "\">" + dst +
                        "</option>").appendTo("#drpDest");
                    });

                /* Enable second dropdown */
                $("#drpDest").removeAttr('disabled');
                sortDropDown("#drpDest", smokepingDest);
            }
        });
    }

}

function smokepingDropdownCB(object) {

    var smokestream = -1;

    switch (object.name) {
        case "source":
            if (object.value == "--SELECT--") {
                smokepingSource = "";
                smokepingDest = "";
            } else {
                smokepingSource = object.value;
                smokepingDest = "";
            }
            break;
        case "dest":
            if (object.value == "--SELECT--") {
                smokepingDest = "";
            } else {
                smokepingDest = object.value;
            }
            break;
    }
    /* Second Dropdown */
    if (object.name == "source" && object.value != "--SELECT--") {
        $("#drpDest").empty();
        $("#drpDest").append("<option value=\"loading...\">Loading...</option>");
        $("#drpDest").attr('disabled', '');

        /* Get data, update box */
        $.ajax({
            url: "/api/_destinations/smokeping/" + smokepingSource + "/",
            success: function(data) {
                /* Clear current destinations */
                $("#drpDest").empty();
                $("#drpDest").append(
                    "<option value=\"--SELECT--\">--SELECT--</option>");
                $.each(data, function(index, dst){
                    $("<option value=\"" + dst + "\">" + dst +
                        "</option>").appendTo("#drpDest");
                });

                /* Enable second dropdown */
                $("#drpDest").removeAttr('disabled');

                sortDropdown("#drpDest", smokepingDest);
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
        console.log("Getting stream id");
        $.ajax({
            url: "/api/_streams/smokeping/" + smokepingSource + "/" + smokepingDest + "/",
            success: function(data) {
                changeGraph({graph:"smokeping", stream:data});
                updatePageURL();
            }
       });
    }

}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :

