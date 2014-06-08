function LPIUsersModal(/*stream*/) {
    Modal.call(this);
}

LPIUsersModal.prototype = new Modal();
LPIUsersModal.prototype.constructor = LPIUsersModal;

LPIUsersModal.prototype.collection = "lpi-users";
LPIUsersModal.prototype.selectables = [
    {name:"source", label:"source", type:"dropdown"},
    {name:"protocol", label:"protocol", type:"dropdown"}
];

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
            modal.updateAll(data);
        }
    });
}

/* we've just changed the source, disable submission and update protocols */
LPIUsersModal.prototype.updateProtocol = function() {
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



LPIUsersModal.prototype.submit = function() {
    /* get new view id */
    var source = this.getDropdownValue("source");
    var protocol = this.getDropdownValue("protocol");
    var metric = this.getRadioValue("metric");

    if ( source != "" && protocol != "" && metric != "" ) {
        $.ajax({
            url: "/api/_createview/add/" + this.collection + "/" +
                currentView + "/" + source + "/" + protocol + "/" +
                metric + "/",
            success: this.finish
        });
    }
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
