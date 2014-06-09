function SmokepingModal(/*stream*/) {
    Modal.call(this);
}

SmokepingModal.prototype = new Modal();
SmokepingModal.prototype.constructor = SmokepingModal;

SmokepingModal.prototype.collection = "rrd-smokeping";
SmokepingModal.prototype.selectables = [
    {name:"source", label:"source", type:"dropdown"},
    {name:"host", label:"target", type:"dropdown"}
];

SmokepingModal.prototype.update = function(name) {
    switch ( name ) {
        case "source": this.updateModalDialog(name); break;
        case "host": this.updateSubmit(); break;
        default: this.updateModalDialog(name); break;
    };
}

SmokepingModal.prototype.submit = function() {
    /* get new view id */
    var source, destination;
    var source = this.getDropdownValue("source");
    var destination = this.getDropdownValue("host");

    if ( source != "" && destination != "" ) {
        $.ajax({
            url: "/api/_createview/add/" + this.collection + "/" +
                currentView + "/" + source + "/" + destination + "/",
            success: this.finish
        });
    }
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
