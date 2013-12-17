function LPIUsersModal(/*stream*/) {
    Modal.call(this);
}

LPIUsersModal.prototype = new Modal();
LPIUsersModal.prototype.constructor = LPIUsersModal;

LPIUsersModal.prototype.collection = "lpi-users";
LPIUsersModal.prototype.selectables = ["source", "protocol"];

LPIUsersModal.prototype.update = function(name) {
    switch ( name ) {
        case "source": this.updateProtocol(); break;
        case "protocol": this.updateSubmit(); break;
        default: this.updateSource(); break;
    };
}

LPIUsersModal.prototype.updateSource = function() {
    var modal = this;
    $.ajax({
        url: "/api/_destinations/" + this.collection + "/",
        success: function(data) {
            modal.populateDropdown("source", data, "source");
            modal.updateSubmit();
        }
    });
}

/* we've just changed the source, disable submission and update protocols */
LPIUsersModal.prototype.updateProtocol = function() {
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



LPIUsersModal.prototype.submit = function() {
    /* get new view id */
    var source, protocol, metric;

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

    metric = $("[name=metric]:checked").val();

    if ( source != "" && protocol != "" && metric != "" ) {
        $.ajax({
            url: "/api/_createview/add/" + this.collection + "/" +
                currentview + "/" + source + "/" + protocol + "/" +
                metric + "/",
            success: this.finish,
        });
    }
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
