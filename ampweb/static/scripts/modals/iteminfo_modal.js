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
}

AmpInfoModal.prototype = Object.create(Modal.prototype);
AmpInfoModal.prototype.constructor = AmpInfoModal;



/*
 * Make sure there are no spaces or anything weird in the shortname/ampname.
 */
AmpInfoModal.prototype.validateShortName = function(name) {

    if ( name.length == 0 ) {
        /* no name set isn't really an error or success, but can't submit */
        $("#ampname").parent().removeClass("has-error");
        $("#ampname").parent().removeClass("has-success");
        $("#ampname-help").hide();
        /* this should match what the html says, otherwise it will change */
        $("#longname").prop("placeholder", "Human-friendly display name");
    } else {
        /* if a name is entered, make sure it's sensible */
        name = name.toLowerCase();
        if ( name.search(/[^.a-z0-9-]/) == -1 ) {
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

        /* default the longname to the ampname */
        $("#longname").prop("placeholder", name);
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
    var longname;
    var loc;
    var description;
    var url;
    var requests = [];
    var category = this.category;

    if ( name ) {
        /* if name is set this is an update - we don't allow changing ampname */
        ampname = name;
        url = "/api/_mesh/update/" + ampname;
    } else {
        /* XXX should ampname be included in url or as a post parameter? */
        ampname = this.getTextValue("ampname");
        url = "/api/_mesh/add/" + ampname;
    }

    /* use the ampname if longname is not set */
    longname = this.getTextValue("longname") || ampname;
    loc = this.getTextValue("location");
    description = this.getTextValue("description");

    /* make the request to update the mesh information */
    requests.push($.ajax({
        method: "POST",
        url: url,
        data: { "longname": $.trim(longname),
                "location": $.trim(loc),
                "description": $.trim(description),
                "category": $.trim(this.category),
        },
    }));

    /*
     * wait for all outstanding requests and then close the modal when done,
     * reloading the base page so that the updates are present
     */
    $.when.apply(this, requests).done(function() {
        $("#modal-foo").modal("hide");
        if ( $.trim(category) == "site" ) {
            location.assign("/sites/view/" + ampname);
        } else {
            location.assign("/meshes/view/" + ampname);
        }
    });
}



/*
 * Delete a mesh/site entirely. Will cascade so any tests associated with this
 * mesh/site will also be deleted/updated.
 * TODO what happens if you remove the last target of a test?
 */
AmpInfoModal.prototype.del = function(name) {
    var category = this.category;
    $.ajax({
        method: "POST",
        url: "/api/_mesh/delete/" + name,
        data: { "category": $.trim(category) },
        success: function() {
            $("#modal-foo").modal("hide")
            /* load the main page now that this site/mesh no longer exists */
            if ( category == "site" ) {
                location.replace("/sites/");
            } else {
                location.replace("/meshes/");
            }
        }
    });
}
