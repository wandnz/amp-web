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
    if ($("#source option:selected").text() != "--SELECT--") {
        source = $("#source option:selected").text().trim();
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
    if ($("#source option:selected").text() != "--SELECT--") {
        source = $("#source option:selected").text().trim();
    } else {
        source = "";
    }

    if ($("#destination option:selected").text() != "--SELECT--") {
        destination = $("#destination option:selected").text().trim();
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

/*
AmpIcmpModal.prototype.populateDropdown = function (node, data, descr) {
    $(node).empty();
    $(node).prop("disabled", false);
    $(node).append(
            "<option value=\"--SELECT--\">Select " + descr + "...</option>");
    $.each(data, function(index, value){
        $("<option value=\"" + value + "\">" + value +
            "</option>").appendTo(node);
    });
}
*/

AmpIcmpModal.submitModal = function() {
    /* get new view id */
    var source, destination, packet_size, aggregation;
    if ($("#source option:selected").text() != "--SELECT--") {
        source = $("#source option:selected").text().trim();
    } else {
        source = "";
    }

    if ($("#destination option:selected").text() != "--SELECT--") {
        destination = $("#destination option:selected").text().trim();
    } else {
        destination = "";
    }

    if ($("#packet_size option:selected").text() != "--SELECT--") {
        packet_size = $("#packet_size option:selected").text().trim();
    } else {
        packet_size = "";
    }

    aggregation = $("[name=aggregation]").val();

    if ( source != "" && destination != "" && packet_size != "" ) {
        $.ajax({
            url: "/api/_createview/amp-icmp/" + currentview + "/" + source +
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
