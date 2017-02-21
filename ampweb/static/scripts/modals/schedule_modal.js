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

function AmpScheduleModal() {
    AmpMemberModal.call(this);

    this.SCHEDULE_PERIOD_DAILY = 0;
    this.SCHEDULE_PERIOD_WEEKLY = 1;

    this.TEXT_ITEM = 0;
    this.RADIO_ITEM = 1;
    this.DROPDOWN_ITEM = 2;

    this.ampname = undefined;
    this.destination_meshes = [];
    this.destination_sites = [];
    this.schedule_args = undefined;

    /* minimum number of targets a test requires */
    this.min_targets = {
        "icmp": 1,
        "tcpping": 1,
        "dns": 1,
        "traceroute": 1,
        "throughput": 1,
        "http": 0,
        "udpstream": 1,
    };

    /* whether a test should allow a gap between mesh members running */
    this.test_gap = {
        "icmp": false,
        "tcpping": false,
        "dns": false,
        "traceroute": false,
        "throughput": true,
        "http": true,
        "udpstream": true,
    };

    /* each test uses some of the options, some are unique, some are shared */
    this.option_blocks = {
        "icmp": {
            "icmp_packet_size": ["-s", this.TEXT_ITEM],
        },
        "tcpping": {
            "tcpping_packet_size": ["-s", this.TEXT_ITEM],
            "tcpping_port_number": ["-P", this.TEXT_ITEM],
        },
        "dns": {
            "recursion": ["-r", this.RADIO_ITEM],
            "dns_query": ["-q", this.TEXT_ITEM],
            "dns_class": ["-c", this.DROPDOWN_ITEM],
            "dns_type": ["-t", this.DROPDOWN_ITEM],
            "payload_size": ["-z", this.TEXT_ITEM],
            "dnssec": ["-s", this.RADIO_ITEM],
            "nsid": ["-n", this.RADIO_ITEM],
        },
        "traceroute": {
            "traceroute_packet_size": ["-s", this.TEXT_ITEM],
            "ip_path": ["-b", this.RADIO_ITEM],
            "asn_path": ["-a", this.RADIO_ITEM],
        },
        "throughput": {
            "tput_control_port": [ "-p", this.TEXT_ITEM],
            "tput_data_port": [ "-P", this.TEXT_ITEM],
            "tput_duration": [ "-t", this.TEXT_ITEM ],
            "tput_direction": [ "-d", this.DROPDOWN_ITEM ],
        },
        "http": {
            "http_url": [ "-u", this.TEXT_ITEM],
            "http_cache": [ "-c", this.RADIO_ITEM],
            "http_pipeline": [ "-p", this.RADIO_ITEM],
        },
        "udpstream": {
            "udpstream_packet_size": [ "-z", this.TEXT_ITEM ],
            "udpstream_packet_spacing": [ "-D", this.TEXT_ITEM ],
            "udpstream_packet_count": [ "-n", this.TEXT_ITEM ],
            "udpstream_direction": [ "-d", this.DROPDOWN_ITEM ],
            "udpstream_control_port": [ "-p", this.TEXT_ITEM],
            "udpstream_data_port": [ "-P", this.TEXT_ITEM],
        },
    };
}

AmpScheduleModal.prototype = Object.create(AmpMemberModal.prototype);
AmpScheduleModal.prototype.constructor = AmpScheduleModal;


AmpScheduleModal.prototype.validateInteger = function(field, value) {
    if ( value == undefined || value.length == 0 ) {
        $(field).parent().removeClass("has-error");
        $(field).parent().removeClass("has-success");
        $(field).parent().addClass("has-warning");
    } else if ( isNaN(parseInt(value, 10)) || parseInt(value, 10) < 0 ) {
        $(field).parent().removeClass("has-warning");
        $(field).parent().removeClass("has-success");
        $(field).parent().addClass("has-error");
    } else {
        $(field).parent().removeClass("has-warning");
        $(field).parent().removeClass("has-error");
        $(field).parent().addClass("has-success");
    }

    this.updateSubmitButtonState();
}



AmpScheduleModal.prototype.validateDomain = function(field, value) {
    if ( value == undefined || value.length == 0 ) {
        $(field).parent().removeClass("has-error");
        $(field).parent().removeClass("has-success");
        $(field).parent().addClass("has-warning");
    } else if ( value.search(/[^.a-z0-9-]/) >= 0 ) {
        $(field).parent().removeClass("has-warning");
        $(field).parent().removeClass("has-success");
        $(field).parent().addClass("has-error");
    } else {
        $(field).parent().removeClass("has-warning");
        $(field).parent().removeClass("has-error");
        $(field).parent().addClass("has-success");
    }

    this.updateSubmitButtonState();
}



