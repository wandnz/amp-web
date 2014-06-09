function AmpIcmpModal(/*stream*/) {
    Modal.call(this);
}

AmpIcmpModal.prototype = new Modal();
AmpIcmpModal.prototype.constructor = AmpIcmpModal;

AmpIcmpModal.prototype.collection = "amp-icmp";
AmpIcmpModal.prototype.selectables = [
    {name: "source", label:"source", type:"dropdown"},
    {name: "destination", label:"destination", type:"dropdown"},
    {name: "packet_size", label:"packet size", type:"dropdown"}
];

AmpIcmpModal.prototype.update = function(name) {
    $('label[title]').tooltip({
        container: '#modal-foo .modal-dialog'
    });

    switch ( name ) {
        case "source": this.updateModalDialog(name); break;
        case "destination": this.updateModalDialog(name); break;
        case "packet_size": this.updateSubmit(); break;
        default: this.updateModalDialog(name); break;
    };
}

AmpIcmpModal.prototype.submit = function() {
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

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
