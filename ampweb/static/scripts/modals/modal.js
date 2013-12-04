function Modal() {
}

/* "abstract functions" that need to be implemented by child classes */
Modal.prototype.submit = function() {};
Modal.prototype.update = function(name) {};

/* list of selectables that can be changed/invalidated/etc based on parents */
Modal.prototype.selectables = []

/* marker value for a selectable that hasn't had a real selection made yet */
Modal.prototype.marker = "--SELECT--";



/*
 * Populate a generic dropdown, with no option selected
 */
Modal.prototype.populateDropdown = function (name, data, descr) {
    var node = "#" + name;
    $(node).empty();

    /* enable this dropdown now that it is about to be populated */
    $(node).prop("disabled", false);

    /* add the marker value to the top of the select as a simple reminder */
    $(node).append(
            "<option value=\"" + this.marker + "\">Select " + descr +
            "...</option>");
    /*
     * Disable the marker value though so the user can't select it. If we do
     * this after it has been displayed then it will remain as the visible
     * option rather than having it fall through to the first enabled option
     */
    $(node + " > option:first").prop("disabled", true);

    /* add all the data as options */
    $.each(data, function(index, value){
        $("<option value=\"" + value + "\">" + value +
            "</option>").appendTo(node);
    });

    /*
     * If there is only a single option then automatically select it and
     * trigger the onchange event to populate the next dropdown.
     */
    if ( data.length == 1 ) {
        $(node + " > option:eq(1)").prop("selected", true);
        $(node).change();
    }

    /* clear all the selections below the one we've just updated */
    this.resetSelectables(name);
}



/*
 * Reset all selectable options that follow on from the one that is being
 * updated so that they don't remain on possibly invalid values.
 */
Modal.prototype.resetSelectables = function(name) {
    var found = false;

    for ( var i in this.selectables ) {
        /* don't do anything till we find the selectable to update */
        if ( this.selectables[i] == name ) {
            found = true;
            continue;
        }

        /* once we've found the selectable we are updating, reset the rest */
        if ( found ) {
            var node = "#" + this.selectables[i];
            $(node).prop("disabled", true);
            $(node).empty();
        }
    }
}



/*
 * Update the submit button to be enabled or disabled depending if all the
 * fields on the form are set properly or not.
 */
Modal.prototype.updateSubmit = function() {
    for ( var i in this.selectables ) {
        var value = $("#" + this.selectables[i] + " option:selected").val();
        if ( value == undefined || value == this.marker ) {
            /* something isn't set, disable the submit button */
            $("#submit").prop("disabled", true);
            return;
        }
    }

    /* everything is set properly, enable the submit button */
    $("#submit").prop("disabled", false);
}



/*
 * Remove a data series/group from the current view.
 */
Modal.prototype.removeSeries = function(group) {
    if ( group > 0 ) {
        $.ajax({
            url: "/api/_createview/del/" + currentview + "/" + group + "/",
            success: function(data) {
                /* current view is what changeView() uses for the new graph */
                currentview = data;
                /* fetch new data */
                graphPage.changeView(data);
            }
        });
    }
}


Modal.prototype.finish = function(data) {
    /* hide modal window */
    $("#modal-foo").modal('hide');

    /* current view is what changeView() uses for the new graph */
    currentview = data;

    /* fetch new data */
    graphPage.changeView(data);
}


// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
