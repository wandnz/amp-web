/*
 * A normal traceroute graph behaves exactly like the icmp graph, with the
 * same options, same aggregation etc.
 */

function AmpTracerouteModal(/*stream*/) {
    Modal.call(this);
}

AmpTracerouteModal.prototype = new AmpIcmpModal();
AmpTracerouteModal.prototype.constructor = AmpTracerouteModal;

AmpTracerouteModal.prototype.collection = "amp-traceroute";
AmpTracerouteModal.prototype.selectables = [
        "source", "destination", "packet_size"
];



/*
 * A rainbow traceroute graph only displays a single stream, so has different
 * options to the normal traceroute style.
 */
function AmpTracerouteRainbowModal() {
    AmpTracerouteModal.call(this);
}
AmpTracerouteRainbowModal.prototype = new AmpTracerouteModal();
AmpTracerouteRainbowModal.prototype.constructor = AmpTracerouteRainbowModal;
AmpTracerouteRainbowModal.prototype.selectables = [
        "source", "destination", "packet_size", "address"
];

AmpTracerouteRainbowModal.prototype.update = function(name) {
    switch ( name ) {
        case "source": this.updateDestination(); break;
        case "destination": this.updatePacketSize(); break;
        case "packet_size": this.updateAddress(); break;
        case "address": this.updateSubmit(); break;
        default: this.updateSource(); break;
    };
}

AmpTracerouteRainbowModal.prototype.updateAddress = function () {
    var source, destination;
    var modal = this;

    if ( $("#source option:selected").val() != this.marker ) {
        source = $("#source option:selected").val().trim();
    } else {
        source = "";
    }

    if ( $("#destination option:selected").val() != this.marker ) {
        destination = $("#destination option:selected").val().trim();
    } else {
        destination = "";
    }

    if ( $("#packet_size option:selected").val() != this.marker ) {
        packet_size = $("#packet_size option:selected").val().trim();
    } else {
        packet_size = "";
    }

    if ( source != "" && destination != "" ) {
        /* Populate the targets dropdown */
        $.ajax({
            url: "/api/_destinations/" + this.collection + "/" + source +
                "/" + destination + "/" + packet_size,
            success: function(data) {
                modal.populateDropdown("address", data, "address");
                modal.updateSubmit();
            }
        });
    }
}

AmpTracerouteRainbowModal.prototype.submit = function() {
    /* get new view id */
    var source, destination, packet_size, address;

    if ( $("#source option:selected").val() != this.marker ) {
        source = $("#source option:selected").val().trim();
    } else {
        source = "";
    }

    if ( $("#destination option:selected").val() != this.marker ) {
        destination = $("#destination option:selected").val().trim();
    } else {
        destination = "";
    }

    if ( $("#packet_size option:selected").val() != this.marker ) {
        packet_size = $("#packet_size option:selected").val().trim();
    } else {
        packet_size = "";
    }

    if ( $("#address option:selected").val() != this.marker ) {
        address = $("#address option:selected").val().trim();
    } else {
        address = "";
    }

    if ( source != "" && destination != "" && packet_size != "" &&
            address != "") {
        $.ajax({
            url: "/api/_createview/add/" + this.collection + "/" +
                currentview + "/" + source + "/" + destination + "/" +
                packet_size + "/" + address,
            success: this.finish,
        });
    }
}


// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
