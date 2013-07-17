function SmokepingDropdown() {
    Dropdown.call(this);

    this.source = "";
    this.dest = "";

    this.getSelected();
    this.sortDropdown("#drpSource", this.source);
    this.sortDropdown("#drpDest", this.dest);
}

SmokepingDropdown.prototype = new Dropdown();
SmokepingDropdown.prototype.constructor = SmokepingDropdown;

SmokepingDropdown.prototype.getSelected = function() {
    if ($("#drpSource option:selected").text() != "--SELECT--") {
        this.source = $("#drpSource option:selected").text();
    } else {
        this.source = "";
    }

    if ($("#drpDest option:selected").text() != "--SELECT--") {
        this.dest = $("#drpDest option:selected").text();
    } else {
        this.dest = "";
    }

}

SmokepingDropdown.prototype.getDropdownState = function() {
    var obj = {
        type: "smokeping",
        source:  this.source,
        dest: this.dest,
    };

    return obj;
}

SmokepingDropdown.prototype.setDropdownState = function(state) {
    this.source = state["source"];
    this.dest = state["dest"];
    this.sortDropdown("#drpSource", this.source);
    this.sortDropdown("#drpDest", this.dest);

}

SmokepingDropdown.prototype.callback = function(object) {
    this.getSelected();
    var ddobj = this;

    /* Second Dropdown */
    if (object.id == "drpSource" && object.value != "--SELECT--") {
        $("#drpDest").empty();
        $("#drpDest").append("<option value=\"loading...\">Loading...</option>");
        $("#drpDest").attr('disabled', '');

        this.dest = "";

        /* Get data, update box */
        $.ajax({
            url: "/api/_destinations/rrd-smokeping/" + ddobj.source + "/",
            success: function(data) {
                ddobj.populateDropdown("#drpDest", data, ddobj.dest);
            }
        });
    }

    /* Reset second dropdown */
    if (object.id == "drpSource" && object.value == "--SELECT--") {
        $('#drpDest').empty();
        $('<option value="--SELECT--">--SELECT--</option>').appendTo("#drpDest");
        $('#drpDest').attr('disabled', '');
    }


    /* Get the stream ID from the selection and return it */
    if (this.source != "" && this.dest != "") {
        $.ajax({
            url: "/api/_streams/rrd-smokeping/" + ddobj.source + "/" + ddobj.dest + "/",
            success: function(data) {
                changeGraph({graph:"rrd-smokeping", stream:data});
                updatePageURL(true);
            }
       });
    }

}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
