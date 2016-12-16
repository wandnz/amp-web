
RatingModal.prototype.shown = false;
function RatingModal() {
    this.lastreasons = null;
    this.setInitialState();
}

RatingModal.prototype.getRating = function() {
    var radval = $("[name=raw_rating]:checked").val()
    return radval;

}

var goodreasons = [
        ['bigimpact', "Event indicates a major change or outage on the network."],
        ['goodsource', "Event affects customers that I care about."],
        ['goodtarget', "Event affects a target that is important to our customers."],
        ['insight', "Event provided useful insight into regular network behaviour."]
];
var badreasons = [
        ['toooften', "Event occurs so often that I've stopped caring."],
        ['noimpact', "Impact of the event is too small to concern me."],
        ['badsource', "Event doesn't affect a source that I care about."],
        ['badtarget', "Event doesn't affect a target that I care about."],
        ['tooshort', "Event duration is too short."],
        ['toodelayed', "Alert appeared too long after the event started."],
        ['badgroup', "This event doesn't belong in the event group it appears in."]
];

RatingModal.prototype.showReasons = function(goodorbad) {

    var r;

    if (goodorbad == this.lastreasons) {
        $("#reasons").show();
        return;
    }


    $('#select_reasons').empty();
    $('#select_reasons').prop('disabled', false);
    $('#freeform_reasons').prop('disabled', false);

    $('#select_reasons').append("<option value=\"noreason\">Select a pre-defined reason...</option");
    //$('#select_reasons > option:first').prop("disabled", true);


    if (goodorbad == "good")
        r = goodreasons;
    else
        r = badreasons;

    $.each(r, function(index, value) {
        $("<option value=\"" + value[0] + "\">" + value[1] + "</option>").appendTo("#select_reasons");
    });

    prettifySelect($("#select_reasons"));
    this.lastreasons = goodorbad;

    $("#reasons").show();
}

RatingModal.prototype.hideReasons = function() {
    this.lastreasons = null;
    $("#reasons").hide();

}

RatingModal.prototype.setInitialState = function() {
    if (!this.getRating()) {
        $("#reasons").hide();
    }
    this.shown = true;
    $('[data-toggle="tooltip"]').tooltip();
}


RatingModal.prototype.submit = function(streamid, eventid) {

    var rating = this.getRating();
    var postobj;

    $("#modal-rateevent").modal('hide');
    this.lastreasons = null;

    if (!rating)
        return;

    postobj = { 'eventid': eventid, 'rating': rating, 'streamid': streamid };

    if (rating != "wrong") {
        postobj['reasondrop'] = $('#select_reasons').val();
        postobj['reasonfree'] = $('#freeform_reasons').val();
    }

    $.post( API_URL + "/_event/rating/", postobj)
        .done(function(data) {})
        .fail(function(data) {
            displayAjaxAlert("Failed to send feedback to server. Please report to your amp-web administrator.");
        });

}

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
