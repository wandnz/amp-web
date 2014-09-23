var SCHEDULE_PERIOD_DAILY = 0;
var SCHEDULE_PERIOD_WEEKLY = 1;

var TEXT_ITEM = 0;
var RADIO_ITEM = 1;
var DROPDOWN_ITEM = 2;

var ampname;
var destination_meshes = [];
var destination_sites = [];
var schedule_args = undefined;
var add = [];
var remove = [];

/* each test uses some of the options, some are unique, some are shared */
var option_blocks = {
    "icmp": {
        "icmp_packet_size": ["-s", TEXT_ITEM],
    },
    "tcpping": {
        "tcpping_packet_size": ["-s", TEXT_ITEM],
        "tcpping_port_number": ["-P", TEXT_ITEM],
    },
    "dns": {
        "recursion": ["-r", RADIO_ITEM],
        "dns_query": ["-q", TEXT_ITEM],
        "dns_class": ["-c", DROPDOWN_ITEM],
        "dns_type": ["-t", DROPDOWN_ITEM],
        "payload_size": ["-z", TEXT_ITEM],
        "dnssec": ["-s", RADIO_ITEM],
        "nsid": ["-n", RADIO_ITEM],
    },
    "traceroute": {
        "traceroute_packet_size": ["-s", TEXT_ITEM],
        "ip_path": ["-b", RADIO_ITEM],
        "asn_path": ["-a", RADIO_ITEM],
    },
    "throughput": { },
    "http": { },
};



/*
 * Check the radio button beside the currently selected destination input
 * field, and enable/disable the add/submit buttons if the destination is
 * valid.
 */
function updateDestinations(which) {
    /* select the radio button for whichever input we have selected */
    $("[name=dest_type][value=" + which + "]").prop("checked", true);

    if ( document.getElementById("add") ) {
        updateAddButtonState();
    } else if ( document.getElementById("submit") ) {
        updateSubmitButtonState();
    }

}



/*
 * Enable or disable the submit button depending on the validity of the
 * currently selected destination. To be valid, a destination must be
 * selected from the dropdown or a non-zero length name must be entered
 * in the text field.
 */
