
function Modal() {
    $("#modal-foo").on("shown.bs.modal", function () {
        /* only update initial selector and reset everything the first time */
        if ( ! graphPage.modal.shown ) {
            prettifySelect($("#modal-foo select"));
            setTimeout(function() {
                graphPage.modal.update();
                graphPage.modal.shown = true;
            }, 600);
        }
    });
}


/* "abstract functions" that need to be implemented by child classes */
Modal.prototype.submit = function() {};
Modal.prototype.update = function(name) {};

/* list of selectables that can be changed/invalidated/etc based on parents */
Modal.prototype.selectables = []
Modal.prototype.labels = []

/* marker value for a selectable that hasn't had a real selection made yet */
Modal.prototype.marker = "Loading...";

/* has the modal been displayed yet */
Modal.prototype.shown = false;

/* allows search bar in select2 to work in our modals */
$.fn.modal.Constructor.prototype.enforceFocus = function() {};

/*
 * Get the value of the named dropdown, or undefined if the value has not
 * been set yet (e.g. the dropdown is still disabled or a selection has yet
 * to be made).
 */
Modal.prototype.getDropdownValue = function (name, encode) {
    var value;
    if ( $("#" + name + " option:selected").index() == 0 ) {
        value = undefined;
    } else if ( $("#" + name + " option:selected").val() != this.marker ) {
        value = $.trim($("#" + name + " option:selected").val());
        if (encode) {
            value = value.replace(/\//g, '|');
            value = encodeURIComponent(value);

        }
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
    
    var radval =  $("[name=" + name + "]:checked").val();
    if (radval == undefined)
        return "";
    return radval;
}



/*
 * Get the value of the named text input field.
 */
Modal.prototype.getTextValue = function (name) {
    var value = $("#" + name).val();
    if ( value == undefined ) {
        return "";
    }
    return value;
}



Modal.prototype.updateAll = function(data) {
    var modal = this;

    for (var i in modal.selectables) {
        if (modal.selectables.hasOwnProperty(i)) {
            var sel = modal.selectables[i]
            var node = sel.node;

            if (node === undefined) {
                node = sel.name;
            }

            if (data && !data.hasOwnProperty(sel.name))
                continue;

            if (sel.type == "radio") {
                if (!data)
                    modal.disableMultiRadio(node, sel.validvalues);
                else
                    modal.enableMultiRadio(node, data[sel.name], 
                            sel.validvalues);
            } else if (sel.type == "boolradio") {
                if (!data) {
                    modal.disableRadioButton("#" + node + "-true");
                    modal.disableRadioButton("#" + node + "-false");
                }
                else {
                    modal.enableBoolRadio(node, data[sel.name]);
                }
            } else if (sel.type == "dropdown") {
                if (!data)
                    modal.disableDropdown(node);
                else
                    modal.populateDropdown(node, data[sel.name], sel.label);
            }

            /* Ignore fixedradio, these are never updated or changed */
        }
    }
    modal.updateSubmit();
}

Modal.prototype.updateModalDialog = function(name) {
    var modal = this;
    var base = "/api/_destinations/" + modal.collection;
    this.resetSelectables(name);
    $.ajax({
        url: modal.constructQueryURL(base, name, modal.selectables),
        success: function(data) {
            modal.updateAll(data);
        }
    });

}

Modal.prototype.constructQueryURL = function(base, name, selectables) {
    var modal = this;
    var url = base + "/";
    
    for (var i in selectables) {
        if (selectables.hasOwnProperty(i)) {
            var next = "";
            var node;
            sel = selectables[i];
           
            if (sel.node != undefined)
                node = sel.node;
            else
                node = sel.name;

            if (sel.encode != undefined && sel.encode)
                encode = true;
            else
                encode = false;

            switch (sel.type) {
                case 'dropdown':
                    next = modal.getDropdownValue(node, encode);
                    break;
                case 'boolradio':
                case 'radio':
                    next = modal.getRadioValue(node);
                    break;
                /* Don't construct URLs for fixedradios */
            };
            

            if (next == undefined || next == "")
                break;

            url += next + "/";
            if (sel.name == name)
                break;
        }
    }

    return url;
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
        //$(node).change();
    } else {
        /* Ensure the disabled "Select ..." option is selected */
        $(node + " > option:first").prop("selected", true);
    }

    /* When we populate the select element with new options we need
       to re-prettify to update the select2 element */
    prettifySelect($(node));
}

Modal.prototype.enableRadioButton = function(button, isActive) {

    $(button).prop("disabled", false);
    $(button).toggleClass("disabled", false);

    if (isActive) {
        $(button).toggleClass("active", true);
        $(button).prop("active", true);
    }

}

Modal.prototype.disableRadioButton = function(button) {

    $(button).prop("disabled", true);
    $(button).toggleClass("disabled", true);
    $(button).removeProp("active");
    $(button).toggleClass("active", false);
    $(button).prop("checked", false);

}

Modal.prototype.enableMultiRadio = function(label, data, possibles) {
    var node = "#" + label;
    var modal = this;

    var current = this.getRadioValue(label);

    $.each(possibles, function(index, pos) {
        modal.disableRadioButton(node + "-" + pos);
    });
    
    if ($.inArray(current, data) == -1)
        current = undefined;

    $.each(possibles, function(index, pos) {
        button = node + "-" + pos;
        if ($.inArray(pos, data) != -1) {
            if (current == pos || (current == undefined && data.length == 1)) {
                modal.enableRadioButton(button, true);
                $("[name=" + label + "]").val([pos]);
                current = pos;
            } else {
                modal.enableRadioButton(button, false);
            }
        }
    });

}

Modal.prototype.disableMultiRadio = function(label, possibles) {
    var node = "#" + label;
    var modal = this;
    
    $.each(possibles, function(index, pos) {
        modal.disableRadioButton(node + "-" + pos);
    });

}


Modal.prototype.enableBoolRadio = function(label, data) {
    $.each(data, function(index, value) {
        if (value == true)
            data[index] = "true";
        if (value == false)
            data[index] = "false";
    });

    return this.enableMultiRadio(label, data, ['true', 'false']);

}

Modal.prototype.disableDropdown = function(nodename) {
    var node = "#" + nodename;
    if ($(node).is("select")) {
        $(node).prop("disabled", true);
        $(node).empty();
    } 
}

Modal.prototype.resetSelectables = function(name) {
    var found = false;
    var node;

    for ( var i in this.selectables ) {
        if (this.selectables.hasOwnProperty(i)) {
            sel = this.selectables[i];
            /* don't do anything till we find the selectable to update */
            if ( sel.name == name ) {
                found = true;
                continue;
            }

            if (sel.node == undefined) {
                node = sel.name;
            } else {
                node = sel.node;
            }

            if ( found) {
                if (sel.type == "dropdown") {
                    this.disableDropdown(node);
                }
                else if (sel.type == "boolradio") 
                {
                    this.disableRadioButton("#" + node + "-true"); 
                    this.disableRadioButton("#" + node + "-false");
                    $("input[name=" + node + "]").prop('checked', false);
                }
                else if (sel.type == "radio") {
                    this.disableMultiRadio(node, sel.validvalues);
                }

                /* Don't attempt to disable fixedradio buttons */
            }
        }
    }

}



/*
 * Update the submit button to be enabled or disabled depending if all the
 * fields on the form are set properly or not.
 */
Modal.prototype.updateSubmit = function() {
    var node;
    for ( var i in this.selectables ) {
        if (this.selectables.hasOwnProperty(i)) {
            sel = this.selectables[i];

            if (sel.node == undefined) {
                node = sel.name;
            } else {
                node = sel.node;
            }

            if (sel.type == "boolradio" || sel.type == "radio" || 
                        sel.type == "fixedradio") {
                var value = this.getRadioValue(node);
                if ( value == undefined || value == "" ) {
                    $("#submit").prop("disabled", true);
                    return;
                }
            } else {
                var value = this.getDropdownValue(node, false);
                if ( value == undefined || value == "" ) {
                    /* something isn't set, disable the submit button */
                    $("#submit").prop("disabled", true);
                    return;
                }
            }
        }
    }

    /* everything is set properly, enable the submit button */
    $("#submit").prop("disabled", false);
}



/*
 * Remove a data series/group from the current view.
 */
Modal.prototype.removeSeries = function(collection, group) {
    if ( group > 0 ) {
        $.ajax({
            url: "/api/_createview/del/" + collection + "/" + currentView + 
                    "/" + group + "/",
            success: function(data) {
                /* current view is what changeView() uses for the new graph */
                currentView = data;
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
    currentView = data;

    /* fetch new data */
    graphPage.changeView(data);
}


// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
