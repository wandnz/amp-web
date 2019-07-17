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

function AmpInfoModal(category) {
    //Modal.call(this);
    this.category = category;

    /*
     * Setting the class to "hidden" or "disabled" in the html stops it ever
     * being able to change... except I thought all the javascript did was
     * mess with those same classes? Anyway, hide/disable with javascript so
     * that we can then make the buttons work again later.
     */
    $("#ampname-help").hide();

    /* focus the first element so that the user can just start typing */
    $("#ampname").focus();
}

AmpInfoModal.prototype = Object.create(Modal.prototype);
AmpInfoModal.prototype.constructor = AmpInfoModal;



/*
 * Make sure there are no spaces or anything weird in the ampname.
 */
AmpInfoModal.prototype.validateAmpName = function(name) {

    if ( name.length == 0 ) {
        /* no name set isn't really an error or success, but can't submit */
        $("#ampname").parent().removeClass("has-error");
        $("#ampname").parent().removeClass("has-success");
        $("#ampname-help").hide();
        /* this should match what the html says, otherwise it will change */
        $("#longname").prop("placeholder", "Human-friendly display name");
    } else {
        /* default the longname to the ampname */
        $("#longname").prop("placeholder", name);

        /* if a name is entered, make sure it's sensible */
        if ( name.search(/[^.:/a-zA-Z0-9_-]/) == -1 ) {
            /* no illegal characters, mark as good */
            $("#ampname").parent().removeClass("has-error");
            $("#ampname").parent().addClass("has-success");
            $("#ampname-help").hide();
        } else {
            /* illegal characters, mark as bad */
            $("#ampname").parent().removeClass("has-success");
            $("#ampname").parent().addClass("has-error");
            $("#ampname-help").show();
        }
    }

    /* revalidate the longname if it hasn't been manually set */
    if ( $("#longname").val().length == 0 ) {
        this.validateLongName(name);
    }

    this.updateSubmitButtonState();
}



/*
 * As long as anything is here then that is fine.
 */
AmpInfoModal.prototype.validateLongName = function(name) {

    /* a zero length long name is only bad if the ampname isn't set */
    if ( name.length == 0 && $("#ampname").val().length == 0 &&
            $("#ampname").text().length == 0 ) {
        $("#longname").parent().removeClass("has-success");
    } else {
        /* any name is good */
        $("#longname").parent().addClass("has-success");
    }

    this.updateSubmitButtonState();
}



/*
 * Location is entirely optional, but recommended. It won't affect the
 * ability to submit the site, but if the user does type something here
 * then highlight it green so they know it is good.
 */
AmpInfoModal.prototype.validateLocation = function(name) {

    if ( name.length == 0 ) {
        $("#location").parent().removeClass("has-success");
    } else {
        $("#location").parent().addClass("has-success");
    }

    this.updateSubmitButtonState();
}



/*
 * Description is entirely optional, but recommended. It won't affect the
 * ability to submit the mesh/site, but if the user does type something here
 * then highlight it green so they know it is good.
 */
AmpInfoModal.prototype.validateDescription = function(name) {

    if ( name.length == 0 ) {
        $("#description").parent().removeClass("has-success");
    } else {
        $("#description").parent().addClass("has-success");
    }

    this.updateSubmitButtonState();
}



/*
 * Enable or disable the submit button depending on the validity of the
 * current ampname. The ampname needs to have the have-success
 * class (which means it is valid) or have a text value (which means it is
 * fixed and can't be edited). The other fields all have default values or
 * will accept anything, so don't matter.
 */
AmpInfoModal.prototype.updateSubmitButtonState = function() {
    if ( ($("#ampname").parent().hasClass("has-success") ||
                $("#ampname").text().length > 0 ) ) {
        $("#submit").prop("disabled", false);
    } else {
        $("#submit").prop("disabled", true);
    }
}



/*
 * Confirm or update the details of a site/mesh and add it to the database.
 */
AmpInfoModal.prototype.submit = function(name) {
    var ampname;
    var url;
    var method;
    var data = {};
    var requests = [];
    var category = $.trim(this.category);
    var modal = this;

    if ( category == "site" ) {
        url = API_URL + "/v2/sites";
        data["location"] = modal.getTextValue("location");
    } else {
        url = API_URL + "/v2/meshes";
        data["public"] = modal.getRadioValue("public");
        data["issource"] = modal.getRadioValue("issource");
    }

    if ( name ) {
        /* if name is set this is an update - we don't allow changing ampname */
        method = "PUT";
        ampname = name;
        url += "/" + modal.doubleEscape(ampname);
    } else {
        /* this is a new mesh or site */
        method = "POST";
        ampname = modal.getTextValue("ampname");
        data["ampname"] = ampname;
    }

    /* use the ampname if longname is not set */
    data["longname"] = modal.getTextValue("longname") || ampname;
    data["description"] = modal.getTextValue("description");

    /* make the request to update the mesh information */
    requests.push($.ajax({
        method: method,
        url: url,
        data: JSON.stringify(data),
        contentType: "application/json",
    }));

    /*
     * wait for all outstanding requests and then close the modal when done,
     * reloading the base page so that the updates are present
     */
    if ( $.trim(category) == "site" ) {
        $.when.apply(modal, requests).done(function() {
            /* dealing with a site, nothing more to be done */
            $("#modal-foo").modal("hide");
            location.assign(HOME_URL + "sites/view/" +
                    modal.doubleEscape(ampname));
        });
    } else {
        tests = modal.getCheckedValue("tests");
        $.when.apply(modal, requests).done(function() {
            /* dealing with a mesh, we also need to set any test flags for it */
            requests.push($.ajax({
                method: "PUT",
                url: API_URL+"/v2/meshes/"+ampname+"/tests",
                data: JSON.stringify({"tests": tests}),
                contentType: "application/json",
            }));

            $.when.apply(modal, requests).done(function() {
                $("#modal-foo").modal("hide");
                location.assign(HOME_URL + "meshes/view/" +
                        modal.doubleEscape(ampname));
            });
        });
    }
}



/*
 * Delete a mesh/site entirely. Will cascade so any tests associated with this
 * mesh/site will also be deleted/updated.
 * TODO what happens if you remove the last target of a test?
 */
AmpInfoModal.prototype.del = function(name) {
    var category = this.category;
    var urlbase;

    if ( category == "site" ) {
        urlbase = API_URL + "/v2/sites";
    } else {
        urlbase = API_URL + "/v2/meshes";
    }

    $.ajax({
        method: "DELETE",
        url: urlbase + "/" + modal.doubleEscape(name),
        success: function() {
            $("#modal-foo").modal("hide")
            /* load the main page now that this site/mesh no longer exists */
            if ( category == "site" ) {
                location.replace(HOME_URL + "sites");
            } else {
                location.replace(HOME_URL + "meshes");
            }
        },
        error: function() {
            /*
             * Assuming any error is caused by still referenced tests, which
             * may not actually be the case (but probably is).
             * TODO Should we just delete the mesh and all its tests?
             */
            $("#modal-foo").modal("hide")
            displayAjaxAlert("Not deleting mesh - remove tests first");
        }
    });
}
