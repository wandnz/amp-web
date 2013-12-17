function LPIPacketsModal(/*stream*/) {
    Modal.call(this);
}

LPIPacketsModal.prototype = new LPIBaseModal();
LPIPacketsModal.prototype.constructor = LPIPacketsModal;
LPIPacketsModal.prototype.collection = "lpi-packets";

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
