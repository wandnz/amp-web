/* TODO reset any selectors below the one that has been changed? Can we
 * keep the existing value if it is still valid and only reset if the value
 * is no longer valid?
 */

function AmpDnsModal(/*stream*/) {
    Modal.call(this);
}

AmpDnsModal.prototype = new Modal();
AmpDnsModal.prototype.constructor = AmpDnsModal;

/* we've just changed the source, disable submission and update servers */
AmpDnsModal.prototype.updateServer = function() {
    var source;
    var modal = this;

    if ( $("#source option:selected").val() != this.marker ) {
        source = $("#source option:selected").val().trim();
    } else {
        source = "";
    }
    if ( source != "" ) {
        /* Populate the targets dropdown */
        $.ajax({
            url: "/api/_destinations/amp-dns/" + source + "/",
            success: function(data) {
                modal.populateDropdown("#server", data, "server");
                modal.updateSubmit();
            }
        });
    }
}

/* we've just changed the server, disable submission and update queries */
AmpDnsModal.prototype.updateQuery = function () {
    var source, server;
    var modal = this;

    if ( $("#source option:selected").val() != this.marker ) {
        source = $("#source option:selected").val().trim();
    } else {
        source = "";
    }

    if ( $("#server option:selected").val() != this.marker ) {
        server = $("#server option:selected").val().trim();
    } else {
        server = "";
    }

    if ( source != "" && server != "" ) {
        /* Populate the targets dropdown */
        $.ajax({
            url: "/api/_destinations/amp-dns/"+source+"/"+server+"/",
            success: function(data) {
                modal.populateDropdown("#query", data, "query");
                modal.updateSubmit();
            }
        });
    }
}

/* we've just changed the query, disable submission and update types */
AmpDnsModal.prototype.updateType = function () {
    var source, server, query;
    var modal = this;

    if ( $("#source option:selected").val() != this.marker ) {
        source = $("#source option:selected").val().trim();
    } else {
        source = "";
    }

    if ( $("#server option:selected").val() != this.marker ) {
        server = $("#server option:selected").val().trim();
    } else {
        server = "";
    }

    if ( $("#query option:selected").val() != this.marker ) {
        query = $("#query option:selected").val().trim();
    } else {
        query = "";
    }

    if ( source != "" && server != "" && query != "" ) {
        /* Populate the targets dropdown */
        $.ajax({
            /* XXX this currently returns the responding address, don't care */
            /* TODO it should be the query class/type */
            url: "/api/_destinations/amp-dns/"+source+"/"+server+"/"+query+"/",
            success: function(data) {
                modal.populateDropdown("#type", data, "type");
                modal.updateSubmit();
            }
        });
    }
}


AmpDnsModal.prototype.updateSubmit = function() {
    var source = $("#source option:selected").val();
    var server = $("#server option:selected").val();
    var query = $("#query option:selected").val();
    var type = $("#type option:selected").val();

    /* set the enabled/disabled state of the submit button */
    if ( source != undefined && source != this.marker &&
            server != undefined && server != this.marker &&
            query != undefined && query != this.marker &&
            type != undefined && type != this.marker ) {
        /* everything is set properly, enable the submit button */
        $("#submit").prop("disabled", false);
    } else {
        /* something isn't set, disable the submit button */
        $("#submit").prop("disabled", true);
    }
}


AmpDnsModal.prototype.submit = function() {
    /* get new view id */
    var source, server, query, type;

    if ( $("#source option:selected").val() != this.marker ) {
        source = $("#source option:selected").val().trim();
    } else {
        source = "";
    }

    if ( $("#server option:selected").val() != this.marker ) {
        server = $("#server option:selected").val().trim();
    } else {
        server = "";
    }

    if ( $("#query option:selected").val() != this.marker ) {
        query = $("#query option:selected").val().trim();
    } else {
        query = "";
    }

    if ( $("#type option:selected").val() != this.marker ) {
        type = $("#type option:selected").val().trim();
    } else {
        type = "";
    }

    if ( source != "" && server != "" && query != "" && type != "" ) {
        $.ajax({
            url: "/api/_createview/add/amp-dns/" + currentview + "/" + source +
                "/" + server + "/" + query + "/IN/" + type + "/4096",
            success: function(data) {
                /* hide modal window */
                $("#modal-foo").modal('hide');
                /* current view is what changeView() uses for the new graph */
                currentview = data;
                /* fetch new data */
                graphPage.changeView(data);
            }
        });
    }
}

/* XXX update to take a group id */
AmpDnsModal.prototype.removeSeries = function(source, server,
        query, aggregation) {

    if ( source != "" && server != "" && query != "" && type != "" ) {
        $.ajax({
            url: "/api/_createview/del/amp-dns/" + currentview + "/" + source +
                "/" + server + "/" + query + "/IN/" + type + "/4096",
            success: function(data) {
                /* current view is what changeView() uses for the new graph */
                currentview = data;
                /* fetch new data */
                graphPage.changeView(data);
            }
        });
    }
}