/*
 * Enable or disable the submit button depending on the validity of the
 * currently selected destination. To be valid, a destination must be
 * selected from the dropdown or a non-zero length name must be entered
 * in the text field.
 *
 * TODO: use the "modal" variable (or $("#modal-foo") here rather than "this"
 * so that this function can be called from the datetimepicker?
 */
AmpScheduleModal.prototype.updateSubmitButtonState = function() {
    var dst;
    var existing = this.destination_meshes.concat(this.destination_sites);

    /* a new test needs a valid destination to be given */
    if ( existing.length == 0 && $("#destination_block:visible").length > 0 ) {
        /* get whichever destination input is currently active */
        if ( this.getRadioValue("dest_type") == "destitem" ) {
            dst = this.getDropdownValue("destitem");
        } else {
            dst = this.getTextValue("deststring");
        }

        if ( dst.length == 0 || dst == "Select destination..." ||
                $(".has-warning").length > 0 || $(".has-error").length > 0 ) {
            $("#submit").prop("disabled", true);
        } else {
            $("#submit").prop("disabled", false);
        }

        return;
    }

    /* every visible text field needs to have content and not be an error */
    var empty = $("#test_options input:visible:text").filter(function(index) {
            return $(this).val().length == 0;
    });

    /*
     * If there are any errors, then that automatically disabled the submit
     * button. If there are no errors then for now we will just enable it -
     * some editing must have been done to call this function in the first
     * place (though we can't tell if it is all put back to default values).
     */
    if ( empty.length > 0 || $(".has-warning:visible").length > 0 ||
            $(".has-error:visible").length > 0 ) {
        $("#submit").prop("disabled", true);
    } else /*if ( this.add.length > 0 || this.remove.length > 0 )*/ {
        $("#submit").prop("disabled", false);
    }
}



/*
 * Enable the appropriate timepickers that are needed to describe the
 * schedule type that the user has selected.
 */
AmpScheduleModal.prototype.updateTimeOptions = function(schedule, cascade) {
    if ( schedule == "continuous" ) {
        /* continuous tests might need a start/offset time */
        $("#start_block").toggle(true);
        $("#startday_container").toggle(false);
        $("#end_block").toggle(false);
        $("#start_label").text("Start Offset");
    } else if ( schedule == "period" ) {
        /* and those with a fixed time period need both start and end */
        $("#start_block").toggle(true);
        $("#startday_container").toggle(true);
        $("#end_block").toggle(true);
        $("#start_label").text("Start");
    }

    /* perform further checking and update other parts of the page if needed */
    if ( cascade ) {
        this.updateSubmitButtonState();
    }
}



/*
 * Update the start and/or end day of the week, based on the other one
 * being changed. It ensures that if the test isn't running every day,
 * then it has both a valid start and end day.
 */
AmpScheduleModal.prototype.updateDayOptions = function(control, value, cascade){
    /*
     * set both options to "every day", or the specific day if one is changed
     * and the other is still on "every day"
     */
    if ( control == "startday" ) {
        if ( value == "all" || this.getDropdownValue("endday") == "all" ) {
            prettifySelect($("#endday").val(value), this.selectopts);
        }
    } else if ( control == "endday" ) {
        if ( value == "all" || this.getDropdownValue("startday") == "all" ) {
            prettifySelect($("#startday").val(value), this.selectopts);
        }
    }

    /* perform further checking and update other parts of the page if needed */
    if ( cascade ) {
        this.updateSubmitButtonState();
    }
}



/*
 * Enable all the input fields that are used to set test options for
 * the currently selected test. If this is the modification dialog
 * and test arguments are set, then use those as the initial values
 * rather than the defaults.
 */
