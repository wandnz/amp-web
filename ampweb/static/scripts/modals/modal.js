/*
 * This file is part of amp-web.
 *
 * Copyright (C) 2013-2017 The University of Waikato, Hamilton, New Zealand.
 *
 * Authors: Shane Alcock
 *          Brendon Jones
 *
 * All rights reserved.
 *
 * This code has been developed by the WAND Network Research Group at the
 * University of Waikato. For further information please see
 * http://www.wand.net.nz/
 *
 * amp-web is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 2 as
 * published by the Free Software Foundation.
 *
 * amp-web is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with amp-web; if not, write to the Free Software Foundation, Inc.
 * 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 *
 * Please report any bugs, questions or comments to contact@wand.net.nz
 */


function Modal() {
    $("#modal-foo").on("shown.bs.modal", function () {
        /* only update initial selector and reset everything the first time */
        if ( ! graphPage.modal.shown ) {
            prettifySelect($("#modal-foo select"));
            graphPage.modal.lastchoice = "";
            graphPage.modal.lastselection = [];
            setTimeout(function() {
                graphPage.modal.update();
                graphPage.modal.shown = true;
            }, 600);
        } else {
            graphPage.modal.update();
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
    var value = $.trim($("#" + name).val());

    if ( value == this.marker ) {
        value = "";
    }

    if ( encode ) {
        value = value.replace(/\//g, '|');
        value = encodeURIComponent(value);
    }

    return value;
}

Modal.prototype.decodeValue = function(todecode) {

    if (!todecode)
        return todecode;
    var value = decodeURIComponent(todecode);

    /* XXX What happens if the original value had '|'s in it?
     * Those will be also converted to '/'s
     */
    return value.replace(/\|/g, '/');

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


/*
 *
 */
Modal.prototype.getCheckedValue = function (name) {
    var value = []
    $("[name=" + name + "]:checked").each(function() {
        value.push($(this).val());
    });
    return value;
}

Modal.prototype.setFixedRadio = function(name, value) {

    $("input[name='" + name + "'][value='" + value + "']").click();
}

Modal.prototype.updateAll = function(data) {
    var modal = this;
    var foundchoice = false;

    for (var i in modal.selectables) {
        if (modal.selectables.hasOwnProperty(i)) {
            var sel = modal.selectables[i];
            var node = sel.node;
            var prevsel = null;

            if (node === undefined) {
                node = sel.name;
            }

            if (node == this.lastchoice || !this.lastchoice || this.lastchoice == "") {
                foundchoice = true;
            }

            if (!foundchoice)
                continue;

            if (sel.type != "fixedradio" && data &&
                    !data.hasOwnProperty(sel.name)) {
                continue;
            }

            if (modal.lastselection && modal.lastselection.hasOwnProperty(i)) {
                prevsel = modal.translateSelection(modal.lastselection[i],
                        sel.name);
                modal.lastselection[i] = null;
            }

            if (sel.type == "radio") {
                if (!data)
                    modal.disableMultiRadio(node, sel.validvalues);
                else
                    modal.enableMultiRadio(node, data[sel.name],
                            sel.validvalues, prevsel);
            } else if (sel.type == "boolradio") {
                if (!data) {
                    modal.disableRadioButton("#" + node + "-true");
                    modal.disableRadioButton("#" + node + "-false");
                }
                else {
                    modal.enableBoolRadio(node, data[sel.name], prevsel);
                }
            } else if (sel.type == "dropdown") {
                if (!data)
                    modal.disableDropdown(node);
                else
                    modal.populateDropdown(node, sel.name, data[sel.name], sel.label,
                            prevsel);
            } else if (sel.type == "fixedradio") {
                if (prevsel) {
                    this.setFixedRadio(node, prevsel);
                }
            }
        }
    }
    modal.updateSubmit();
}

Modal.prototype.updateModalDialog = function(name) {
    var modal = this;
    var base = API_URL + "/_destinations/" + modal.collection;
    this.resetSelectables(name);
    this.lastchoice = name;
    $.ajax({
        url: modal.constructQueryURL(base, name, modal.selectables),
        success: function(data) {
            modal.updateAll(data);
        }
    });

}

Modal.prototype.updateFixedRadio = function(name) {
    this.updateAll([]);

}

Modal.prototype.constructQueryURL = function(base, name, selectables) {
    var modal = this;
    var url = base + "/";

    for (var i in selectables) {
        if (selectables.hasOwnProperty(i)) {
            var next = "";
            var node;
            var encode;
            var sel = selectables[i];

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
Modal.prototype.populateDropdown = function (name, selname, data, descr, choose) {
    var node = "#" + name;
    var modal = this;
    $(node).empty();

    /* enable this dropdown now that it is about to be populated */
    $(node).prop("disabled", false);

    var base = API_URL + "/_destinations/" + modal.collection;
    var selopts = {
        placeholder: "Select " + descr,
        cache: true,
        ajax: {
            url: modal.constructQueryURL(base, name, modal.selectables),
            dataType: "json",
            type: "GET",
            delay: 250,
            width: "style",
            data: function(params) {
                return {
                    term: params.term || "",
                    page: params.page || 1
                };
            },
            processResults: function(data, params) {
                var r = [];
                var morepages = false;
                params.page = params.page || 1;
                if (data && data.hasOwnProperty(selname)) {
                    r = data[selname].items;
                    morepages = (params.page * 30) < data[selname].maxitems;
                }

                return {
                    results: r,
                    pagination: {
                        more: morepages
                    }
                };
            },
        }
    };
    /*
     * If there is only a single option then automatically select it and
     * trigger the onchange event to populate the next dropdown.
     */
    if ( data.maxitems == 1 ) {
        $("<option value=\"" + data.items[0].id + "\">" + data.items[0].text +
                "</option>").appendTo(node);
        $(node + " > option:eq(1)").prop("selected", true);
        this.update(name);
    } else if (choose) {
        $("<option value=\"" + choose + "\">" + choose +
                "</option>").appendTo(node);
        $(node).val(choose);
        this.update(name);
    }
    prettifySelect($(node), selopts);

}

Modal.prototype.enableRadioButton = function(button, isActive) {

    $(button).removeProp("disabled");
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

Modal.prototype.enableMultiRadio = function(label, data, possibles, prevsel) {
    var node = "#" + label;
    var modal = this;

    var current = this.getRadioValue(label) || prevsel;

    $.each(possibles, function(index, pos) {
        modal.disableRadioButton(node + "-" + pos);
    });

    $.each(data.items, function(dind, dval) {
        var button = node + "-" + dval.id;

        if (dval.text == current || data.items.length == 1) {
            modal.enableRadioButton(button, true)
            $("[name=" + label + "]").val([dval.id]);
        } else {
            modal.enableRadioButton(button, false);
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


Modal.prototype.translateSelection = function(sel, fieldname) {
    return sel;
}

Modal.prototype.enableBoolRadio = function(label, data, prevsel) {
    return this.enableMultiRadio(label, data, ['true', 'false'], prevsel);

}

Modal.prototype.disableDropdown = function(nodename) {
    var node = "#" + nodename;
    if ($(node).is("select")) {
        $(node).empty();
        $(node).prop("disabled", true);
        prettifySelect($(node));
    }
}

Modal.prototype.resetSelectables = function(name) {
    var found = false;
    var node;

    for ( var i in this.selectables ) {
        if (this.selectables.hasOwnProperty(i)) {
            var sel = this.selectables[i];
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
            var sel = this.selectables[i];

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
    this.lastselection = [];
}



/*
 * Remove a data series/group from the current view.
 */
Modal.prototype.removeSeries = function(collection, group) {
    if ( group > 0 ) {
        $.ajax({
            url: API_URL + "/_createview/del/" + collection + "/" +
                    currentView + "/" + group + "/",
            success: function(data) {
                /* current view is what changeView() uses for the new graph */
                currentView = data;
                /* fetch new data */
                graphPage.changeView(data);
            }
        });
    }
}

Modal.prototype.submitAjax = function(params, viewstyle) {

    var url = API_URL + "/_createview/add/" + this.collection + "/" +
            currentView + "/" + viewstyle;

    for ( var i in params ) {
        if (params.hasOwnProperty(i)) {
            var next = params[i];
            if (!next || next == "")
                return;
            url += "/" + next;
        }
    }

    this.lastselection = params;
    this.lastchoice = "";
    $.ajax({
        url: url,
        success: this.finish
    });

}

Modal.prototype.finish = function(data) {
    /* hide modal window */
    $("#modal-foo").modal('hide');

    /* current view is what changeView() uses for the new graph */
    currentView = data;

    /* fetch new data */
    graphPage.changeView(data);
}

Modal.prototype.doubleEscape = function(value) {
    return encodeURIComponent(encodeURIComponent(value));
}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