function updateSubmitButtonState() {
    var dst;

    /* get whichever destination input is currently active */
    if ( getRadioValue("dest_type") == "destitem" ) {
        dst = getDropdownValue("destitem");
    } else {
        dst = getTextValue("deststring");
    }

    /* only enable the submit button if the destination is valid */
    if ( dst.length == 0 || dst == "Select destination..." ) {
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
function updateAddButtonState() {
    var meshes = destination_meshes;
    var sites = destination_sites;
    var dst;

    /* get whichever destination input is currently active */
    if ( getRadioValue("dest_type") == "destitem" ) {
        dst = getDropdownValue("destitem");
    } else {
        dst = getTextValue("deststring");
    }

    /* if destination is already there or is being added, disable button */
    if ( dst.length == 0 || dst == "Select destination..." ||
            add.indexOf(dst) != -1 || remove.indexOf(dst) != -1 ||
            meshes.indexOf(dst) != -1 || sites.indexOf(dst) != -1 ) {
        $("#add").prop("disabled", true);
    } else {
        $("#add").prop("disabled", false);
    }
}



/*
 * Enable the appropriate timepickers that are needed to describe the
 * schedule type that the user has selected.
 */
function updateTimeOptions(schedule) {
    if ( schedule == "continuous" ) {
        /* continuous tests might need a start/offset time */
        $("#start_block").toggle(true);
        $("#startday").toggle(false);
        $("#end_block").toggle(false);
        $("#start_label").text("Offset");
    } else if ( schedule == "period" ) {
        /* and those with a fixed time period need both start and end */
        $("#start_block").toggle(true);
        $("#startday").toggle(true);
        $("#end_block").toggle(true);
        $("#start_label").text("Start");
    }
}



/*
 * Update the start and/or end day of the week, based on the other one
 * being changed. It ensures that if the test isn't running every day,
 * then it has both a valid start and end day.
 */
function updateDayOptions(control, value) {
    if ( value == "all" ) {
        /* just set one option to "every day", set the other too */
        if ( control == "startday" ) {
            $("#endday > option:eq(0)").prop("selected", true);
        }

        if ( control == "endday" ) {
            $("#startday > option:eq(0)").prop("selected", true);
        }
    } else {
        /* set a specific day, set the other if it's still "every day" */
        if ( control == "startday" && getDropdownValue("endday") == "all" ) {
            $("#endday").val(value);
        }

        if ( control == "endday" && getDropdownValue("startday") == "all" ) {
            $("#startday").val(value);
        }
    }
}



/*
 * Enable all the input fields that are used to set test options for
 * the currently selected test. If this is the modification dialog
 * and test arguments are set, then use those as the initial values
 * rather than the defaults.
 */
function updateTestOptions(test) {
    var options = $("#test_options");
    var active = option_blocks[test];
    var args = schedule_args ? schedule_args.split(" ") : undefined;

    if ( active == undefined ) {
        return;
    }

    /* loop over all possible test options and enable the relevant ones */
    $.each($("div.form-group", options), function(opt) {
        if ( $(this).attr("id") != undefined ) {
            /* strip "_block" to find the name of the input item */
            var arg = $(this).attr("id").replace("_block", "");

            if ( active[arg] != undefined ) {
                /* enable this option if valid for this test */
                $(this).toggle(true);

                /* set the current value if modifying existing test */
                if ( args != undefined ) {
                    if ( args.indexOf(active[arg][0]) >= 0 ) {
                        var value;
                        switch ( active[arg][1] ) {
                            case TEXT_ITEM: /* fall through */
                            case DROPDOWN_ITEM:
                                value = args[args.indexOf(active[arg][0]) + 1];
                                break;
                            case RADIO_ITEM: value = "true"; break;
                        };
                        setInputValue(arg, active[arg], value);
                    } else if ( active[arg][1] == RADIO_ITEM ) {
                        setInputValue(arg, active[arg], "false");
                    }
                }
            } else {
                /* option wasn't found for this test, disable it */
                $(this).toggle(false);
            }
        }
    });

    /*
     * Unset schedule arguments if the user changes test, otherwise we can
     * get in trouble parsing one tests arguments for another test. If the
     * same input element is used between tests it will keep the value across
     * the change, but that's ok.
     */
    schedule_args = undefined;
}



/*
 * Set the value of an input element.
 */
function setInputValue(name, info, value) {
    var type = info[1];

    switch ( type ) {
        case TEXT_ITEM: setTextValue(name, value); break;
        case DROPDOWN_ITEM: setDropdownValue(name, value); break;
        case RADIO_ITEM: setRadioValue(name, value); break;
        default: break;
    };
}



/*
 * Set the value of a text input element.
 */
function setTextValue(name, value) {
    $("#" + name).val(value);
}



/*
 * Set the value of a select/dropdown input element.
 */
function setDropdownValue(name, value) {
    $("#" + name).val(value);
}



/*
 * Set the value of a radiobutton input element.
 */
function setRadioValue(name, value) {
    /* set the new selection */
    $("[name=" + name + "]").val([value]);

    /*
     * Add "active" class to new selection (which actually needs to go
     * on the label the radio button is inside!), and remove it from
     * the other buttons.
     */
    $("input:radio[name=" + name + "][value=" + value + "]").parent()
        .addClass("active").siblings().removeClass("active");
}



/*
 * Get the value from an input element.
 */
function getInputValue(name, info) {
    var value;
    var flag = info[0];
    var type = info[1];

    switch ( type ) {
        case TEXT_ITEM: value = getTextValue(name); break;
        case RADIO_ITEM:
            value = getRadioValue(name);
            /*
             * I guess it's possible a radio button isn't just
             * true or false, so set the flag if true, don't
             * set the flag if false, and set the flag with
             * the associated value if it's anything else.
             */
            if ( value == "true" ) {
                return flag;
            } else if ( value == "false" ) {
                return undefined;
            } break;
        case DROPDOWN_ITEM: value = getDropdownValue(name); break;
        default: return undefined;
    };

    return flag + " " + value;
}



/* XXX these get value functions are just copied from the other modal */
/*
 * Get the value of the named dropdown, or undefined if the value has not
 * been set yet (e.g. the dropdown is still disabled or a selection has yet
 * to be made).
 */
function getDropdownValue(name) {
    var value;
    if ( $("#" + name + " option:selected").val() == undefined ) {
        value = undefined;
    } else if ( $("#" + name + " option:selected").val() != this.marker ) {
        value = $.trim($("#" + name + " option:selected").val());
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
function getRadioValue(name) {
    var radval =  $("[name=" + name + "]:checked").val();
    if ( radval == undefined ) {
        return "";
    }
    return radval;
}



/*
 * Get the value of the named text input field.
 */
function getTextValue(name) {
    var value = $("#" + name).val();
    if ( value == undefined ) {
        return "";
    }
    return value;
}



/*
 * Calculate the frequency of a test in seconds, given a count and a type
 * of time unit.
 */
function calculateFrequency(count, type) {
    var mult;

    switch ( type ) {
        case "seconds": mult = 1; break;
        case "minutes": mult = 60; break;
        case "hours": mult = 60 * 60; break;
        case "days": mult = 60 * 60 * 24; break;
        default: mult = 1; break;
    };

    /* pick a vaguely sensible count if we somehow get rubbish data */
    if ( count == undefined || count < 1 ) {
        count = 60;
    }

    return count * mult;
}



/*
 * Get the number of seconds offset from the start of the measurement
 * period. Tests running every day are on the daily schedule, offset
 * from midnight, other tests use the weekly schedule, offset from
 * midnight Sunday morning.
 */
function getOffsetSeconds(id, day) {
    var value = $('#' + id).data("DateTimePicker").getDate();
    var base = moment(value);

    if ( day == "all" ) {
        /* offset relative to start of each day */
        base.startOf("day");
    } else {
        /* offset relative to start of the week */
        base.startOf("week");
        /* and set the day to the actual day, rather than default today */
        value.day(day);
    }
    return value.diff(base, "seconds");
}



/*
 * Determine the AMP schedule period to use, generally we want to use the
 * daily schedule, but need the weekly schedule if things are happening on
 * specific days.
 */
function getSchedulePeriod(startday, endday) {
    if ( startday == "all" && endday == "all" ) {
        return SCHEDULE_PERIOD_DAILY;
    }
    return SCHEDULE_PERIOD_WEEKLY;
}



/*
 * Add a new destination to a test. Calling this function only adds the
 * destination to a temporary list, which is not confirmed until the update
 * button is pressed.
 */
function addDestination() {
    var dst;

    /* get whichever destination input is currently active */
    if ( getRadioValue("dest_type") == "destitem" ) {
        dst = getDropdownValue("destitem");
    } else {
        dst = getTextValue("deststring");
    }

    /* add it to the temporary list of destinations to add */
    add.push(dst);

    /* show with a nice green name to mark it as new */
    $("#target_area").append("<p class='form-control-static'>" +
            "<span class='glyphicon glyphicon-remove' onclick='toggleRemoveDestination(\"" + dst + "\");'></span>" +
            "<span name='" + dst + "' style='color: green;'>&nbsp;" + dst + "</span>" +
            "</p>");

    /* disable the add button, because the destination is already there */
    updateAddButtonState();
}



/*
 * Remove a destination to a test. Calling this function only adds the
 * destination to a temporary list, which is not confirmed until the update
 * button is pressed.
 */
function toggleRemoveDestination(name) {
    if ( remove.indexOf(name) == -1 ) {
        /* destination is currently active, strikethrough and print it red */
        $("[name='" + name + "']").css("color", "red");
        $("[name='" + name + "']").css("text-decoration", "line-through");
        remove.push(name);
    } else {
        /* destination is already in the remove list, remove it */
        if ( add.indexOf(name) == -1 ) {
            /* destination was currently active, print it black again */
            $("[name='" + name + "']").css("color", "black");
        } else {
            /* destination was just added, print it green again */
            $("[name='" + name + "']").css("color", "green");
        }
        /* remove the strikethrough and remove from the list */
        $("[name='" + name + "']").css("text-decoration", "none");
        remove.splice(remove.indexOf(name), 1);
    }
}



/*
 * Confirm or update the details of a test and add it to the database.
 * If this is a new test it will also add the initial endpoints, if this
 * is an updated test it will modify endpoints if they have been changed.
 */
function submit(schedule_id) {
    var test = getDropdownValue("test");
    var freq = calculateFrequency(getTextValue("frequency_count"),
            getDropdownValue("frequency_type"));
    var start;
    var end;
    var period;
    var duration = getRadioValue("duration");
    var args = [];
    var requests = [];
    var existing = destination_meshes.concat(destination_sites);

    /* quickly check if all destinations are gone, we can delete the test */
    if ( schedule_id > 0 && add.length == 0 &&
            remove.length == existing.length ) {
        var incomplete = 0;

        /* make sure all destinations are being removed */
        $.each(existing, function(index) {
            if ( remove.indexOf(existing[index]) == -1 ) {
                incomplete = 1;
            }
        });

        /* if all destinations are being removed, remove the test instead */
        if ( !incomplete ) {
            del(schedule_id);
            return;
        }
    }

    /* get the appropriate schedule timings */
    if ( duration == "continuous" ) {
        start = getOffsetSeconds("datetimepicker_start", "all");
        end = 60 * 60 * 24;
        period = SCHEDULE_PERIOD_DAILY;
    } else if ( duration == "period" ) {
        var startday = getDropdownValue("startday");
        var endday = getDropdownValue("endday");
        start = getOffsetSeconds("datetimepicker_start", startday);
        end = getOffsetSeconds("datetimepicker_end", endday);
        period = getSchedulePeriod(startday, endday);
        /*
         * TODO
         * because of the way the weekly period works, we might need
         * to add two scheduled tests here if they cross the sunday.
         * Might want to do it when the schedule is generated rather than
         * here, so that it doesn't create two rows in the database.
         */
    } else {

    }

    /* get the value for every input field this test uses */
    $.each(option_blocks[test], function(input) {
        var value = getInputValue(input, option_blocks[test][input]);
        if ( value != undefined ) {
            args.push(value);
        }
    });

    /* turn the args array into a string */
    args = btoa(args.join(" "));

    if ( schedule_id == 0 ) {
        var src = getDropdownValue("source");
        var dst;

        /* get whichever destination input is currently active */
        if ( getRadioValue("dest_type") == "destitem" ) {
            dst = getDropdownValue("destitem");
        } else {
            dst = getTextValue("deststring");
        }

        /* send the request to add the test */
        requests.push($.ajax({
            url: "/api/_schedule/add/" + test + "/" + src + "/" + dst + "/" +
                freq + "/" + start + "/" + end + "/" + period + "/" + args,
        }));

    } else {
        /* make a request to remove the desired endpoints from the test */
        $.each(remove, function(index) {
            /* make sure the item to remove wasn't just added now */
            if ( add.indexOf(remove[index]) == -1 ) {
                requests.push($.ajax({
                    url: "/api/_schedule/endpoint/delete/" + schedule_id +
                        "/" + ampname + "/" + remove[index]
                }));
            }
        });

        /* make a request to add each new set of endpoints to the test */
        $.each(add, function(index) {
            /* make sure the item to add wasn't immediately removed */
            if ( remove.indexOf(add[index]) == -1 ) {
                requests.push($.ajax({
                    url: "/api/_schedule/endpoint/add/" + schedule_id +
                        "/" + ampname + "/" + add[index]
                }));
            }
        });

        /* make the request to update test options/args/scheduling */
        requests.push($.ajax({
            url: "/api/_schedule/update/" + schedule_id + "/" + test + "/" +
                freq + "/" + start + "/" + end + "/" + period + "/" + args,
        }));
    }

    /* wait for all outstanding requests and then close the modal when done */
    $.when.apply(this, requests).done(function() {
        $("#modal-foo").modal("hide");
    });
}



/*
 * Delete a scheduled test entirely. Will cascade all the endpoints so they
 * get removed at the same time.
 */
function del(schedule_id) {
    $.ajax({
        url: "/api/_schedule/delete/" + schedule_id,
        success: $("#modal-foo").modal("hide")
    });
}
