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

AmpDnsModal.prototype.selectables = [
    { name: "source", label: "source", type: "dropdown" },
    { name: "destination", label: "DNS server", type: "dropdown" },
    { name: "query", label: "name", type: "dropdown" },
    { name: "query_type", label: "query type", type: "dropdown" },
    { name: "query_class", label: "query class", type: "dropdown" },
    { name: "udp_payload_size", label: "payload size", type: "dropdown" },
    { name: "recurse", label: "recursion", type: "boolradio" },
    { name: "dnssec", label: "DNSSEC", type: "boolradio" },
    { name: "nsid", label: "NSID", type: "boolradio" }
];

AmpDnsModal.prototype.update = function(name) {
    switch ( name ) {
        case "source": this.updateServer(); break;
        case "destination": this.updateQuery(); break;
        case "query": this.updateType(); break;
        case "query_type": this.updateClass(); break;
        case "query_class": this.updateSize(); break;
        case "udp_payload_size": this.updateRecurse(); break;
        case "recurse": this.updateDnssec(); break;
        case "dnssec": this.updateNsid(); break;
        case "nsid": this.updateSubmit(); break;
        default: this.updateSource(); break;
    };
}


AmpDnsModal.prototype.updateAll = function(data) {
    var modal = this;
    $.each(modal.selectables, function(index, sel) {
        if (!data.hasOwnProperty(sel.name)) {
            return;
        }

        if (sel.type == "boolradio") {
            modal.enableBoolRadio(sel.name, data[sel.name]);
        } else {
            modal.populateDropdown(sel.name, data[sel.name], sel.label);
        }
    });
    modal.updateSubmit();

}

AmpDnsModal.prototype.updateSource = function() {
    var modal = this;
    $.ajax({
        url: "/api/_destinations/amp-dns/",
        success: function(data) {
            modal.updateAll(data);
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
                modal.updateAll(data);
            }
        });
    }
}



/* we've just changed the server, disable submission and update queries */
AmpDnsModal.prototype.updateQuery = function () {
    var modal = this;
    var source = this.getDropdownValue("source");
    var server = this.getDropdownValue("destination");

    if ( source != "" && server != "" ) {
        /* Populate the targets dropdown */
        $.ajax({
            url: "/api/_destinations/amp-dns/"+source+"/"+server+"/",
            success: function(data) {
                modal.updateAll(data);
            }
        });
    }
}

AmpDnsModal.prototype.updateType = function () {
    var modal = this;
    var source = this.getDropdownValue("source");
    var server = this.getDropdownValue("destination");
    var query = this.getDropdownValue("query");

    if ( source != "" && server != "" ) {
        /* Populate the targets dropdown */
        $.ajax({
            url: "/api/_destinations/amp-dns/"+source+"/"+server+"/"+query,
            success: function(data) {
                modal.updateAll(data);
            }
        });
    }
}

AmpDnsModal.prototype.updateClass = function () {
    var modal = this;
    var source = this.getDropdownValue("source");
    var server = this.getDropdownValue("destination");
    var query = this.getDropdownValue("query");
    var type = this.getDropdownValue("query_type");

    if ( source != "" && server != "" ) {
        /* Populate the targets dropdown */
        $.ajax({
            url: "/api/_destinations/amp-dns/"+source+"/"+server+"/"+query
                    +"/"+type,
            success: function(data) {
                modal.updateAll(data);
            }
        });
    }
}

AmpDnsModal.prototype.updateSize = function () {
    var modal = this;
    var source = this.getDropdownValue("source");
    var server = this.getDropdownValue("destination");
    var query = this.getDropdownValue("query");
    var type = this.getDropdownValue("query_type");
    var qclass = this.getDropdownValue("query_class");

    if ( source != "" && server != "" ) {
        /* Populate the targets dropdown */
        $.ajax({
            url: "/api/_destinations/amp-dns/"+source+"/"+server+"/"+query
                    +"/"+type + "/" + qclass,
            success: function(data) {
                modal.updateAll(data);
            }
        });
    }
}

AmpDnsModal.prototype.updateRecurse = function () {
    var modal = this;
    var source = this.getDropdownValue("source");
    var server = this.getDropdownValue("destination");
    var query = this.getDropdownValue("query");
    var type = this.getDropdownValue("query_type");
    var qclass = this.getDropdownValue("query_class");
    var psize = this.getDropdownValue("udp_payload_size");

    if ( source != "" && server != "" ) {
        /* Populate the targets dropdown */
        $.ajax({
            url: "/api/_destinations/amp-dns/"+source+"/"+server+"/"+query
                    +"/"+type + "/" + qclass + "/" + psize,
            success: function(data) {
                modal.updateAll(data);
            }
        });
    }
}

AmpDnsModal.prototype.updateDnssec = function () {
    var modal = this;
    var source = this.getDropdownValue("source");
    var server = this.getDropdownValue("destination");
    var query = this.getDropdownValue("query");
    var type = this.getDropdownValue("query_type");
    var qclass = this.getDropdownValue("query_class");
    var psize = this.getDropdownValue("udp_payload_size");
    var recurse = this.getRadioValue("recurse");

    if ( source != "" && server != "" ) {
        /* Populate the targets dropdown */
        $.ajax({
            url: "/api/_destinations/amp-dns/"+source+"/"+server+"/"+query
                    +"/"+type + "/" + qclass + "/" + psize + "/" + recurse,
            success: function(data) {
                modal.updateAll(data);
            }
        });
    }
}

AmpDnsModal.prototype.updateNsid = function () {
    var modal = this;
    var source = this.getDropdownValue("source");
    var server = this.getDropdownValue("destination");
    var query = this.getDropdownValue("query");
    var type = this.getDropdownValue("query_type");
    var qclass = this.getDropdownValue("query_class");
    var psize = this.getDropdownValue("udp_payload_size");
    var recurse = this.getRadioValue("recurse");
    var dnssec = this.getRadioValue("dnssec");

    if ( source != "" && server != "" ) {
        /* Populate the targets dropdown */
        $.ajax({
            url: "/api/_destinations/amp-dns/"+source+"/"+server+"/"+query
                    +"/"+type + "/" + qclass + "/" + psize + "/" + recurse
                    + "/" + dnssec,
            success: function(data) {
                modal.updateAll(data);
            }
        });
    }
}

AmpDnsModal.prototype.submit = function() {
    /* get new view id */
    var source = this.getDropdownValue("source");
    var server = this.getDropdownValue("destination");
    var query = this.getDropdownValue("query");
    var type = this.getDropdownValue("query_type");
    var qclass = this.getDropdownValue("query_class");
    var psize = this.getDropdownValue("udp_payload_size");
    var recurse = this.getRadioValue("recurse");
    var dnssec = this.getRadioValue("dnssec");
    var nsid = this.getRadioValue("nsid");
    var split = this.getRadioValue("aggregation");

    var flags = "";
    if (recurse == "true")
        flags += "T";
    else
        flags += "F";
    if (dnssec == "true")
        flags += "T";
    else
        flags += "F";
    if (nsid == "true")
        flags += "T";
    else
        flags += "F";

    var splitterm;
    if (split == "none")
        splitterm = "NONE";
    else
        splitterm = "FULL";

    if ( source != "" && server != "" && query != "" && type != "" ) {
        $.ajax({
            url: "/api/_createview/add/amp-dns/" + currentView + "/" + source +
                "/" + server + "/" + query + "/" + qclass + "/" + type + "/" 
                + psize + "/" + flags + "/" + splitterm, 
            success: this.finish
        });
    }
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
