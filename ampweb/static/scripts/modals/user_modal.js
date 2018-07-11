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

function UserModal() {
    //Modal.call(this);

    /*
     * Setting the class to "hidden" or "disabled" in the html stops it ever
     * being able to change... except I thought all the javascript did was
     * mess with those same classes? Anyway, hide/disable with javascript so
     * that we can then make the buttons work again later.
     */
    $("#username-help").hide();
    $("#password-help").hide();

    /* focus the first element so that the user can just start typing */
    $("#username").focus();
}

UserModal.prototype = Object.create(Modal.prototype);
UserModal.prototype.constructor = UserModal;



/*
 * Make sure there are no spaces or anything weird in the username.
 */
UserModal.prototype.validateUserName = function(name) {

    if ( name.length == 0 ) {
        /* no name set isn't really an error or success, but can't submit */
        $("#username").parent().removeClass("has-error");
        $("#username").parent().removeClass("has-success");
        $("#username-help").hide();
        /* this should match what the html says, otherwise it will change */
        $("#longname").prop("placeholder", "Name of account holder");
    } else {
        /* default the longname to the username */
        $("#longname").prop("placeholder", name);

        /* if a name is entered, make sure it's sensible */
        name = name.toLowerCase();
        if ( name.search(/[^a-z0-9]/) == -1 ) {
            /* no illegal characters, mark as good */
            $("#username").parent().removeClass("has-error");
            $("#username").parent().addClass("has-success");
            $("#username-help").hide();
        } else {
            /* illegal characters, mark as bad */
            $("#username").parent().removeClass("has-success");
            $("#username").parent().addClass("has-error");
            $("#username-help").show();
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
UserModal.prototype.validateLongName = function(name) {

    /* a zero length long name is only bad if the username isn't set */
    if ( name.length == 0 && $("#username").val().length == 0 &&
            $("#username").text().length == 0 ) {
        $("#longname").parent().removeClass("has-success");
    } else {
        /* any name is good */
        $("#longname").parent().addClass("has-success");
    }

    this.updateSubmitButtonState();
}



/*
 * XXX update
 * Location is entirely optional, but recommended. It won't affect the
 * ability to submit the site, but if the user does type something here
 * then highlight it green so they know it is good.
 */
UserModal.prototype.validateEmail = function(email) {

    if ( email.length == 0 ) {
        $("#email").parent().removeClass("has-success");
    } else {
        /* TODO check valid email address */
        $("#email").parent().addClass("has-success");
    }

    this.updateSubmitButtonState();
}



/*
 *
 */
UserModal.prototype.validatePassword = function() {
    var password1 = modal.getTextValue("password1");
    var password2 = modal.getTextValue("password2");

    if ( password1.length == 0 || password2.length == 0 ) {
        $("#password1").parent().removeClass("has-error");
        $("#password1").parent().removeClass("has-success");
        $("#password2").parent().removeClass("has-error");
        $("#password2").parent().removeClass("has-success");
        $("#password-help").hide();
    } else if ( password1 == password2 ) {
        $("#password1").parent().removeClass("has-error");
        $("#password1").parent().addClass("has-success");
        $("#password2").parent().removeClass("has-error");
        $("#password2").parent().addClass("has-success");
        $("#password-help").hide();
    } else {
        $("#password1").parent().removeClass("has-success");
        $("#password1").parent().addClass("has-error");
        $("#password2").parent().removeClass("has-success");
        $("#password2").parent().addClass("has-error");
        $("#password-help").show();
    }

    this.updateSubmitButtonState();
}



/*
 * Enable or disable the submit button depending on the validity of the
 * current username. The username needs to have the have-success
 * class (which means it is valid) or have a text value (which means it is
 * fixed and can't be edited). The other fields all have default values or
 * will accept anything, so don't matter.
 */
UserModal.prototype.updateSubmitButtonState = function() {
    if ( $("#password1").parent().hasClass("has-error") ||
            $("#password2").parent().hasClass("has-error") ||
            modal.getTextValue("password1").length !=
                modal.getTextValue("password2").length ) {
        $("#submit").prop("disabled", true);
    } else if ( ($("#username").parent().hasClass("has-success") ||
                $("#username").text().length > 0 ) ) {
        $("#submit").prop("disabled", false);
    } else {
        $("#submit").prop("disabled", true);
    }
}



/*
 * Confirm or update the details of a site/mesh and add it to the database.
 */
UserModal.prototype.submit = function(name) {
    var username;
    var url;
    var method;
    var data = {};
    var requests = [];
    var category = $.trim(this.category);
    var modal = this;

    url = API_URL + "/v2/users";

    if ( name ) {
        /* if name is set this is an update - don't allow changing username */
        method = "PUT";
        username = name;
        url += "/" + modal.doubleEscape(username);
    } else {
        /* this is a new user */
        method = "POST";
        username = modal.getTextValue("username");
        data["username"] = username.toLowerCase();
    }

    /* use the username if longname is not set */
    data["longname"] = modal.getTextValue("longname") || username;
    data["roles"] = modal.getCheckedValue("roles");
    data["email"] = modal.getTextValue("email");
    data["password"] = modal.getTextValue("password1");

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
    $.when.apply(modal, requests).done(function() {
        $("#modal-foo").modal("hide");
        location.reload();
    });
}



/*
 * Delete a user entirely.
 */
UserModal.prototype.del = function(name) {
    $.ajax({
        method: "DELETE",
        url: API_URL + "/v2/users/" + modal.doubleEscape(name),
        success: function() {
            $("#modal-foo").modal("hide")
            location.reload();
        }
    });
}
