/* TODO reset any selectors below the one that has been changed? Can we
 * keep the existing value if it is still valid and only reset if the value
 * is no longer valid?
 */

function AmpIcmpModal(/*stream*/) {
    Modal.call(this);
}

AmpIcmpModal.prototype = new Modal();
AmpIcmpModal.prototype.constructor = AmpIcmpModal;

/* we've just changed the source, disable submission and update destinations */
AmpIcmpModal.prototype.updateDestination = function() {
    var source;
    var modal = this;

    if ( $("#source option:selected").val() != "--SELECT--" ) {
        source = $("#source option:selected").val().trim();
    } else {
        source = "";
    }
    if ( source != "" ) {
        /* Populate the targets dropdown */
        $.ajax({
            url: "/api/_destinations/amp-icmp/" + source + "/",
            success: function(data) {
                modal.populateDropdown("#destination", data, "destination");
                modal.updateSubmit();
            }
        });
    }
}

/* we've just changed the destination, disable submission and update sizes */
AmpIcmpModal.prototype.updatePacketSize = function () {
    var source, destination;
    var modal = this;

    if ( $("#source option:selected").val() != "--SELECT--" ) {
        source = $("#source option:selected").val().trim();
    } else {
        source = "";
    }

    if ( $("#destination option:selected").val() != "--SELECT--" ) {
        destination = $("#destination option:selected").val().trim();
    } else {
        destination = "";
    }

    if ( source != "" && destination != "" ) {
        /* Populate the targets dropdown */
        $.ajax({
            url: "/api/_destinations/amp-icmp/"+source+"/"+destination+"/",
            success: function(data) {
                modal.populateDropdown("#packet_size", data, "packet size");
                modal.updateSubmit();
            }
        });
    }
}


AmpIcmpModal.prototype.updateSubmit = function() {
    var source = $("#source option:selected").val();
    var destination = $("#destination option:selected").val();
    var packet_size = $("#packet_size option:selected").val();

    /* set the enabled/disabled state of the submit button */
    if ( source != undefined && source != "--SELECT--" &&
            destination != undefined && destination != "--SELECT--" &&
            packet_size != undefined && packet_size != "--SELECT--" ) {
        /* everything is set properly, enable the submit button */
        $("#submit").prop("disabled", false);
    } else {
        /* something isn't set, disable the submit button */
        $("#submit").prop("disabled", true);
    }
}


AmpIcmpModal.prototype.submit = function() {
    /* get new view id */
    var source, destination, packet_size, aggregation;

    if ( $("#source option:selected").val() != "--SELECT--" ) {
        source = $("#source option:selected").val().trim();
    } else {
        source = "";
    }

    if ( $("#destination option:selected").val() != "--SELECT--" ) {
        destination = $("#destination option:selected").val().trim();
    } else {
        destination = "";
    }

    if ( $("#packet_size option:selected").val() != "--SELECT--" ) {
        packet_size = $("#packet_size option:selected").val().trim();
    } else {
        packet_size = "";
    }

    aggregation = $("[name=aggregation]:checked").val();

    if ( source != "" && destination != "" && packet_size != "" ) {
        $.ajax({
            url: "/api/_createview/add/amp-icmp/" + currentview + "/" + source +
                "/" + destination + "/" + packet_size + "/" + aggregation,
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
AmpIcmpModal.prototype.removeSeries = function(source, destination,
        packet_size, aggregation) {

    if ( source != "" && destination != "" && packet_size != "" &&
            aggregation != "" ) {
        $.ajax({
            url: "/api/_createview/del/amp-icmp/" + currentview + "/" + source +
                "/" + destination + "/" + packet_size + "/" + aggregation,
            success: function(data) {
                /* current view is what changeView() uses for the new graph */
                currentview = data;
                /* fetch new data */
                graphPage.changeView(data);
            }
        });
    }
}
