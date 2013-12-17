function LPIBytesModal(/*stream*/) {
    Modal.call(this);
}

LPIBytesModal.prototype = new LPIBaseModal();
LPIBytesModal.prototype.constructor = LPIBytesModal;
LPIBytesModal.prototype.collection = "lpi-bytes";

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
