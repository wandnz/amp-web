
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

CeiloCpuModal.prototype.populateDropdown = function(name, data, descr) {
    var node = "#" + name;

    Modal.prototype.populateDropdown.call(CeiloCpuModal, name, data, descr)

    if (data.length <= 1 && name == "guid") {
        $('#guiddiv').addClass("hide");
    } else if (name == "guid" && data.length > 1) {
        $('#guiddiv').removeClass("hide");
    }

}


CeiloCpuModal.prototype.submit = function() {
    var type = "instance";
    var name = this.getDropdownValue('res_name');
    var guid = this.getDropdownValue('guid');

    if (name != "" && guid != "") {
        $.ajax({
            url: API_URL + "/_createview/add/ceilo-cpu/" +
                currentView + "/" + type + "/" + name + "/" + guid + "/",
            success: this.finish
        });
    }
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
