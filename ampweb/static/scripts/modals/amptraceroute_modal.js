function AmpTracerouteModal(/*stream*/) {
    Modal.call(this);
}

AmpTracerouteModal.prototype = new AmpIcmpModal();
AmpTracerouteModal.prototype.constructor = AmpTracerouteModal;

AmpTracerouteModal.prototype.collection = "amp-traceroute";
AmpTracerouteModal.prototype.selectables = [
        "source", "destination", "packet_size"
];

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
