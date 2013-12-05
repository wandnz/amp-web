function MuninBytesModal(/*stream*/) {
    Modal.call(this);
}

MuninBytesModal.prototype = new Modal();
MuninBytesModal.prototype.constructor = MuninBytesModal;

MuninBytesModal.prototype.collection = "rrd-muninbytes";
MuninBytesModal.prototype.selectables = ["device", "iface", "direction"];

MuninBytesModal.prototype.update = function(name) {
    switch ( name ) {
        case "device": this.updateInterface(); break;
        case "iface": this.updateDirection(); break;
        case "direction": this.updateSubmit(); break;
        default: this.updateDevice(); break;
    };
}

MuninBytesModal.prototype.updateDevice = function() {
    var modal = this;
    $.ajax({
        url: "/api/_destinations/" + this.collection + "/",
        success: function(data) {
            modal.populateDropdown("device", data, "device");
            modal.updateSubmit();
        }
    });
}

/* we've just changed the device, disable submission and update interfaces */
MuninBytesModal.prototype.updateInterface = function() {
    var device;
    var modal = this;

    if ( $("#device option:selected").val() != this.marker ) {
        device = $("#device option:selected").val().trim();
    } else {
        device = "";
    }
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

/* we've just changed the interface, disable submission and update directions */
MuninBytesModal.prototype.updateDirection = function () {
    var device, iface;
    var modal = this;

    if ( $("#device option:selected").val() != this.marker ) {
        device = $("#device option:selected").val().trim();
    } else {
        device = "";
    }

    if ( $("#iface option:selected").val() != this.marker ) {
        iface = $("#iface option:selected").val().trim();
    } else {
        iface = "";
    }

    if ( device != "" && iface != "" ) {
        /* Populate the targets dropdown */
        $.ajax({
            url: "/api/_destinations/" + this.collection + "/" + device +
                "/" + iface + "/",
            success: function(data) {
                modal.populateDropdown("direction", data, "direction");
                modal.updateSubmit();
            }
        });
    }
}


MuninBytesModal.prototype.submit = function() {
    /* get new view id */
    var device, iface, direction;

    if ( $("#device option:selected").val() != this.marker ) {
        device = $("#device option:selected").val().trim();
    } else {
        device = "";
    }

    if ( $("#iface option:selected").val() != this.marker ) {
        iface = $("#iface option:selected").val().trim();
    } else {
        iface = "";
    }

    if ( $("#direction option:selected").val() != this.marker ) {
        direction = $("#direction option:selected").val().trim();
    } else {
        direction = "";
    }

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
