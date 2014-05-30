function MuninBytesModal(/*stream*/) {
    Modal.call(this);
}

MuninBytesModal.prototype = new Modal();
MuninBytesModal.prototype.constructor = MuninBytesModal;

MuninBytesModal.prototype.collection = "rrd-muninbytes";
MuninBytesModal.prototype.selectables = ["switch", "interfacelabel"];
MuninBytesModal.prototype.labels = ["switch", "interface"];

MuninBytesModal.prototype.update = function(name) {
    switch ( name ) {
        case "switch": this.updateInterface(); break;
        case "interfacelabel": this.updateSubmit(); break;
        default: this.updateDevice(); break;
    };
}

MuninBytesModal.prototype.updateDevice = function() {
    var modal = this;
    $.ajax({
        url: "/api/_destinations/" + this.collection + "/",
        success: function(data) {
            modal.updateAll(data);
        }
    });
}

/* we've just changed the device, disable submission and update interfaces */
MuninBytesModal.prototype.updateInterface = function() {
    var modal = this;
    var device = this.getDropdownValue("switch");

    if ( device != "" ) {
        /* Populate the targets dropdown */
        $.ajax({
            url: "/api/_destinations/" + this.collection + "/" + device + "/",
            success: function(data) {
                modal.updateAll(data);
            }
        });
    }
}

MuninBytesModal.prototype.submit = function() {
    /* get new view id */
    var device = this.getDropdownValue("switch");
    var iface = this.getDropdownValue("interfacelabel");
    var direction = this.getRadioValue("direction");

    if ( device != "" && iface != "" && direction != "" ) {
        $.ajax({
            url: "/api/_createview/add/" + this.collection + "/" +
                currentView + "/" + device + "/" + iface + "/" +
                direction + "/",
            success: this.finish
        });
    }
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
