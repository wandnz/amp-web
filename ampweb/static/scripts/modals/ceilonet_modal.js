
function CeiloNetModal() {
    Modal.call(this);
}

CeiloNetModal.prototype = new Modal();
CeiloNetModal.prototype.constructor = CeiloNetModal;

CeiloNetModal.prototype.collection = "ceilo-net/instance";
CeiloNetModal.prototype.selectables = [
    {name: 'res_name', label:'VM Name', type:"dropdown"},
    {name: 'mac', label:'MAC Address', type:"dropdown"},
    {name:"direction", label:"Direction", type:"fixedradio"},
];

CeiloNetModal.prototype.update = function(name) {
    switch (name) {
        case 'res_name': this.updateModalDialog(name); break;
        case 'mac': this.updateSubmit(); break;
        case 'direction': this.updateSubmit(); break;
        default: this.updateModalDialog(name); break;
    };
}


CeiloNetModal.prototype.submit = function() {
    var type = "instance";
    var name = this.getDropdownValue('res_name');
    var mac = this.getDropdownValue('mac');
    var dir = this.getRadioValue('direction');

    if (name != "" && mac != "" && dir != "") {
        $.ajax({
            url: API_URL + "/_createview/add/ceilo-net/" +
                currentView + "/" + type + "/" + name + "/" + mac + "/"
                + dir + "/",
            success: this.finish
        });
    }
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
