function MuninBytesModal(/*stream*/) {
    Modal.call(this);
}

MuninBytesModal.prototype = new Modal();
MuninBytesModal.prototype.constructor = MuninBytesModal;

MuninBytesModal.prototype.collection = "rrd-muninbytes";
MuninBytesModal.prototype.selectables = [
    {name:"switch", label:"switch", type:"dropdown"},
    {name:"interfacelabel", label:"interface", type:"dropdown"},
    {name:"direction", label:"direction", type:"fixedradio"}
];

MuninBytesModal.prototype.update = function(name) {
    switch ( name ) {
        case "switch": this.updateModalDialog(name); break;
        case "interfacelabel": this.updateSubmit(); break;
        case "direction": this.updateSubmit(); break;
        default: this.updateModalDialog(name); break;
    };
}

MuninBytesModal.prototype.submit = function() {
    /* get new view id */
    var device = this.getDropdownValue("switch");
    var iface = this.getDropdownValue("interfacelabel");
    var direction = this.getRadioValue("direction");

    if ( device != "" && iface != "" && direction != "" ) {
        $.ajax({
            url: API_URL + "/_createview/add/" + this.collection + "/" +
                currentView + "/" + device + "/" + iface + "/" +
                direction + "/",
            success: this.finish
        });
    }
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
