function LPIFlowsModal(/*stream*/) {
    Modal.call(this);
}

LPIFlowsModal.prototype = new LPIBaseModal();
LPIFlowsModal.prototype.constructor = LPIFlowsModal;
LPIFlowsModal.prototype.collection = "lpi-flows";

LPIFlowsModal.prototype.submit = function() {
    /* get new view id */
    var source = this.getDropdownValue("source");
    var protocol = this.getDropdownValue("protocol");
    var user = this.getDropdownValue("user");
    var direction = this.getRadioValue("direction");
    var metric = this.getRadioValue("metric");

    if ( source != "" && protocol != "" && user != "" && direction != "" &&
            metric != "" ) {
        $.ajax({
            url: "/api/_createview/add/" + this.collection + "/" +
                currentView + "/" + source + "/" + protocol + "/" + user +
                "/" + metric + "/" + direction + "/",
            success: this.finish
        });
    }
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
