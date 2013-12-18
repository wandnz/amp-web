/* TODO reset any selectors below the one that has been changed? Can we
 * keep the existing value if it is still valid and only reset if the value
 * is no longer valid?
 */

function AmpDnsModal(/*stream*/) {
    Modal.call(this);
}

AmpDnsModal.prototype = new Modal();
AmpDnsModal.prototype.constructor = AmpDnsModal;

/* list all the selectables that can change/reset, in order of display */
AmpDnsModal.prototype.selectables = ["source", "server", "query", "type",
        "class", "payloadsize", "recurse", "dnssec", "nsid"];
AmpDnsModal.prototype.radioSelectors = ["recurse", "dnssec", "nsid"];

AmpDnsModal.prototype.update = function(name) {
    switch ( name ) {
        case "source": this.updateServer(); break;
        case "server": this.updateQuery(); break;
        case "query": this.updateType(); break;
        case "type": this.updateClass(); break;
        case "class": this.updateSize(); break;
        case "payloadsize": this.updateRecurse(); break;
        case "recurse": this.updateDnssec(); break;
        case "dnssec": this.updateNsid(); break;
        case "nsid": this.updateSubmit(); break;
        default: this.updateSource(); break;
    };
}


AmpDnsModal.prototype.updateSource = function() {
    var modal = this;
    $.ajax({
        url: "/api/_destinations/amp-dns/",
        success: function(data) {
            modal.populateDropdown("source", data, "source");
            modal.updateSubmit();
        }
    });
}



/* we've just changed the source, disable submission and update servers */
AmpDnsModal.prototype.updateServer = function() {
    var modal = this;
    var source = this.getDropdownValue("source");

    if ( source != "" ) {
        /* Populate the targets dropdown */
        $.ajax({
            url: "/api/_destinations/amp-dns/" + source + "/",
            success: function(data) {
                modal.populateDropdown("server", data, "server");
                modal.updateSubmit();
            }
        });
    }
}



/* we've just changed the server, disable submission and update queries */
AmpDnsModal.prototype.updateQuery = function () {
    var modal = this;
    var source = this.getDropdownValue("source");
    var server = this.getDropdownValue("server");

    if ( source != "" && server != "" ) {
        /* Populate the targets dropdown */
        $.ajax({
            url: "/api/_destinations/amp-dns/"+source+"/"+server+"/",
            success: function(data) {
                modal.populateDropdown("query", data, "query");
                modal.updateSubmit();
            }
        });
    }
}

AmpDnsModal.prototype.updateType = function () {
    var modal = this;
    var source = this.getDropdownValue("source");
    var server = this.getDropdownValue("server");
    var query = this.getDropdownValue("query");

    if ( source != "" && server != "" ) {
        /* Populate the targets dropdown */
        $.ajax({
            url: "/api/_destinations/amp-dns/"+source+"/"+server+"/"+query,
            success: function(data) {
                modal.populateDropdown("type", data, "type");
                modal.updateSubmit();
            }
        });
    }
}

AmpDnsModal.prototype.updateClass = function () {
    var modal = this;
    var source = this.getDropdownValue("source");
    var server = this.getDropdownValue("server");
    var query = this.getDropdownValue("query");
    var type = this.getDropdownValue("type");

    if ( source != "" && server != "" ) {
        /* Populate the targets dropdown */
        $.ajax({
            url: "/api/_destinations/amp-dns/"+source+"/"+server+"/"+query
                    +"/"+type,
            success: function(data) {
                modal.populateDropdown("class", data, "class");
                modal.updateSubmit();
            }
        });
    }
}

AmpDnsModal.prototype.updateSize = function () {
    var modal = this;
    var source = this.getDropdownValue("source");
    var server = this.getDropdownValue("server");
    var query = this.getDropdownValue("query");
    var type = this.getDropdownValue("type");
    var qclass = this.getDropdownValue("class");

    if ( source != "" && server != "" ) {
        /* Populate the targets dropdown */
        $.ajax({
            url: "/api/_destinations/amp-dns/"+source+"/"+server+"/"+query
                    +"/"+type + "/" + qclass,
            success: function(data) {
                modal.populateDropdown("payloadsize", data, "payload size");
                modal.updateSubmit();
            }
        });
    }
}

AmpDnsModal.prototype.updateRecurse = function () {
    var modal = this;
    var source = this.getDropdownValue("source");
    var server = this.getDropdownValue("server");
    var query = this.getDropdownValue("query");
    var type = this.getDropdownValue("type");
    var qclass = this.getDropdownValue("class");
    var psize = this.getDropdownValue("payloadsize");

    if ( source != "" && server != "" ) {
        /* Populate the targets dropdown */
        $.ajax({
            url: "/api/_destinations/amp-dns/"+source+"/"+server+"/"+query
                    +"/"+type + "/" + qclass + "/" + psize,
            success: function(data) {
                modal.enableBoolRadio("recurse", data);
                modal.update("recurse");
                modal.updateSubmit();
            }
        });
    }
}

AmpDnsModal.prototype.updateDnssec = function () {
    var modal = this;
    var source = this.getDropdownValue("source");
    var server = this.getDropdownValue("server");
    var query = this.getDropdownValue("query");
    var type = this.getDropdownValue("type");
    var qclass = this.getDropdownValue("class");
    var psize = this.getDropdownValue("payloadsize");
    var recurse = this.getRadioValue("recurse");

    if ( source != "" && server != "" ) {
        /* Populate the targets dropdown */
        $.ajax({
            url: "/api/_destinations/amp-dns/"+source+"/"+server+"/"+query
                    +"/"+type + "/" + qclass + "/" + psize + "/" + recurse,
            success: function(data) {
                modal.enableBoolRadio("dnssec", data);
                modal.update("dnssec");
                modal.updateSubmit();
            }
        });
    }
}

AmpDnsModal.prototype.updateNsid = function () {
    var modal = this;
    var source = this.getDropdownValue("source");
    var server = this.getDropdownValue("server");
    var query = this.getDropdownValue("query");
    var type = this.getDropdownValue("type");
    var qclass = this.getDropdownValue("class");
    var psize = this.getDropdownValue("payloadsize");
    var recurse = this.getRadioValue("recurse");
    var dnssec = this.getRadioValue("dnssec");

    if ( source != "" && server != "" ) {
        /* Populate the targets dropdown */
        $.ajax({
            url: "/api/_destinations/amp-dns/"+source+"/"+server+"/"+query
                    +"/"+type + "/" + qclass + "/" + psize + "/" + recurse
                    + "/" + dnssec,
            success: function(data) {
                modal.enableBoolRadio("nsid", data);
                modal.update("nsid");
                modal.updateSubmit();
            }
        });
    }
}

AmpDnsModal.prototype.submit = function() {
    /* get new view id */
    var source = this.getDropdownValue("source");
    var server = this.getDropdownValue("server");
    var query = this.getDropdownValue("query");
    var type = this.getDropdownValue("type");
    var qclass = this.getDropdownValue("class");
    var psize = this.getDropdownValue("payloadsize");

    if ( source != "" && server != "" && query != "" && type != "" ) {
        $.ajax({
            url: "/api/_createview/add/amp-dns/" + currentview + "/" + source +
                "/" + server + "/" + query + "/" + qclass + "/" + type + "/" 
                + psize + "/TFF" + "/FULL", // TODO Don't hard-code these
            success: this.finish,
        });
    }
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
