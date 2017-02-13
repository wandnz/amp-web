function SmokepingModal(/*stream*/) {
    Modal.call(this);
}

SmokepingModal.prototype = new Modal();
SmokepingModal.prototype.constructor = SmokepingModal;
SmokepingModal.prototype.collection = "rrd-smokeping";

SmokepingModal.prototype.selectables = [
    {name:"source", label:"source", type:"dropdown"},
    {name:"host", label:"target", type:"dropdown"},
    {name:"aggregation", label:"address family", type:"fixedradio"}
];

SmokepingModal.prototype.update = function(name) {
    switch ( name ) {
        case "source": this.updateModalDialog(name); break;
        case "host": this.updateModalDialog(name); break;
        case "aggregation": this.updateFixedRadio(); break
        default: this.updateModalDialog(name); break;
    };
}

SmokepingModal.prototype.submit = function() {
    /* get new view id */
    var source, destination, family;
    var source = this.getDropdownValue("source");
    var destination = this.getDropdownValue("host");
    var family = this.getRadioValue('aggregation');

    this.submitAjax([source, destination, family], this.collection);
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
