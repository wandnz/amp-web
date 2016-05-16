function LPIFlowsModal(/*stream*/) {
    Modal.call(this);
}

LPIFlowsModal.prototype = new LPIBaseModal();
LPIFlowsModal.prototype.constructor = LPIFlowsModal;
LPIFlowsModal.prototype.collection = "lpi-flows";

LPIFlowsModal.prototype.selectables = [
    {name: "source", label:"source", type:"dropdown"},
    {name: "protocol", label:"protocol", type:"dropdown"},
    {name: "user", label:"user", type:"dropdown"},
    {name: "direction", label:"direction", type:"fixedradio"},
    {name: "metric", label:"metric", type:"fixedradio"},
];

LPIFlowsModal.prototype.submit = function() {
    /* get new view id */
    var source = this.getDropdownValue("source");
    var protocol = this.getDropdownValue("protocol");
    var user = this.getDropdownValue("user");
    var direction = this.getRadioValue("direction");
    var metric = this.getRadioValue("metric");

    this.submitAjax([source, protocol, user, direction, metric]);

}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