AmpScheduleModal.prototype.updateTestOptions = function(test, cascade) {
    var options = $("#test_options");
    var active = this.option_blocks[test];
    var args = this.schedule_args ? this.schedule_args.split(" ") : undefined;
    var modal = this;

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
                            case modal.TEXT_ITEM: /* fall through */
                            case modal.DROPDOWN_ITEM:
                                value = args[args.indexOf(active[arg][0]) + 1];
                                break;
                            case modal.RADIO_ITEM: value = "true"; break;
                        };
                        modal.setInputValue(arg, active[arg], value);
                    } else if ( active[arg][1] == modal.RADIO_ITEM ) {
                        modal.setInputValue(arg, active[arg], "false");
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
    this.schedule_args = undefined;

    if ( this.min_targets[test] == 0 ) {
        $("#destination_block").toggle(false);
    } else {
        $("#destination_block").toggle(true);
    }

    /*
     * show the frequency gap option if the current test supports it and we
     * are not scheduling a test for a single site.
     */
    if ( this.test_gap[test] &&
            modal.getDropdownValue("source") != modal.ampname ) {
        $("#frequency_gap_block").toggle(true);
    } else {
        $("#frequency_gap_block").toggle(false);
    }

    /* perform further checking and update other parts of the page if needed */
    if ( cascade ) {
        this.updateSubmitButtonState();
    }
}



/*
 * Set the value of an input element.
 */
AmpScheduleModal.prototype.setInputValue = function(name, info, value) {
    var type = info[1];

    switch ( type ) {
        case this.TEXT_ITEM: this.setTextValue(name, value); break;
        case this.DROPDOWN_ITEM: this.setDropdownValue(name, value); break;
        case this.RADIO_ITEM: this.setRadioValue(name, value); break;
        default: break;
    };
}



/*
 * Set the value of a text input element.
 */
AmpScheduleModal.prototype.setTextValue = function(name, value) {
    $("#" + name).val(value);
}



/*
 * Set the value of a select/dropdown input element.
 */
AmpScheduleModal.prototype.setDropdownValue = function(name, value) {
    prettifySelect($("#" + name).val(value), this.selectopts);
}



/*
 * Set the value of a radiobutton input element.
 */
