/*
 * A normal traceroute graph behaves exactly like the icmp graph, with the
 * same options, same aggregation etc.
 */

function AmpTracerouteModal() {
    Modal.call(this);
}

AmpTracerouteModal.prototype = new Modal();
AmpTracerouteModal.prototype.constructor = AmpTracerouteModal;
AmpTracerouteModal.prototype.collection = "amp-astraceroute";

AmpTracerouteModal.prototype.selectables = [
    {name: "source", label:"source", type:"dropdown"},
    {name: "destination", label:"destination", type:"dropdown"},
    {name: "packet_size", label:"packet size", type:"dropdown"},
    {name: "aggregation", label:"aggregation", type:"fixedradio"},
];

AmpTracerouteModal.prototype.update = function(name) {
    $('label[title]').tooltip({
        container: '#modal-foo .modal-dialog'
    });

    switch ( name ) {
        case "source": this.updateModalDialog(name); break;
        case "destination": this.updateModalDialog(name); break;
        case "packet_size": this.updateSubmit(); break;
        case "aggregation": this.updateSubmit(); break;
        default: this.updateModalDialog(name); break;
    };
}

AmpTracerouteModal.prototype.submit = function() {
    /* get new view id */
    var source = this.getDropdownValue("source");
    var destination = this.getDropdownValue("destination");
    var packet_size = this.getDropdownValue("packet_size");
    var aggregation = this.getRadioValue("aggregation");

    if ( source != "" && destination != "" && packet_size != "" &&
            aggregation != "" ) {
        $.ajax({
            url: "/api/_createview/add/" + this.collection + "/" +
                currentView + "/" + source + "/" + destination + "/" +
                packet_size + "/" + aggregation,
            success: this.finish
        });
    }
}



/*
 * A rainbow traceroute graph only displays a single stream, so has different
 * options to the normal traceroute style.
 */
function AmpTracerouteRainbowModal() {
    AmpTracerouteModal.call(this);
}
AmpTracerouteRainbowModal.prototype = new AmpTracerouteModal();
AmpTracerouteRainbowModal.prototype.constructor = AmpTracerouteRainbowModal;
AmpTracerouteRainbowModal.prototype.collection = "amp-astraceroute";
AmpTracerouteRainbowModal.prototype.selectables = [

    { name: "source", label: "source", type: "dropdown" },
    { name: "destination", label: "destination", type: "dropdown" },
    { name: "packet_size", label: "packet size", type: "dropdown" },
    { name: "family", label: "family", type: "radio", 
            validvalues: ['ipv4', 'ipv6']},

]

AmpTracerouteRainbowModal.prototype.update = function(name) {
    switch ( name ) {
        case "source": this.updateModalDialog(name); break;
        case "destination": this.updateModalDialog(name); break;
        case "packet_size": this.updateModalDialog(name); break;
        case "family": this.updateSubmit(); break;
        default: this.updateModalDialog(name); break;
    };
}


AmpTracerouteRainbowModal.prototype.submit = function() {
    /* get new view id */
    var source = this.getDropdownValue("source");
    var destination = this.getDropdownValue("destination");
    var packet_size = this.getDropdownValue("packet_size");
    var family = this.getRadioValue("family");

    if ( source != "" && destination != "" && packet_size != "") {
        $.ajax({
            /* Use view 0 to ensure we replace the existing group
             * rather than adding to it. Having more than one
             * group is not sensible for the rainbow graph */
            url: "/api/_createview/add/" + this.collection + "/" +
                "0" + "/" + source + "/" + destination + "/" +
                packet_size + "/" + family,
            success: this.finish
        });
    }
}


// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
