/* TODO reset any selectors below the one that has been changed? Can we
 * keep the existing value if it is still valid and only reset if the value
 * is no longer valid?
 */

function AmpDnsModal(/*stream*/) {
    Modal.call(this);
}

AmpDnsModal.prototype = new Modal();
AmpDnsModal.prototype.constructor = AmpDnsModal;
AmpDnsModal.prototype.collection = "amp-dns";

/* list all the selectables that can change/reset, in order of display */
AmpDnsModal.prototype.selectables = [
    { name: "source", label: "source", type: "dropdown" },
    { name: "destination", label: "DNS server", type: "dropdown" },
    { name: "recurse", label: "recursion", type: "boolradio" },
    { name: "query", label: "name", type: "dropdown" },
    { name: "query_type", label: "query type", type: "dropdown" },
    { name: "query_class", label: "query class", type: "dropdown" },
    { name: "udp_payload_size", label: "payload size", type: "dropdown" },
    { name: "dnssec", label: "DNSSEC", type: "boolradio" },
    { name: "nsid", label: "NSID", type: "boolradio" }
];

AmpDnsModal.prototype.update = function(name) {
    switch ( name ) {
        case "source": this.updateModalDialog(name); break;
        case "destination": this.updateModalDialog(name); break;
        case "query": this.updateModalDialog(name); break;
        case "query_type": this.updateModalDialog(name); break;
        case "query_class": this.updateModalDialog(name); break;
        case "udp_payload_size": this.updateModalDialog(name); break;
        case "recurse": this.updateModalDialog(name); break;
        case "dnssec": this.updateModalDialog(name); break;
        case "nsid": this.updateSubmit(); break;
        default: this.updateModalDialog(name); break;
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
                "/" + server + "/" + query + "/" + type + "/" + qclass + "/" 
                + psize + "/" + flags + "/" + splitterm, 
            success: this.finish
        });
    }
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
