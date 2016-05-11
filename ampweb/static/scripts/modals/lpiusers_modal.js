function LPIUsersModal(/*stream*/) {
    Modal.call(this);
}

LPIUsersModal.prototype = new Modal();
LPIUsersModal.prototype.constructor = LPIUsersModal;

LPIUsersModal.prototype.collection = "lpi-users";
LPIUsersModal.prototype.selectables = [
    {name:"source", label:"source", type:"dropdown"},
    {name:"protocol", label:"protocol", type:"dropdown"},
    {name:"metric", label:"metric", type:"fixedradio"}
];

LPIUsersModal.prototype.update = function(name) {
    switch ( name ) {
        case "source": this.updateModalDialog(name); break;
        case "protocol": this.updateSubmit(); break;
        case "metric": this.updateSubmit(); break;
        default: this.updateModalDialog(name); break;
    };
}

LPIUsersModal.prototype.submit = function() {
    /* get new view id */
    var source = this.getDropdownValue("source");
    var protocol = this.getDropdownValue("protocol");
    var metric = this.getRadioValue("metric");

    if ( source != "" && protocol != "" && metric != "" ) {
        $.ajax({
            url: API_URL + "/_createview/add/" + this.collection + "/" +
                currentView + "/" + source + "/" + protocol + "/" +
                metric + "/",
            success: this.finish
        });
    }
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
