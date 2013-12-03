function Modal() {
}

/* marker value for a selectable that hasn't had a real selection made yet */
Modal.prototype.marker = "--SELECT--";


/* populate a generic dropdown, with no option selected */
Modal.prototype.populateDropdown = function (node, data, descr) {
    $(node).empty();
    $(node).prop("disabled", false);
    $(node).append(
            "<option value=\"--SELECT--\">Select "+descr+"...</option>");
    $.each(data, function(index, value){
        $("<option value=\"" + value + "\">" + value +
            "</option>").appendTo(node);
    });
}


/* "abstract functions" that need to be implemented by child classes */
Modal.prototype.submit = function() {};
Modal.prototype.updateSubmit = function() {};


/*
Dropdown.prototype.getSelected = function() {};
Dropdown.prototype.getDropdownState = function() { return {};};
Dropdown.prototype.setDropdownState = function(state) {};
Dropdown.prototype.callback = function(object) {};
*/
//Modal.prototype.submitModal = function() {};

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
