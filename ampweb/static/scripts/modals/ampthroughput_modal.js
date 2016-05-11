function AmpThroughputModal ( ) {
    Modal.call(this);
}

AmpThroughputModal.prototype = new Modal();
AmpThroughputModal.prototype.constructor = AmpThroughputModal;
AmpThroughputModal.prototype.collection = "amp-throughput";

AmpThroughputModal.prototype.selectables = [
    { name: "source", label: "source", type:"dropdown" },
    { name: "destination", label: "target", type:"dropdown" },
    { name: "duration", label: "test duration", type:"dropdown" },
    { name: "writesize", label: "write size", type:"dropdown" },
    { name: "tcpreused", label: "reuse TCP", type:"boolradio" },
    { name: "direction", label: "direction", type:"fixedradio"}, 
    { name: "family", label: "family", type:"fixedradio"}, 
]

AmpThroughputModal.prototype.update = function(name) {
    switch(name) {
        case 'source':
        case 'destination':
        case 'duration':
        case 'writesize':
        case 'tcpreused':
            this.updateModalDialog(name); break;
        case 'direction':
        case 'family':
            this.updateSubmit(); break;
        default:
            this.updateModalDialog(name); break;
    };
}

AmpThroughputModal.prototype.submit = function() {
    var source = this.getDropdownValue("source");
    var target = this.getDropdownValue("destination");
    var duration = this.getDropdownValue("duration");
    var write = this.getDropdownValue("writesize");
    var reused = this.getRadioValue("tcpreused");
    var direction = this.getRadioValue("direction");
    var family = this.getRadioValue("family");

    var reusedflag = "";
    if (reused == "true")
        reusedflag = "T";
    if (reused == "false")
        reusedflag = "F";

    if ( source != "" && target != "" && duration != "" && write != ""
            && reusedflag != "" && direction != "" && family != "" ) {
        $.ajax({
            url: API_URL + "/_createview/add/amp-throughput/" + currentView +
                    "/" + source + "/" + target + "/" + duration + "/" +
                    write + "/" + reusedflag + "/" + direction + "/" +
                    family,
            success: this.finish
        });
    }
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
