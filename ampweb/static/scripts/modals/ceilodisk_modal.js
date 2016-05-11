
function CeiloDiskModal() {
    Modal.call(this);
}

CeiloDiskModal.prototype = new Modal();
CeiloDiskModal.prototype.constructor = CeiloDiskModal;

CeiloDiskModal.prototype.collection = "ceilo-disk/instance";
CeiloDiskModal.prototype.selectables = [
    {name: 'res_name', label:'VM Name', type:"dropdown"},
    {name: 'guid', label:'VM GUID', type:"dropdown"},
    {name:"readwrite", label:"Operation", type:"fixedradio"},
];

CeiloDiskModal.prototype.update = function(name) {
    switch (name) {
        case 'res_name': this.updateModalDialog(name); break;
        case 'guid': this.updateSubmit(); break;
        case 'readwrite': this.updateSubmit(); break;
        default: this.updateModalDialog(name); break;
    };
}

CeiloDiskModal.prototype.populateDropdown = function(name, data, descr) {
    var node = "#" + name;

    Modal.prototype.populateDropdown.call(CeiloDiskModal, name, data, descr)

    if (data.length <= 1 && name == "guid") {
        $('#guiddiv').addClass("hide");
    } else if (name == "guid" && data.length > 1) {
        $('#guiddiv').removeClass("hide");
    }
}



CeiloDiskModal.prototype.submit = function() {
    var type = "instance";
    var name = this.getDropdownValue('res_name');
    var guid = this.getDropdownValue('guid');
    var rw = this.getRadioValue('readwrite');

    if (name != "" && guid != "" && rw != "") {
        $.ajax({
            url: API_URL + "/_createview/add/ceilo-disk/" +
                currentView + "/" + type + "/" + name + "/" + guid + "/"
                + rw + "/",
            success: this.finish
        });
    }
}


// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
