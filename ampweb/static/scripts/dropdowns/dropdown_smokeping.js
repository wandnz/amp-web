function SmokepingDropdown(stream) {
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
    if (object.id == "drpSource") {
        $("#drpDest").empty();
        $("#drpDest").append("<option value=\"--SELECT--\">--SELECT--</option>");
        $("#drpDest").attr('disabled', '');

        this.dest = "";

        if (this.source == "")
            return;

        /* Get data, update box */
        $.ajax({
            url: API_URL + "/_destinations/rrd-smokeping/" + ddobj.source + "/",
            success: function(data) {
                ddobj.populateDropdown("#drpDest", data, ddobj.dest);
                $("#drpDest").removeAttr('disabled');
            }
        });
    }

    /* Get the stream ID from the selection and return it */
    if (this.source != "" && this.dest != "") {
        $.ajax({
            url: API_URL + "/_streams/rrd-smokeping/" + ddobj.source + "/" + ddobj.dest + "/",
            success: function(data) {
                changeGraph({graph:"rrd-smokeping", stream:data});
            }
       });
    }

}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
