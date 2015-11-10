
function CeiloCpuModal() {
    Modal.call(this);
}

CeiloCpuModal.prototype = new Modal();
CeiloCpuModal.prototype.constructor = CeiloCpuModal;

CeiloCpuModal.prototype.collection = "ceilo-cpu/instance";
CeiloCpuModal.prototype.selectables = [
    {name: 'res_name', label:'VM Name', type:"dropdown"},
    {name: 'guid', label:'VM GUID', type:"dropdown"}
];

CeiloCpuModal.prototype.update = function(name) {
    switch (name) {
        case 'res_name': this.updateModalDialog(name); break;
        case 'guid': this.updateSubmit(); break;
        default: this.updateModalDialog(name); break;
    };
}

CeiloCpuModal.prototype.submit = function() {
    var type = "instance";
    var name = this.getDropdownValue('res_name');
    var guid = this.getDropdownValue('guid');

    if (name != "" && guid != "") {
        $.ajax({
            url: "/api/_createview/add/ceilo-cpu/" +
                currentView + "/" + type + "/" + name + "/" + guid + "/",
            success: this.finish
        });
    }
}


// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
