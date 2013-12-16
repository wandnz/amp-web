function LPIBaseModal(/*stream*/) {
    Modal.call(this);
}

LPIBaseModal.prototype = new Modal();
LPIBaseModal.prototype.constructor = LPIBaseModal;
LPIBaseModal.prototype.collection = null;
LPIBaseModal.prototype.selectables = ["source", "protocol", "user"];

LPIBaseModal.prototype.update = function(name) {
    switch ( name ) {
        case "source": this.updateProtocol(); break;
        case "protocol": this.updateUser(); break;
        case "user": this.updateSubmit(); break;
        default: this.updateSource(); break;
    };
}

LPIBaseModal.prototype.updateSource = function() {
    var modal = this;
    $.ajax({
        url: "/api/_destinations/" + this.collection + "/",
        success: function(data) {
            modal.populateDropdown("source", data, "source");
            modal.updateSubmit();
        }
    });
}

/* we've just changed the source, disable submission and update interfaces */
LPIBaseModal.prototype.updateProtocol = function() {
    var source;
    var modal = this;

    if ( $("#source option:selected").val() != this.marker ) {
        source = $("#source option:selected").val().trim();
    } else {
        source = "";
    }
    if ( source != "" ) {
        /* Populate the targets dropdown */
        $.ajax({
            url: "/api/_destinations/" + this.collection + "/" + source + "/",
            success: function(data) {
                modal.populateDropdown("protocol", data, "protocol");
                modal.updateSubmit();
            }
        });
    }
}


LPIBaseModal.prototype.updateUser = function() {
    var source, protocol;
    var modal = this;

    if ( $("#source option:selected").val() != this.marker ) {
        source = $("#source option:selected").val().trim();
    } else {
        source = "";
    }

    if ( $("#protocol option:selected").val() != this.marker ) {
        protocol = $("#protocol option:selected").val().trim();
    } else {
        protocol = "";
    }

    if ( source != "" && protocol != "" ) {
        /* Populate the targets dropdown */
        $.ajax({
            url: "/api/_destinations/" + this.collection + "/" + source + "/" +
                    protocol + "/",
            success: function(data) {
                modal.populateDropdown("user", data, "user");
                modal.updateSubmit();
            }
        });
    }
}



LPIBaseModal.prototype.submit = function() {
    /* get new view id */
    var source, protocol, user, direction;

    if ( $("#source option:selected").val() != this.marker ) {
        source = $("#source option:selected").val().trim();
    } else {
        source = "";
    }

    if ( $("#protocol option:selected").val() != this.marker ) {
        protocol = $("#protocol option:selected").val().trim();
    } else {
        protocol = "";
    }

    if ( $("#user option:selected").val() != this.marker ) {
        user = $("#user option:selected").val().trim();
    } else {
        user = "";
    }

    direction = $("[name=direction]:checked").val();

    if ( source != "" && protocol != "" && direction != "" ) {
        $.ajax({
            url: "/api/_createview/add/" + this.collection + "/" +
                currentview + "/" + source + "/" + protocol + "/" + user +
                "/" + direction + "/",
            success: this.finish,
        });
    }
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
