function SmokepingModal(/*stream*/) {
    Modal.call(this);
}

SmokepingModal.prototype = new AmpIcmpModal();
SmokepingModal.prototype.constructor = SmokepingModal;

SmokepingModal.prototype.collection = "rrd-smokeping";
SmokepingModal.prototype.selectables = ["source", "destination"];

SmokepingModal.prototype.update = function(name) {
    switch ( name ) {
        case "source": this.updateDestination(); break;
        case "destination": this.updateSubmit(); break;
        default: this.updateSource(); break;
    };
}


SmokepingModal.prototype.submit = function() {
    /* get new view id */
    var source, destination;
    var source = this.getDropdownValue("source");
    var destination = this.getDropdownValue("destination");

    if ( source != "" && destination != "" ) {
        $.ajax({
            url: "/api/_createview/add/" + this.collection + "/" +
                currentview + "/" + source + "/" + destination + "/",
            success: this.finish,
        });
    }
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
