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
AmpDnsModal.prototype.selectables = ["source", "server", "query", "type"]

AmpDnsModal.prototype.update = function(name) {
    switch ( name ) {
        case "source": this.updateServer(); break;
        case "server": this.updateQuery(); break;
        case "query": this.updateType(); break;
        case "type": this.updateSubmit(); break;
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



/* we've just changed the query, disable submission and update types */
AmpDnsModal.prototype.updateType = function () {
    var modal = this;
    var source = this.getDropdownValue("source");
    var server = this.getDropdownValue("server");
    var query = this.getDropdownValue("query");

    if ( source != "" && server != "" && query != "" ) {
        /* Populate the targets dropdown */
        $.ajax({
            /* XXX this currently returns the responding address, don't care */
            /* TODO it should be the query class/type */
            url: "/api/_destinations/amp-dns/"+source+"/"+server+"/"+query+"/",
            success: function(data) {
                modal.populateDropdown("type", data, "type");
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

    if ( source != "" && server != "" && query != "" && type != "" ) {
        $.ajax({
            url: "/api/_createview/add/amp-dns/" + currentview + "/" + source +
                "/" + server + "/" + query + "/IN/" + type + "/4096",
            success: this.finish,
        });
    }
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
