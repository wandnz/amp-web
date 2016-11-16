
function AmpMemberModal() {
    //Modal.call(this);
    this.members = [];
    this.add = [];
    this.remove = []
    this.selectopts = { minimumResultsForSearch: 9 };
    prettifySelect($("#modal-foo select"), this.selectopts);
}

AmpMemberModal.prototype = Object.create(Modal.prototype);
AmpMemberModal.prototype.constructor = AmpMemberModal;


/*
 * Check the radio button beside the currently selected destination input
 * field, and enable/disable the add/submit buttons if the destination is
 * valid.
 */
AmpMemberModal.prototype.updateDestinations = function(which) {
    /* select the radio button for whichever input we have selected */
    $("[name=dest_type][value=" + which + "]").prop("checked", true);

    if ( document.getElementById("add") ) {
        /* member page or editing existing schedule - update "add" button */
        this.updateAddButtonState();
    } else {
        this.updateSubmitButtonState();
    }
}



/*
 * Enable or disable the submit button depending on the validity of the
 * currently selected destination. To be valid, a destination must be
 * selected from the dropdown or a non-zero length name must be entered
 * in the text field.
 */
AmpMemberModal.prototype.updateSubmitButtonState = function() {
    if ( (this.add.length == 0 && this.remove.length == 0) ) {
        $("#submit").prop("disabled", true);
    } else {
        $("#submit").prop("disabled", false);
    }
}



/*
 * Enable or disable the add target button depending on the validity of
 * the currently selected destination. To be valid, a destination must be
 * selected from the dropdown or a non-zero length name must be entered
 * in the text field and it must not already exist as a destination.
 */
AmpMemberModal.prototype.updateAddButtonState = function() {
    var dst;
    var existing = this.members.concat(this.destination_meshes).concat(
            this.destination_sites);

    /* get whichever destination input is currently active */
    if ( this.getRadioValue("dest_type") == "destitem" ) {
        dst = this.getDropdownValue("destitem");
    } else {
        dst = this.getTextValue("deststring");
    }

    /* if destination is already there or is being added, disable button */
    if ( dst.length == 0 || dst == "Select destination..." ||
            this.add.indexOf(dst) != -1 || this.remove.indexOf(dst) != -1 ||
            existing.indexOf(dst) != -1 ) {
        $("#add").prop("disabled", true);
    } else {
        $("#add").prop("disabled", false);
    }
}



/*
 * Add a new destination to a test. Calling this function only adds the
 * destination to a temporary list, which is not confirmed until the update
 * button is pressed.
 */
AmpMemberModal.prototype.addDestination = function() {
    var dst;

    /* get whichever destination input is currently active */
    if ( this.getRadioValue("dest_type") == "destitem" ) {
        dst = this.getDropdownValue("destitem");
    } else {
        dst = this.getTextValue("deststring");
        $("#deststring").val("");
    }

    /* add it to the temporary list of destinations to add */
    this.add.push(dst);

    /* remove the "None" placeholder if this is the first member */
    $("#none_placeholder").hide();

    /* show with a nice green name to mark it as new */
    $("#target_area").append("<p class='form-control-static'>" +
            "<span class='glyphicon glyphicon-remove' onclick='modal.toggleRemoveDestination(\"" + dst + "\");'></span>" +
            "<span name='" + dst + "' style='color: green;'>&nbsp;" + dst + "</span>" +
            "</p>");

    /* disable the add button, because the destination is already there */
    this.updateAddButtonState();
    this.updateSubmitButtonState();
}



AmpMemberModal.prototype.styleAddedDestination = function(name) {
    var existing = this.members.concat(this.destination_meshes).concat(
            this.destination_sites);

    if ( existing.indexOf(name) >= 0 ) {
        /* destination was currently active, print it black again */
        $("[name='" + name + "']").css("color", "black");
    } else {
        /* destination was just added, print it green again */
        $("[name='" + name + "']").css("color", "green");
    }

    /* remove the strikethrough and remove from the list */
    $("[name='" + name + "']").css("text-decoration", "none");
}


AmpMemberModal.prototype.styleRemovedDestination = function(name) {
    /* strikethrough and print it red */
    $("[name='" + name + "']").css("color", "red");
    $("[name='" + name + "']").css("text-decoration", "line-through");
}

/*
 * Remove a destination to a test. Calling this function only adds the
 * destination to a temporary list, which is not confirmed until the update
 * button is pressed.
 */
AmpMemberModal.prototype.toggleRemoveDestination = function(name) {
    var existing = this.members.concat(this.destination_meshes).concat(
            this.destination_sites);

    if ( this.remove.indexOf(name) >= 0 ) {
        /*
         * in the remove list, which means it must be a current member that
         * was being removed, but is now being kept
         */
        this.styleAddedDestination(name);
        this.remove.splice(this.remove.indexOf(name), 1);
    } else if ( this.add.indexOf(name) >= 0 ) {
        /* in the add list, which means it is new and is now not being added */
        this.styleRemovedDestination(name);
        this.add.splice(this.add.indexOf(name), 1);
    } else if ( existing.indexOf(name) >= 0 ) {
        /* not in add or remove, but is existing - must be being removed */
        this.styleRemovedDestination(name);
        this.remove.push(name);
    } else {
        /* not in any list, so it was added, removed, and now added again */
        this.styleAddedDestination(name);
        this.add.push(name);
    }

    /* update submit button - we might be back in initial state after this */
    this.updateSubmitButtonState();
}



/*
 * Confirm or update the details of a test and add it to the database.
 * If this is a new test it will also add the initial endpoints, if this
 * is an updated test it will modify endpoints if they have been changed.
 */
AmpMemberModal.prototype.submit = function(ampname, category) {
    var requests = [];
    var modal = this;

    /* make a request to remove the desired membership */
    $.each(this.remove, function(index) {
        /* make sure the item to remove wasn't just added now */
        if ( modal.add.indexOf(modal.remove[index]) == -1 ) {
            var url;
            if ( category == "site" ) {
                url = API_URL + "/v2/sites/" + ampname + "/meshes/" +
                        encodeURIComponent(modal.remove[index])
            } else {
                url = API_URL + "/v2/meshes/" + ampname + "/sites/" +
                        encodeURIComponent(modal.remove[index])
            }

            requests.push($.ajax({
                type: "DELETE",
                url: url,
            }));
        }
    });


    /* make a request to add each new set of endpoints to the test */
    $.each(this.add, function(index) {
        /* make sure the item to add wasn't immediately removed */
        if ( modal.remove.indexOf(modal.add[index]) == -1 ) {
            var url;
            var data;
            if ( category == "site" ) {
                url = API_URL + "/v2/sites/" + ampname + "/meshes"
                data = {"mesh": modal.add[index]};
            } else {
                url = API_URL + "/v2/meshes/" + ampname + "/sites"
                data = {"site": modal.add[index]};
            }

            requests.push($.ajax({
                type: "POST",
                url: url,
                data: JSON.stringify(data),
                contentType: "application/json",
            }));
        }
    });

    /* wait for all outstanding requests and then close the modal when done */
    $.when.apply(this, requests).done(function() {
        $("#modal-foo").modal("hide");
        location.reload();
    });
}
