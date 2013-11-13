/* TODO reset any selectors below the one that has been changed? Can we
 * keep the existing value if it is still valid and only reset if the value
 * is no longer valid?
 */

function AmpIcmpModal(/*stream*/) {
    Modal.call(this);
/*
    this.source = "";
    this.dest = "";
    this.size = "";
    this.address = "";

    this.getSelected();
    this.sortDropdown("#drpSource", this.source);
    this.sortDropdown("#drpDest", this.dest);
    this.sortDropdown("#drpSize", this.size);
    this.sortDropdown("#drpAddr", this.address);
*/
}

//AmpIcmpModal.prototype = new Modal();
//AmpIcmpModal.prototype.constructor = AmpIcmpModal;

/* we've just changed the source, disable submission and update destinations */
AmpIcmpModal.updateDestination = function() {
    var source;

    this.updateSubmit();

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
                Modal.populateDropdown("#destination", data, "destination");
            }
        });
    }
}

/* we've just changed the destination, disable submission and update sizes */
AmpIcmpModal.updatePacketSize = function () {
    var source, destination;

    this.updateSubmit();

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
                Modal.populateDropdown("#packet_size", data, "packet size");
            }
        });
    }
}


AmpIcmpModal.updateSubmit = function() {
    /* set the enabled/disabled state of the submit button */
    if ( $("#source option:selected").val() != "--SELECT--" &&
            $("#destination option:selected").val() != "--SELECT--" &&
            $("#packet_size option:selected").val() != "--SELECT--" ) {
        /* everything is set properly, enable the submit button */
        $("#submit").prop("disabled", false);
    } else {
        /* something isn't set, disable the submit button */
        $("#submit").prop("disabled", true);
    }
}


AmpIcmpModal.submitModal = function() {
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

AmpIcmpModal.removeSeries = function(source, destination, packet_size,
        aggregation) {
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
