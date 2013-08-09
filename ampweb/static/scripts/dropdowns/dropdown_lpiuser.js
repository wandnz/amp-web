function LPIUserDropdown(stream) {
    Dropdown.call(this);

    this.source = ""
    this.protocol = "";

    ddobj = this;
   
    /* Need to know what metric was being used by the stream that was being
     * displayed when the dropdowns were first created, so that we can 
     * properly query for new streams when the dropdown selection changes.
     */ 
    if (stream != "-1" && stream != undefined && stream != "") {
        $.ajax({
            url: API_URL + "/_streaminfo/lpi-users/" + stream + "/",
            success: function(data) {
                ddobj.metric = data['metric'];
            }
        });
    } else {
        /* Default if no stream was selected -- tabs should allow switching
         * to observed users */
        this.metric = "active";
    }


    this.getSelected();
    this.sortDropdown("#drpSource", this.source);
    this.sortDropdown("#drpProtocol", this.protocol);

}

LPIUserDropdown.prototype = new Dropdown();
LPIUserDropdown.prototype.constructor = LPIUserDropdown;

LPIUserDropdown.prototype.getSelected = function() {
    if ($("#drpSource option:selected").text() != "--SELECT--") {
        this.source = $("#drpSource option:selected").text()
    } else {
        this.source = "";
    }

    if ($("#drpProtocol option:selected").text() != "--SELECT--") {
        this.protocol = $("#drpProtocol option:selected").text()
    } else {
        this.protocol = "";
    }

}

LPIUserDropdown.prototype.getDropdownState = function() {
    var obj = {
        "type" : "lpiuser",
        "source": this.source,
        "metric": this.metric,
        "protocol": this.protocol,
    };

    return obj;
}

LPIUserDropdown.prototype.setDropdownState = function(state) {
    this.source = state["source"];
    this.protocol = state["protocol"];
    this.metric = state["metric"];
    this.sortDropdown("#drpSource", this.source);
    this.sortDropdown("#drpProtocol", this.protocol);
}

function switchGraph(ddobj) {

    if (ddobj.source != "" && ddobj.protocol != "") {

        /* Slight hackish way of dealing with two metrics for one collection */
        var append = "";
        if (ddobj.metric == 'active') {
            append = "active/";
        }
        if (ddobj.metric == 'observed') {
            append = "observed/";
        }

        $.ajax({
            url: "/api/_streams/lpi-users/" + ddobj.source + "/" + ddobj.protocol + "/" + append,
            success: function(data) {
                changeGraph({graph:'lpi-users', stream:data});
            }
        });
    }
}

LPIUserDropdown.prototype.callback = function(object) {
    this.getSelected();
    var ddobj = this;

    switchGraph(ddobj);
}


// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
