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

    { name: "source", label: "source", type: "dropdown" },
    { name: "destination", label: "destination", type: "dropdown" },
    { name: "packet_size", label: "packet size", type: "dropdown" },
    { name: "family", label: "family", type: "radio" },
    { name: "address", label: "address", type: "dropdown" }

]

AmpTracerouteRainbowModal.prototype.update = function(name) {
    switch ( name ) {
        case "source": this.updateModalDialog(name); break;
        case "destination": this.updateModalDialog(name); break;
        case "packet_size": this.updateModalDialog(name); break;
        case "family": this.updateModalDialog(name); break;
        case "address": this.updateSubmit(); break;
        default: this.updateModalDialog(name); break;
    };
}

AmpTracerouteRainbowModal.prototype.updateAll = function(data) {
    var modal = this;
    $.each(modal.selectables, function(index, sel) {
        if (!data.hasOwnProperty(sel.name)) {
            return;
        }

        if (sel.name == "family") {
            modal.enableFamilyRadio(data[sel.name]); 
        } else {
            modal.populateDropdown(sel.name, data[sel.name], sel.label);
        }

    });
    modal.updateSubmit();
}

AmpTracerouteRainbowModal.prototype.clearSelection = function(option) {

    if (option != "family")
        return;

    this.disableRadioButton("#family-ipv4");
    this.disableRadioButton("#family-ipv6");

}

AmpTracerouteRainbowModal.prototype.enableFamilyRadio = function(data) {
    var node = "#family";
    var v4node = "#family-ipv4";
    var v6node = "#family-ipv6";

    var current = this.getRadioValue("family");

    /* Disable everything so we can start afresh */
    this.disableRadioButton(v4node);
    this.disableRadioButton(v6node);

    if ($.inArray(current, data) == -1)
        current = undefined;

    if ($.inArray("ipv4", data) != -1) {
        if (current == "ipv4") {
            this.enableRadioButton(v4node, true);
            $("[name=family]").val(["ipv4"]);
            current = "ipv4";
        } else {
            this.enableRadioButton(v4node, false);
        }
    }

    if ($.inArray("ipv6", data) != -1) {
        if (current == "ipv6") {
            this.enableRadioButton(v6node, true);
            $("[name=family]").val(["ipv6"]);
            current = "ipv6";
        } else {
            this.enableRadioButton(v6node, false);
        }
    }

    /* clear all the selections below the one we've just updated */
    this.resetSelectables(name);

}

AmpTracerouteRainbowModal.prototype.submit = function() {
    /* get new view id */
    var source = this.getDropdownValue("source");
    var destination = this.getDropdownValue("destination");
    var packet_size = this.getDropdownValue("packet_size");
    var address = this.getDropdownValue("address");

    if ( source != "" && destination != "" && packet_size != "" &&
            address != "") {
        $.ajax({
            /* Use view 0 to ensure we replace the existing group
             * rather than adding to it. Having more than one
             * group is not sensible for the rainbow graph */
            url: "/api/_createview/add/" + this.collection + "/" +
                "0" + "/" + source + "/" + destination + "/" +
                packet_size + "/ADDRESS/" + address,
            success: this.finish
        });
    }
}


// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
