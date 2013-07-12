function LPIBasicDropdown() {
    Dropdown.call(this);

    this.metric = "";
    this.source = "";
    this.user = "";
    this.protocol = "";
    this.direction = "";

    this.getSelected();
    this.sortDropdown("#drpMetric", this.metric);
    this.sortDropdown("#drpSource", this.source);
    this.sortDropdown("#drpUser", this.user);
    this.sortDropdown("#drpProtocol", this.protocol);
    this.sortDropdown("#drpDirection", this.direction);
}

LPIBasicDropdown.prototype = new Dropdown();
LPIBasicDropdown.prototype.constructor = LPIBasicDropdown;

LPIBasicDropdown.prototype.getSelected = function() {
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

    if ($("#drpUser option:selected").text() != "--SELECT--") {
        this.user = $("#drpUser option:selected").text()
    } else {
        this.user = "";
    }

    if ($("#drpProtocol option:selected").text() != "--SELECT--") {
        this.protocol = $("#drpProtocol option:selected").text()
    } else {
        this.protocol = "";
    }

    if ($("#drpDirection option:selected").text() != "--SELECT--") {
        this.direction = $("#drpDirection option:selected").text()
    } else {
        this.direction = "";
    }
}

LPIBasicDropdown.prototype.getDropdownState = function() {
    var obj = {
        "type" : "lpibasic",
        "source": this.source,
        "metric": this.metric,
        "user": this.user,
        "protocol": this.protocol,
        "direction": this.direction
    };

    return obj;
}

LPIBasicDropdown.prototype.setDropdownState = function(state) {
    this.source = state["source"]
    this.metric = state["metric"]
    this.user = state["user"]
    this.protocol = state["protocol"]
    this.direction = state["direction"]
    this.sortDropdown("#drpMetric", this.metric);
    this.sortDropdown("#drpSource", this.source);
    this.sortDropdown("#drpUser", this.user);
    this.sortDropdown("#drpProtocol", this.protocol);
    this.sortDropdown("#drpDirection", this.direction);
}

function selectedSimilarMetric(current) {
    selected = $("#drpMetric option:selected").text();

    var basicMetrics = ["bytes", "packets", "peak flows", "new flows"]

    if (jQuery.inArray(selected, basicMetrics) != -1 && 
            jQuery.inArray(current, basicMetrics != -1))
        return true;
    
    if (jQuery.inArray(selected, userMetrics) != -1 && 
            jQuery.inArray(current, userMetrics != -1))
        return true;

    return false;
}

function metricCollection(metric) {

    switch(metric) {
        case "bytes":
            return "lpi-bytes";
        case "peak flows":
        case "new flows":
            return "lpi-flows";
        case "packets":
            return "lpi-packets";
    }

    return "unknown-metric";

}

function switchGraph(ddobj) {

    if (ddobj.metric != "" && ddobj.source != "" && ddobj.user != ""
            && ddobj.protocol != "" && ddobj.direction != "") {
       
        /* Slight hackish way of dealing with two metrics for one collection */
        var append = "";
        if (ddobj.metric == 'peak flows') {
            append = "peak/";
        }
        if (ddobj.metric == 'new flows') {
            append = "new/";
        }
        
        $.ajax({
            url: "/api/_streams/" + metricCollection(ddobj.metric) + "/" + ddobj.source + "/" + ddobj.user + "/" + ddobj.protocol + "/" + ddobj.direction + "/" + append,
            success: function(data) {
                changeGraph({graph:metricCollection(ddobj.metric), stream:data});
                updatePageURL(true);           
            }
        });
    }
}

LPIBasicDropdown.prototype.callback = function(object) {


    var prevMetric = this.metric;
    this.getSelected();
    var ddobj = this;
    
    if (object.name == "metric" && !selectedSimilarMetric(prevMetric)) {
        /* Completely different metric -- we need to change graph type */

    }

    else if (object.name == "source") {
        /* Clear the 'users' dropdown and re-populate it.
         *
         * TODO Maybe we don't really want to do this? Consider trying to 
         * track the same user across multiple monitors?
         */
        $("#drpUser").empty()
        $('<option value="--SELECT--">--SELECT--</option>').appendTo("#drpUser");
        $("#drpUser").attr('disabled','');

        this.user = "";
        if (this.source != "") {
            $.ajax({
                url: "/api/_destinations/" + metricCollection(ddobj.metric) + "/" + ddobj.source + "/",
                success: function(data) {
                    ddobj.populateDropdown("#drpUser", data, ddobj.user);
                }
            });
        }
    } else {
        switchGraph(ddobj);
    }

    
    
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
