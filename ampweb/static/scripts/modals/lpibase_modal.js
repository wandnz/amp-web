function LPIBaseModal(/*stream*/) {
    Modal.call(this);
}

LPIBaseModal.prototype = new Modal();
LPIBaseModal.prototype.constructor = LPIBaseModal;
LPIBaseModal.prototype.collection = null;
LPIBaseModal.prototype.selectables = [
    {name:"source", label:"source", type:"dropdown"},
    {name:"protocol", label:"protocol", type:"dropdown"},
    {name:"user", label:"user", type:"dropdown"}
];

LPIBaseModal.prototype.update = function(name) {
    switch ( name ) {
        case "source": this.updateModalDialog(name); break;
        case "protocol": this.updateModalDialog(name); break;
        case "user": this.updateSubmit(); break;
        default: this.updateModalDialog(name); break;
    };
}

LPIBaseModal.prototype.submit = function() {
    /* get new view id */
    var source = this.getDropdownValue("source");
    var protocol = this.getDropdownValue("protocol");
    var user = this.getDropdownValue("user");
    var direction = this.getRadioValue("direction");

    if ( source != "" && protocol != "" && user != "" && direction != "" ) {
        $.ajax({
            url: "/api/_createview/add/" + this.collection + "/" +
                currentView + "/" + source + "/" + protocol + "/" + user +
                "/" + direction + "/",
            success: this.finish
        });
    }
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
