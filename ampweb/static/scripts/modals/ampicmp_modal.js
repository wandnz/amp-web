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

AmpIcmpModal.updateDestination = function() {
    var source;
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

AmpIcmpModal.updatePacketSize = function () {
    var source, destination;
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
