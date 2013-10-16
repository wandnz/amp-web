function MuninDropdown(stream) {
    Dropdown.call(this);
    
    this.munin = {"switch":"", "interface":"", "direction":""};
    this.getSelected();
    this.sortDropdown("#drpSwitch", this.munin["switch"]);
    this.sortDropdown("#drpInterface", this.munin["interface"]);
    this.sortDropdown("#drpDirection", this.munin["direction"]);
}

MuninDropdown.prototype = new Dropdown();
MuninDropdown.prototype.constructor = MuninDropdown;

MuninDropdown.prototype.getSelected = function() {
    if ($("#drpSwitch option:selected").text() != "--SELECT--") {
        this.munin["switch"] = $("#drpSwitch option:selected").text();
    } else {
        this.munin["switch"] = "";
    }
    if ($("#drpInterface option:selected").text() != "--SELECT--") {
        this.munin["interface"] = $("#drpInterface option:selected").text();
    } else {
        this.munin["interface"] = "";
    }

    if ($("#drpDirection option:selected").text() != "--SELECT--") {
        this.munin["direction"] = $("#drpDirection option:selected").text();
    } else {
        this.munin["direction"] = "";
    }
}

MuninDropdown.prototype.getDropdownState = function() {
    var obj = {
        "type" : "munin",
        "switch" : this.munin["switch"],
        "interface":  this.munin["interface"],
        "direction" : this.munin["direction"]
    };

    return obj;
}

MuninDropdown.prototype.setDropdownState = function(state) {
    this.munin["switch"] = state["switch"];
    this.munin["interface"] = state["interface"];
    this.munin["direction"] = state["direction"];
    this.sortDropdown("#drpSwitch", this.munin["switch"]);
    this.sortDropdown("#drpInterface", this.munin["interface"]);
    this.sortDropdown("#drpDirection", this.munin["direction"]);

}

MuninDropdown.prototype.callback = function(object) {
    this.getSelected();
    var ddobj = this;

    if (object.id == "drpSwitch") {
        $("#drpInterface").empty();
        $('<option value="--SELECT--">--SELECT--</option>').appendTo("#drpInterface");
        $("#drpInterface").attr('disabled', '');
        $("#drpDirection").empty();
        $('<option value="--SELECT--">--SELECT--</option>').appendTo("#drpDirection");
        $("#drpDirection").attr('disabled', '');

        this.munin["interface"] = "";
        this.munin["direction"] = "";

        if (this.munin["switch"] != "") {
            /* Populate the interfaces dropdown */
            $.ajax({
                url: API_URL + "/_destinations/rrd-muninbytes/" + ddobj.munin["switch"] + "/",
                success: function(data) {
                    ddobj.populateDropdown("#drpInterface", data, ddobj.munin["interface"]);
                    $("#drpInterface").removeAttr('disabled');
                }
            });
        }
    }

    if (object.id == "drpInterface") {
        $("#drpDirection").empty();
        $('<option value="--SELECT--">--SELECT--</option>').appendTo("#drpDirection");
        $("#drpDirection").attr('disabled', '');

        this.munin["direction"] = "";
        if (this.munin["interface"] != "") {
            /* Populate the directions dropdown */

            $.ajax({
                url: API_URL + "/_destinations/rrd-muninbytes/" + ddobj.munin["switch"] + "/" + ddobj.munin["interface"] + "/",
                success: function(data) {
                    ddobj.populateDropdown("#drpDirection", data, ddobj.munin["direction"]);
                    $("#drpDirection").removeAttr('disabled');
                }
            });
        }
    }

    if (this.munin["direction"] != "") {
        $.ajax({
            url: API_URL + "/_streams/rrd-muninbytes/" + this.munin["switch"] + "/" + this.munin["interface"] + "/" + this.munin["direction"] + "/",
            success: function(data) {
                changeGraph({graph:"rrd-muninbytes", stream:data});

            }
       });

    }


}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
