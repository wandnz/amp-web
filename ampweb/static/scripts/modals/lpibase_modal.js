function LPIBaseModal(/*stream*/) {
    Modal.call(this);
}

LPIBaseModal.prototype = new Modal();
LPIBaseModal.prototype.constructor = LPIBaseModal;
LPIBaseModal.prototype.collection = null;
LPIBaseModal.prototype.selectables = ["source", "protocol", "user"];
LPIBaseModal.prototype.labels = ["source", "protocol", "user"];

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
            modal.updateAll(data);
        }
    });
}

/* we've just changed the source, disable submission and update interfaces */
LPIBaseModal.prototype.updateProtocol = function() {
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


LPIBaseModal.prototype.updateUser = function() {
    var modal = this;
    var source = this.getDropdownValue("source");
    var protocol = this.getDropdownValue("protocol");

    if ( source != "" && protocol != "" ) {
        /* Populate the targets dropdown */
        $.ajax({
            url: "/api/_destinations/" + this.collection + "/" + source + "/" +
                    protocol + "/",
            success: function(data) {
                modal.updateAll(data);
            }
        });
    }
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
