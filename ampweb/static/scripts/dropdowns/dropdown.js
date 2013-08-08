function Dropdown() {
    this.sortDropdown = function(ddName, selected) {
        var r1 = $(ddName + " option");
        r1.sort( function(a, b) {
            if (a.text.toLowerCase() < b.text.toLowerCase()) return -1;
            if (a.text.toLowerCase() == b.text.toLowerCase()) return 0;
            return 1;
        });
        $(r1).remove();
        $(ddName).append($(r1));

        /* Set the selected value to our "please select" option */
        if (selected == "") {
            selected = "--SELECT--";
        }

        /* VERY IMPORTANT: don't use object:contains() here! It doesn't do an
         * exact match, so if you have two text options with similar names you can
         * often end up with the wrong option being selected.
         *
         * The below approach is much more explicit and will perform an exact
         * match only.
         */

        var selectedInList = 0; 
        $(ddName + " option").each(function() {
            if ($(this).text() == selected) {
                $(this).attr('selected', 'selected');
                if (selected != "--SELECT--")
                    selectedInList = 1;
            } else {
                $(this).attr('selected', false);
            }
        });

        return selectedInList;
    }

    this.populateDropdown = function(name, data, selected) {
        /* Clear the current population */
        $(name).empty();
        $(name).append(
                "<option value=\"--SELECT--\">--SELECT--</option>");
        $.each(data, function(index, dst){
                $("<option value=\"" + dst + "\">" + dst +
                    "</option>").appendTo(name);
                });

        /* Enable the dropdown */
        //$(name).removeAttr('disabled');
        return this.sortDropdown(name, selected);
    }

    this.constructDropdown = function(obj) {
        $('#dropdowndiv').append(obj['ddlabel']);
        var dd = "<select id=\"" + obj['ddidentifier'] + "\" ";
        dd += "onChange=\"dropdownCallback(this);\" ";

        if (obj['disabled'])
            dd += "disabled";
        dd += ">";
        dd += "</select>";
        $('#dropdowndiv').append(dd);

        console.log(obj);
        this.populateDropdown("#" + obj['ddidentifier'],
                obj['dditems'], obj['ddselected']);
    }
        

}

/* "abstract functions" that need to be implemented by child classes */
Dropdown.prototype.getSelected = function() {};
Dropdown.prototype.getDropdownState = function() { return {};};
Dropdown.prototype.setDropdownState = function(state) {};
Dropdown.prototype.callback = function(object) {};

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
