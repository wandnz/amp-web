function AmpIcmpModal(/*stream*/) {
    Modal.call(this);
}

AmpIcmpModal.prototype = new Modal();
AmpIcmpModal.prototype.constructor = AmpIcmpModal;

AmpIcmpModal.prototype.collection = "amp-icmp";
AmpIcmpModal.prototype.selectables = ["source", "destination", "packet_size"];

AmpIcmpModal.prototype.update = function(name) {
    switch ( name ) {
        case "source": this.updateDestination(); break;
        case "destination": this.updatePacketSize(); break;
        case "packet_size": this.updateSubmit(); break;
        default: this.updateSource(); break;
    };
}

AmpIcmpModal.prototype.updateSource = function() {
    var modal = this;
    $.ajax({
        url: "/api/_destinations/" + this.collection + "/",
        success: function(data) {
            modal.populateDropdown("source", data, "source");
            modal.updateSubmit();
        }
    });
}

/* we've just changed the source, disable submission and update destinations */
AmpIcmpModal.prototype.updateDestination = function() {
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
            url: "/api/_destinations/" + this.collection + "/" + source + "/",
            success: function(data) {
                modal.populateDropdown("destination", data, "destination");
                modal.updateSubmit();
            }
        });
    }
}

/* we've just changed the destination, disable submission and update sizes */
AmpIcmpModal.prototype.updatePacketSize = function () {
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

    if ( source != "" && destination != "" ) {
        /* Populate the targets dropdown */
        $.ajax({
            url: "/api/_destinations/" + this.collection + "/" + source +
                "/" + destination + "/",
            success: function(data) {
                modal.populateDropdown("packet_size", data, "packet size");
                modal.updateSubmit();
            }
        });
    }
}


AmpIcmpModal.prototype.submit = function() {
    /* get new view id */
    var source, destination, packet_size, aggregation;

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

    aggregation = $("[name=aggregation]:checked").val();

    if ( source != "" && destination != "" && packet_size != "" ) {
        $.ajax({
            url: "/api/_createview/add/" + this.collection + "/" +
                currentview + "/" + source + "/" + destination + "/" +
                packet_size + "/" + aggregation,
            success: this.finish,
        });
    }
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
