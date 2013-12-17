function MuninBytesModal(/*stream*/) {
    Modal.call(this);
}

MuninBytesModal.prototype = new Modal();
MuninBytesModal.prototype.constructor = MuninBytesModal;

MuninBytesModal.prototype.collection = "rrd-muninbytes";
MuninBytesModal.prototype.selectables = ["device", "iface"];

MuninBytesModal.prototype.update = function(name) {
    switch ( name ) {
        case "device": this.updateInterface(); break;
        case "iface": this.updateSubmit(); break;
        default: this.updateDevice(); break;
    };
}

MuninBytesModal.prototype.updateDevice = function() {
    var modal = this;
    $.ajax({
        url: "/api/_destinations/" + this.collection + "/",
        success: function(data) {
            modal.populateDropdown("device", data, "switch");
            modal.updateSubmit();
        }
    });
}

/* we've just changed the device, disable submission and update interfaces */
MuninBytesModal.prototype.updateInterface = function() {
    var modal = this;
    var device = this.getDropdownValue("device");

    if ( device != "" ) {
        /* Populate the targets dropdown */
        $.ajax({
            url: "/api/_destinations/" + this.collection + "/" + device + "/",
            success: function(data) {
                modal.populateDropdown("iface", data, "interface");
                modal.updateSubmit();
            }
        });
    }
}



MuninBytesModal.prototype.submit = function() {
    /* get new view id */
    var device = this.getDropdownValue("device");
    var iface = this.getDropdownValue("iface");
    var direction = this.getRadioValue("direction");

    if ( device != "" && iface != "" && direction != "" ) {
        $.ajax({
            url: "/api/_createview/add/" + this.collection + "/" +
                currentview + "/" + device + "/" + iface + "/" +
                direction + "/",
            success: this.finish,
        });
    }
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
