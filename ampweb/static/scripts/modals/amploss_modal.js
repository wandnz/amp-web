function AmpLossModal(selected) {

    if (selected == "amp-loss")
        selected = "amp-icmp";

    AmpLatencyModal.call(this, selected);

}

AmpLossModal.prototype = inherit(AmpLatencyModal.prototype);
AmpLossModal.prototype.constructor = AmpLossModal;

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
