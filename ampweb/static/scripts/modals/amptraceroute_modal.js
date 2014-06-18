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
    { name: "family", label: "family", type: "radio", 
            validvalues: ['ipv4', 'ipv6']},
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
