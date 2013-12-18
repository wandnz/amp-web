$(document).ready(function() {
    /*
     * XXX The "shown" event triggers once the modal is visible and any css
     * transitions have been completed, so why on earth do we have to wait
     * just a little bit longer for the form to actually appear and be
     * selectable with jquery?
     */
    $("#modal-foo").on("shown.bs.modal", function () {
        /* only update initial selector and reset everything the first time */
        if ( ! graphPage.modal.shown ) {
            setTimeout(function() {
                graphPage.modal.update();
                graphPage.modal.shown = true;
            }, 600);
        }
    });
});


function Modal() {
}


/* "abstract functions" that need to be implemented by child classes */
Modal.prototype.submit = function() {};
Modal.prototype.update = function(name) {};

/* list of selectables that can be changed/invalidated/etc based on parents */
Modal.prototype.selectables = []

/* marker value for a selectable that hasn't had a real selection made yet */
Modal.prototype.marker = "--SELECT--";

/* has the modal been displayed yet */
Modal.prototype.shown = false;



/*
 * Get the value of the named dropdown, or undefined if the value has not
 * been set yet (e.g. the dropdown is still disabled or a selection has yet
 * to be made).
 */
Modal.prototype.getDropdownValue = function (name) {
    var value;
    if ( $("#" + name + " option:selected").val() == undefined ) {
        value = undefined;
    } else if ( $("#" + name + " option:selected").val() != this.marker ) {
        value = $("#" + name + " option:selected").val().trim();
    } else {
        value = "";
    }
    return value;
}



/*
 * Get the value of the named radio button. There should always be an active
 * selection so this should always return a good value, or undefined if the
 * item does not exist (or isn't a radio button).
 */
Modal.prototype.getRadioValue = function (name) {
    return $("[name=" + name + "]:checked").val();
}



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
    data.sort();
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

Modal.prototype.enableBoolRadioButton = function(button, isActive) {

    $(button).prop("disabled", false);
    $(button).toggleClass("disabled", false);

    if (isActive) {
        $(button).toggleClass("active", true);
        $(button).prop("active", true);
    }

}

Modal.prototype.disableBoolRadioButton = function(button) {

    $(button).prop("disabled", true);
    $(button).toggleClass("disabled", true);
    $(button).removeProp("active");
    $(button).toggleClass("active", false);

}

Modal.prototype.enableBoolRadio = function(label, data) {

    var node = "#" + label;
    var truenode = "#" + label + "-true";
    var falsenode = "#" + label + "-false";

    var current = this.getRadioValue(label);

    /* Disable everything so we can start afresh */
    this.disableBoolRadioButton(truenode);
    this.disableBoolRadioButton(falsenode);

    /* XXX Lots of array iterations here, but our array
     * shouldn't contain more than 2 values so not as bad as
     * it looks...
     */
    $.each(data, function(index, value) {
        if (value == true)
            data[index] = "true";
        if (value == false)
            data[index] = "false";
    });

    if ($.inArray(current, data) == -1)
        current = undefined;

    if ($.inArray("true", data) != -1) {
        if (current == undefined || current == "true") {
            this.enableBoolRadioButton(truenode, true);
            $("[name=" + label + "]").val(["true"]);
            current = "true";
        } else {
            this.enableBoolRadioButton(truenode, false);
        }
    }

    if ($.inArray("false", data) != -1) {
        if (current == undefined || current == "false") {
            this.enableBoolRadioButton(falsenode, true);
            $("[name=" + label + "]").val(["false"]);
            current = "false";
        } else {
            this.enableBoolRadioButton(falsenode, false);
        }
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
        if ( found) {
            var node = "#" + this.selectables[i];
            if ($(node).is("select")) {
                $(node).prop("disabled", true);
                $(node).empty();
            } 
            /* XXX Our current radio selectors don't have an element type -- 
             * it comes through as undefined. Could we assign a type somehow
             * so we don't need this extra array?
             */
            else if ($.inArray(this.selectables[i], this.radioSelectors) != -1) 
            {
                this.disableBoolRadioButton(node + "-true"); 
                this.disableBoolRadioButton(node + "-false");
            }
        }
    }

}



/*
 * Update the submit button to be enabled or disabled depending if all the
 * fields on the form are set properly or not.
 */
Modal.prototype.updateSubmit = function() {
    for ( var i in this.selectables ) {
        if ($.inArray(this.selectables[i], this.radioSelectors) != -1) {
            var value = this.getRadioValue(this.selectables[i]);
            if ( value == undefined || value == this.marker ) {
                $("#submit").prop("disabled", true);
                return;
            }
        } else {
            var value = this.getDropdownValue(this.selectables[i]);
            if ( value == undefined || value == this.marker ) {
                /* something isn't set, disable the submit button */
                $("#submit").prop("disabled", true);
                return;
            }
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
