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

    /* TODO implement this when we have more than one metric */
    return false;
}

function metricCollection(metric) {

    switch(metric) {
        case "bytes":
            return "lpi-bytes";
    }

    return "unknown-metric";

}

LPIBasicDropdown.prototype.callback = function(object) {

    var ddobj = this;

    if (object.name == "metric" && selectedSimilarMetric(ddobj.metric)) {
        /* If the chosen metric is of a similar style to what we already had,
         * leave all of the other selections as they were
         */

        /* TODO implement this when we have more than one metric */
        return;
    }
    
    this.getSelected();
    if (object.name == "metric") {
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
    } else if (ddobj.metric != "" && ddobj.source != "" && ddobj.user != ""
            && ddobj.protocol != "" && ddobj.direction != "") {
        
        $.ajax({
            url: "/api/_streams/" + metricCollection(ddobj.metric) + "/" + ddobj.source + "/" + ddobj.user + "/" + ddobj.protocol + "/" + ddobj.direction + "/",
            success: function(data) {
                changeGraph({graph:metricCollection(ddobj.metric), stream:data});
                updatePageURL(true);           
            }
        });
    }

    
    
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
