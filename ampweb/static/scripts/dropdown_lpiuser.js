function LPIUserDropdown() {
    Dropdown.call(this);

    this.metric = "";
    this.source = ""
    this.protocol = "";

    this.getSelected();
    this.sortDropdown("#drpMetric", this.metric);
    this.sortDropdown("#drpSource", this.source);
    this.sortDropdown("#drpProtocol", this.protocol);

}

LPIUserDropdown.prototype = new Dropdown();
LPIUserDropdown.prototype.constructor = LPIUserDropdown;

LPIUserDropdown.prototype.getSelected = function() {
    if ($("#drpMetric option:selected").text() != "--SELECT--") {
        this.metric = $("#drpMetric option:selected").text()
    } else {
        this.metric = "";
    }

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
    this.source = state["source"]
    this.metric = state["metric"]
    this.protocol = state["protocol"]
    this.sortDropdown("#drpMetric", this.metric);
    this.sortDropdown("#drpSource", this.source);
    this.sortDropdown("#drpProtocol", this.protocol);
}

function selectedSimilarMetric(current) {
    selected = $("#drpMetric option:selected").text();

    var userMetrics = ["active users", "observed users"]

    if (jQuery.inArray(selected, userMetrics) != -1 &&
            jQuery.inArray(current, userMetrics != -1))
        return true;

    return false;
}

function switchGraph(ddobj) {

    if (ddobj.metric != "" && ddobj.source != "" && ddobj.protocol != "") {

        /* Slight hackish way of dealing with two metrics for one collection */
        var append = "";
        if (ddobj.metric == 'active users') {
            append = "active/";
        }
        if (ddobj.metric == 'observed users') {
            append = "observed/";
        }

        $.ajax({
            url: "/api/_streams/lpi-users/" + ddobj.source + "/" + ddobj.protocol + "/" + append,
            success: function(data) {
                changeGraph({graph:'lpi-users', stream:data});
                updatePageURL(true);
            }
        });
    }
}

LPIUserDropdown.prototype.callback = function(object) {
    var prevMetric = this.metric;
    this.getSelected();
    var ddobj = this;

    if (object.name == "metric" && !selectedSimilarMetric(prevMetric)) {
        /* Completely different metric -- we need to change graph type */

    } else {
        switchGraph(ddobj);
    }
}


// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
