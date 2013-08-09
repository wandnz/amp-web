/* XXX This is very similar to amp-icmp -- is it worthwhile trying to combine
 * them into the same script?
 */

function AmpTracerouteDropdown(stream) {
    Dropdown.call(this);

    this.source = "";
    this.dest = "";
    this.size = "";

    this.getSelected();
    this.sortDropdown("#drpSource", this.source);
    this.sortDropdown("#drpDest", this.dest);
    this.sortDropdown("#drpSize", this.size);
}

AmpTracerouteDropdown.prototype = new Dropdown();
AmpTracerouteDropdown.prototype.constructor = AmpTracerouteDropdown;

AmpTracerouteDropdown.prototype.getSelected = function() {
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
    
    if ($("#drpSize option:selected").text() != "--SELECT--") {
        this.size = $("#drpSize option:selected").text();
    } else {
        this.size = "";
    }


}

AmpTracerouteDropdown.prototype.getDropdownState = function() {
    var obj = {
        type: "amp-traceroute",
        source:  this.source,
        dest: this.dest,
        size: this.size,
    };

    return obj;
}

AmpTracerouteDropdown.prototype.setDropdownState = function(state) {
    this.source = state["source"];
    this.dest = state["dest"];
    this.size = state["size"];
    this.sortDropdown("#drpSource", this.source);
    this.sortDropdown("#drpDest", this.dest);
    this.sortDropdown("#drpSize", this.size);

}

AmpTracerouteDropdown.prototype.switchGraph = function() {
    var ddobj = this;
    /* Get the stream ID from the selection and return it */
    if (this.source != "" && this.dest != "" && this.size != "") {
        $.ajax({
            url: "/api/_streams/amp-traceroute/" + ddobj.source + "/" + ddobj.dest + "/" + ddobj.size + "/",
            success: function(data) {
                changeGraph({graph:"amp-traceroute", stream:data});
            }
       });
    }

}

AmpTracerouteDropdown.prototype.callback = function(object) {
    this.getSelected();
    var ddobj = this;

    /* Second Dropdown */
    if (object.id == "drpSource") {
        $("#drpDest").empty();
        $("#drpDest").append("<option value=\"--SELECT--\">--SELECT--</option>")
        $("#drpDest").attr('disabled', '');

        $("#drpSize").empty();
        $("#drpSize").append("<option value=\"--SELECT--\">--SELECT--</option>")
        $("#drpSize").attr('disabled', '');

        this.dest = "";
        this.size = "";

        if (this.source == "")
            return;

        /* TODO: Changing source shouldn't necessarily invalidate the 
           dest and size selections, but it is tricky for us to work out
           whether the size will still be valid.
        */
        $.ajax({
            url: "/api/_destinations/amp-traceroute/" + ddobj.source + "/",
            success: function(data) {
                ddobj.populateDropdown("#drpDest", data, ddobj.dest);
                $("#drpDest").removeAttr('disabled');
            }
        });
    }

    else if (object.id == "drpDest") {
        $("#drpSize").empty();
        $("#drpSize").append("<option value=\"--SELECT--\">--SELECT--</option>")
        $("#drpSize").attr('disabled', '');
       
        if (this.dest != "") {
            $.ajax({
                url: "/api/_destinations/amp-traceroute/" + ddobj.source + "/" + ddobj.dest + "/",
                success: function(data) {
                    /* If our current size is in the new size list, then 
                     * keep it selected and switch to the matching graph.
                     * Otherwise, invalidate the size dropdown.
                     */
                    if (ddobj.populateDropdown("#drpSize", data, ddobj.size)) {
                        ddobj.switchGraph();
                    } else {
                        ddobj.size = "";
                    }
                    $("#drpSize").removeAttr('disabled');
                }
            });
        }
    }

    else {
        switchGraph(ddobj);
    }


}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
