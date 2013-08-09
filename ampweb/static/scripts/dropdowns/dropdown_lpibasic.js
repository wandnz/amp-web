/* Looking for lpiMetricToCollection? Check out util.js */

function LPIBasicDropdown(stream, collection) {
    Dropdown.call(this);

    this.source = "";
    this.user = "";
    this.protocol = "";
    this.direction = "";
    this.collection = collection;

    ddobj = this;
    
    /* Need to know what metric was being used by the stream that was being
     * displayed when the dropdowns were first created, so that we can 
     * properly query for new streams when the dropdown selection changes.
     *
     * This is slightly complicated by the fact that some LPI basic collections
     * don't have a metric!
     */
    if (stream != "-1" && stream != undefined && stream != "") {
        $.ajax({
            url: API_URL + "/_streaminfo/" + ddobj.collection + "/" + stream + "/",
            success: function(data) {
                ddobj.metric = data['metric'];
            }
        });
    } else if (this.collection == "lpi-flows") {
        /* No stream selected, but the flows collection still requires a 
         * metric. Tabs will allow switching from peak to new flows */
        this.metric = "peak";
    } else {
        /* No stream selected, but we shouldn't require a metric anyway */
        this.metric = "";
    }

    this.getSelected();
    this.sortDropdown("#drpSource", this.source);
    this.sortDropdown("#drpUser", this.user);
    this.sortDropdown("#drpProtocol", this.protocol);
    this.sortDropdown("#drpDirection", this.direction);
}

LPIBasicDropdown.prototype = new Dropdown();
LPIBasicDropdown.prototype.constructor = LPIBasicDropdown;

LPIBasicDropdown.prototype.getSelected = function() {
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
        "collection": this.collection,
        "protocol": this.protocol,
        "direction": this.direction
    };

    return obj;
}

LPIBasicDropdown.prototype.setDropdownState = function(state) {
    this.source = state["source"];
    this.metric = state["metric"];
    this.user = state["user"];
    this.protocol = state["protocol"];
    this.direction = state["direction"];
    this.collection = state["collection"];
    this.sortDropdown("#drpSource", this.source);
    this.sortDropdown("#drpUser", this.user);
    this.sortDropdown("#drpProtocol", this.protocol);
    this.sortDropdown("#drpDirection", this.direction);
}

LPIBasicDropdown.prototype.switchGraph = function() {

    var ddobj = this;

    if (ddobj.source != "" && ddobj.user != ""
            && ddobj.protocol != "" && ddobj.direction != "") {
       
        /* Slight hackish way of dealing with two metrics for one collection */
        var append = "";
        if (ddobj.metric == 'peak') {
            append = "peak/";
        }
        if (ddobj.metric == 'new') {
            append = "new/";
        }
        
        $.ajax({
            url: "/api/_streams/" + ddobj.collection + "/" + ddobj.source + "/" + ddobj.user + "/" + ddobj.protocol + "/" + ddobj.direction + "/" + append,
            success: function(data) {
                changeGraph({graph:ddobj.collection, stream:data});
            }
        });
    }
}

LPIBasicDropdown.prototype.callback = function(object) {


    this.getSelected();
    var ddobj = this;
    
    if (object.id == "drpSource" || object.id == "drpProtocol" || 
            object.id == "drpDirection") {
        /* Clear the 'users' dropdown and re-populate it.
         *
         * TODO Maybe we don't really want to do this? Consider trying to 
         * track the same user across multiple monitors?
         */
        $("#drpUser").empty()
        $('<option value="--SELECT--">--SELECT--</option>').appendTo("#drpUser");
        $("#drpUser").attr('disabled','');

        //this.user = "";
        if (this.source != "" && this.protocol != "" && this.direction != "") {
            $.ajax({
                url: "/api/_destinations/" + ddobj.collection + "/" + ddobj.source + "/" + ddobj.protocol + "/" + ddobj.direction + "/",
                success: function(data) {
                    if (ddobj.populateDropdown("#drpUser", data, ddobj.user)) {
                        ddobj.switchGraph();
                    } else {
                        ddobj.user = "";
                    }
                    $("#drpUser").removeAttr('disabled');
                }
            });
        }
    } else {
        ddobj.switchGraph();
    }

    
    
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
