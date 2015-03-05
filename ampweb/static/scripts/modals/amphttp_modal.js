function AmpHttpModal () {
    Modal.call(this);
}

AmpHttpModal.prototype = new Modal();
AmpHttpModal.prototype.constructor = AmpHttpModal;
AmpHttpModal.prototype.collection = "amp-http";

AmpHttpModal.prototype.selectables = [
    { name: "source", label: "source", type: "dropdown" },
    { name: "destination", label: "URL", type: "dropdown", encode: true },
    { name: "max_connections", label: "connections", type: "dropdown" },
    { name: "max_connections_per_server", label: "server connections", type: "dropdown" },
    { name: "persist", label: "persistent", type: "boolradio" },
    { name: "max_persistent_connections_per_server", label: "persistent connections", type: "dropdown" },
    { name: "pipelining", label: "pipelining", type: "boolradio" },
    { name: "pipelining_max_requests", label: "pipelined requests", type: "dropdown" },
    { name: "caching", label: "caching", type: "boolradio" },
]

AmpHttpModal.prototype.update = function(name) {
    switch (name) {
        case 'caching':
            this.updateSubmit(); break;
        default:
            this.updateModalDialog(name); break;
    };
}

AmpHttpModal.prototype.submit = function() {
    var source = this.getDropdownValue("source");
    var target = this.getDropdownValue("destination", true);
    var maxconns = this.getDropdownValue("max_connections");
    var maxserverconns = this.getDropdownValue("max_connections_per_server");
    var persist = this.getRadioValue("persist");
    var maxpersist = this.getDropdownValue("max_persistent_connections_per_server");
    var pipe = this.getRadioValue("pipelining");
    var maxpipe = this.getDropdownValue("pipelining_max_requests");
    var caching = this.getRadioValue("caching");

    if (persist == "true")
        persist = "PERSIST";
    else if (persist == "false")
        persist = "NOPERSIST";

    if (pipe == "true")
        pipe = "PIPELINING";
    else if (pipe == "false")
        pipe = "NOPIPELINING";

    if (caching == "true")
        caching = "CACHING";
    else if (caching == "false")
        caching = "NOCACHING";


    if (source != "" && target != "" && maxconns != "" && persist != "" &&
            maxserverconns != "" && maxpersist != "" && pipe != "" &&
            maxpipe != "" && caching != "") {
        $.ajax({
            url: "/api/_createview/add/amp-http/" + currentView + "/"
                    + source + "/" + target + "/" + maxconns + "/" +
                    maxserverconns + "/" + persist + "/" + maxpersist + "/"
                    + pipe + "/" + maxpipe + "/" + caching,
            success: this.finish
        });
    }
}


// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
