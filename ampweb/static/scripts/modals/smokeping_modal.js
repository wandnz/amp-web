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
        case "source": this.updateDestination(); break;
        case "host": this.updateSubmit(); break;
        default: this.updateSource(); break;
    };
}

SmokepingModal.prototype.updateSource = function() {
    var modal = this;
    $.ajax({
        url: "/api/_destinations/" + this.collection + "/",
        success: function(data) {
            modal.updateAll(data);
        }
    });
}

/* we've just changed the source, disable submission and update destinations */
SmokepingModal.prototype.updateDestination = function() {
    var modal = this;
    var source = this.getDropdownValue("source");

    if ( source != "" ) {
        /* Populate the targets dropdown */
        $.ajax({
            url: "/api/_destinations/" + this.collection + "/" + source + "/",
            success: function(data) {
                modal.updateAll(data);
            }
        });
    }
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
