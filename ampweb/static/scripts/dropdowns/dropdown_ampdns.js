function AmpDnsDropdown(stream) {
    Dropdown.call(this);

    this.source = "";
    this.dest = "";
    this.query = "";
    this.address = "";

    this.getSelected();
    this.sortDropdown("#drpSource", this.source);
    this.sortDropdown("#drpDest", this.dest);
    this.sortDropdown("#drpQuery", this.query);
    this.sortDropdown("#drpAddr", this.address);
}

AmpDnsDropdown.prototype = new Dropdown();
AmpDnsDropdown.prototype.constructor = AmpDnsDropdown;

AmpDnsDropdown.prototype.getSelected = function() {
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
    
    if ($("#drpQuery option:selected").text() != "--SELECT--") {
        this.query = $("#drpQuery option:selected").text();
    } else {
        this.query = "";
    }

    if ($("#drpAddr option:selected").text() != "--SELECT--") {
        this.address = $("#drpAddr option:selected").text();
    } else {
        this.address = "";
    }




}

AmpDnsDropdown.prototype.getDropdownState = function() {
    var obj = {
        type: "amp-dns",
        source:  this.source,
        dest: this.dest,
        query: this.query,
        address: this.address,
    };

    return obj;
}

AmpDnsDropdown.prototype.setDropdownState = function(state) {
    this.source = state["source"];
    this.dest = state["dest"];
    this.query = state["query"];
    this.address = state["address"];
    this.sortDropdown("#drpSource", this.source);
    this.sortDropdown("#drpDest", this.dest);
    this.sortDropdown("#drpQuery", this.query);
    this.sortDropdown("#drpAddr", this.address);

}

AmpDnsDropdown.prototype.switchGraph = function() {
    var ddobj = this;

    /* Get the stream ID from the selection and return it */
    if (this.source != "" && this.dest != "" && this.query != "" &&
            this.address != "") {
        $.ajax({
            url: API_URL + "/_streams/amp-dns/" + ddobj.source + "/" + ddobj.dest + "/" + ddobj.query + "/" + ddobj.address,
            success: function(data) {
                changeGraph({graph:"amp-dns", stream:data});
            }
       });
    }

}

AmpDnsDropdown.prototype.callback = function(object) {
    this.getSelected();
    var ddobj = this;

    /* Second Dropdown */
    if (object.id == "drpSource") {
        $("#drpDest").empty();
        $("#drpDest").append("<option value=\"--SELECT--\">--SELECT--</option>")
        $("#drpDest").attr('disabled', '');

        $("#drpQuery").empty();
        $("#drpQuery").append("<option value=\"--SELECT--\">--SELECT--</option>")
        $("#drpQuery").attr('disabled', '');
        
        $("#drpAddr").empty();
        $("#drpAddr").append("<option value=\"--SELECT--\">--SELECT--</option>")
        $("#drpAddr").attr('disabled', '');


        this.dest = "";
        this.query = "";
        this.address = "";

        /* TODO: Changing source shouldn't necessarily invalidate the 
           dest and query selections, but it is tricky for us to work out
           whether the query will still be valid.
        */

        if (this.source == "")
            return;

        $.ajax({
            url: API_URL + "/_destinations/amp-dns/" + ddobj.source + "/",
            success: function(data) {
                ddobj.populateDropdown("#drpDest", data, ddobj.dest);
                $("#drpDest").removeAttr('disabled');
            }
        });
    }

    else if (object.id == "drpDest") {
        $("#drpQuery").empty();
        $("#drpQuery").append("<option value=\"--SELECT--\">--SELECT--</option>")
        $("#drpQuery").attr('disabled', '');
        
        $("#drpAddr").empty();
        $("#drpAddr").append("<option value=\"--SELECT--\">--SELECT--</option>")
        $("#drpAddr").attr('disabled', '');
       
        ddobj.address = "";
        ddobj.query = "";
        if (this.dest != "") {
            $.ajax({
                url: API_URL + "/_destinations/amp-dns/" + ddobj.source + "/" + ddobj.dest + "/",
                success: function(data) {
                    ddobj.populateDropdown("#drpQuery", data, ddobj.query);
                    $("#drpQuery").removeAttr('disabled');
                }
            });
        }
    }

    else if (object.id == "drpQuery") {
        $("#drpAddr").empty();
        $("#drpAddr").append("<option value=\"--SELECT--\">--SELECT--</option>")
        $("#drpAddr").attr('disabled', '');
      
        if (this.query != "") {
            $.ajax({
                url: API_URL + "/_destinations/amp-dns/" + ddobj.source + "/" + ddobj.dest + "/" + ddobj.query,
                success: function(data) {
                    /* If our current address is in the new list, then 
                     * keep it selected and switch to the matching graph.
                     * Otherwise, invalidate the address dropdown.
                     */
                    if (ddobj.populateDropdown("#drpAddr", data, ddobj.address)) {
                        ddobj.switchGraph();
                    } else {
                        ddobj.address = "";
                    }
                    $("#drpAddr").removeAttr('disabled');
                }
            });
        }
    }
             
    else {
        ddobj.switchGraph();
    }


}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
