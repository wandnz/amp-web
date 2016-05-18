function AmpUdpstreamModal() {
    Modal.call(this);
}

AmpUdpstreamModal.prototype = new Modal();
AmpUdpstreamModal.prototype.constructor = AmpUdpstreamModal;
AmpUdpstreamModal.prototype.collection = "amp-udpstream";

AmpUdpstreamModal.prototype.selectables = [
    {name: "source", label:"source", type:"dropdown"},
    {name: "destination", label:"destination", type:"dropdown"},
    {name: "dscp", label:"dscp", type:"dropdown"},
    {name: "packet_size", label:"packet size", type:"dropdown"},
    {name: "packet_spacing", label:"packet spacing", type:"dropdown"},
    {name: "packet_count", label:"stream size", type:"dropdown"},
    {name: "direction", label:"direction", type:"fixedradio"},
    {name: "family", label:"family", type:"fixedradio"},
];

AmpUdpstreamModal.prototype.update = function(name) {

    switch(name) {
        case 'source':
        case 'destination':
        case 'dscp':
        case 'packet_size':
        case 'packet_spacing':
        case 'packet_count':
            this.updateModalDialog(name); break;
        case 'direction':
        case 'family':
            this.updateFixedRadio(name); break;
        default:
            this.updateModalDialog(name); break;
      }
}

AmpUdpstreamModal.prototype.submit = function() {

    /* Reset currentView so our new selection will overwrite the
     * view rather than adding to it.
     */
    currentView = 0;

    this.submitAjax([
            this.getDropdownValue("source"),
            this.getDropdownValue("destination"),
            this.getDropdownValue("dscp"),
            this.getDropdownValue("packet_size"),
            this.getDropdownValue("packet_spacing"),
            this.getDropdownValue("packet_count"),
            this.getRadioValue("direction"),
            this.getRadioValue("family")
    ], this.collection);
}


// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