AmpScheduleModal.prototype.setRadioValue = function(name, value) {
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
AmpScheduleModal.prototype.getInputValue = function(name, info) {
    var value;
    var flag = info[0];
    var type = info[1];

    switch ( type ) {
        case this.TEXT_ITEM: value = this.getTextValue(name); break;
        case this.RADIO_ITEM:
            value = this.getRadioValue(name);
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
        case this.DROPDOWN_ITEM: value = this.getDropdownValue(name); break;
        default: return undefined;
    };

    return flag + " " + value;
}



/*
 * Calculate the frequency of a test in seconds, given a count and a type
 * of time unit.
 */
AmpScheduleModal.prototype.calculateFrequency = function(count, type) {
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
AmpScheduleModal.prototype.getOffsetSeconds = function(id, day) {
    var value = $('#' + id).data("DateTimePicker").date();
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
AmpScheduleModal.prototype.getSchedulePeriod = function(startday, endday) {
    if ( startday == "all" && endday == "all" ) {
        return this.SCHEDULE_PERIOD_DAILY;
    }
    return this.SCHEDULE_PERIOD_WEEKLY;
}



/*
 * Confirm or update the details of a test and add it to the database.
 * If this is a new test it will also add the initial endpoints, if this
 * is an updated test it will modify endpoints if they have been changed.
 */
AmpScheduleModal.prototype.submit = function(schedule_id) {
    var test = this.getDropdownValue("test");
    var freq = this.calculateFrequency(this.getTextValue("frequency_count"),
            this.getDropdownValue("frequency_type"));
    var mesh_offset;
    var start;
    var end;
    var period;
    var duration = this.getRadioValue("duration");
    var args = [];
    var requests = [];
    var existing = this.destination_meshes.concat(this.destination_sites);
    var modal = this;

    /* quickly check if all destinations are gone, we can delete the test */
    if ( schedule_id > 0 && modal.min_targets[test] > 0 &&
            modal.add.length == 0 && modal.remove.length == existing.length ) {
        var incomplete = 0;

        /* make sure all destinations are being removed */
        $.each(existing, function(index) {
            if ( modal.remove.indexOf(existing[index]) == -1 ) {
                incomplete = 1;
            }
        });

        /* if all destinations are being removed, remove the test instead */
        if ( !incomplete ) {
            modal.del(schedule_id);
            return;
        }
    }

    /* get the appropriate schedule timings */
    if ( duration == "continuous" ) {
        start = modal.getOffsetSeconds("datetimepicker_start", "all");
        end = 60 * 60 * 24;
        period = modal.SCHEDULE_PERIOD_DAILY;
    } else if ( duration == "period" ) {
        var startday = modal.getDropdownValue("startday");
        var endday = modal.getDropdownValue("endday");
        start = modal.getOffsetSeconds("datetimepicker_start", startday);
        end = modal.getOffsetSeconds("datetimepicker_end", endday);
        period = modal.getSchedulePeriod(startday, endday);
        /*
         * TODO
         * because of the way the weekly period works, we might need
         * to add two scheduled tests here if they cross the sunday.
         * Might want to do it when the schedule is generated rather than
         * here, so that it doesn't create two rows in the database.
         */
    } else {

    }

    /* use the inter-test gap between mesh members only if it is visible */
    if ( $("#frequency_gap_block:visible").length > 0 ) {
        mesh_offset = this.getTextValue("frequency_gap") || 0;
    } else {
        mesh_offset = 0;
    }

    /* get the value for every input field this test uses */
    $.each(modal.option_blocks[test], function(input) {
        var value = modal.getInputValue(input,modal.option_blocks[test][input]);
        if ( value != undefined ) {
            args.push(value);
        }
    });

    if ( schedule_id == 0 ) {
        var src = modal.getDropdownValue("source") || modal.ampname;
        var dst;

        /* get whichever destination input is currently active */
        if ( $("#destination_block:visible").length > 0 ) {
            if ( modal.getRadioValue("dest_type") == "destitem" ) {
                dst = modal.getDropdownValue("destitem");
            } else {
                dst = modal.getTextValue("deststring");
            }
        } else {
            dst = "";
        }

        /* send the request to add the test */
        requests.push($.ajax({
            type: "POST",
            url: API_URL + "/v2/sites/" + modal.doubleEscape(modal.ampname) +
                    "/schedule",
            data: JSON.stringify({
                "source": src,
                "destination": dst,
                "test": test,
                "frequency": freq,
                "start": start,
                "end": end,
                "period": period,
                "mesh_offset": mesh_offset,
                "args": args.join(" "),
            }),
            contentType: "application/json",
        }));

    } else {
        //XXX this is very similar to parts of the member submit function
        /* make a request to remove the desired endpoints from the test */
        $.each(modal.remove, function(index) {
            /* make sure the item to remove wasn't just added now */
            if ( modal.add.indexOf(modal.remove[index]) == -1 ) {
                requests.push($.ajax({
                    type: "DELETE",
                    url: API_URL + "/v2/sites/" +
                            modal.doubleEscape(modal.ampname) + "/schedule/" +
                            encodeURIComponent(schedule_id) + "/destinations/" +
                            modal.doubleEscape(modal.remove[index]),
                }));
            }
        });

        /* make a request to add each new set of endpoints to the test */
        $.each(modal.add, function(index) {
            /* make sure the item to add wasn't immediately removed */
            if ( modal.remove.indexOf(modal.add[index]) == -1 ) {
                requests.push($.ajax({
                    type: "POST",
                    url: API_URL + "/v2/sites/" +
                            modal.doubleEscape(modal.ampname) + "/schedule/" +
                            encodeURIComponent(schedule_id) + "/destinations",
                    data: JSON.stringify({"destination": modal.add[index]}),
                }));
            }
        });

        /* make the request to update test options/args/scheduling */
        requests.push($.ajax({
            type: "PUT",
            url: API_URL + "/v2/sites/" + modal.doubleEscape(modal.ampname) +
                    "/schedule/" + encodeURIComponent(schedule_id),
            data: JSON.stringify({
                "test": test,
                "frequency": freq,
                "start": start,
                "end": end,
                "period": period,
                "mesh_offset": mesh_offset,
                "args": args.join(" "),
            }),
            contentType: "application/json",
        }));
    }

    /* wait for all outstanding requests and then close the modal when done */
    $.when.apply(modal, requests).done(function() {
        $("#modal-foo").modal("hide");
        location.reload();
    });
}



/*
 * Delete a scheduled test entirely. Will cascade all the endpoints so they
 * get removed at the same time.
 */
AmpScheduleModal.prototype.del = function(schedule_id) {
    $.ajax({
        type: "DELETE",
        url: API_URL + "/v2/sites/" + modal.doubleEscape(modal.ampname) +
                "/schedule/" + encodeURIComponent(schedule_id),
        success: function() {
            $("#modal-foo").modal("hide")
            location.reload();
        }
    });
}
