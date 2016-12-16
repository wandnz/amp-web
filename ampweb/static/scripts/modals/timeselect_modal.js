$(document).ready(function() {
    /*
     * XXX The "shown" event triggers once the modal is visible and any css
     * transitions have been completed, so why on earth do we have to wait
     * just a little bit longer for the form to actually appear and be
     * selectable with jquery?
     */
    $("#modal-timeselect").on("shown.bs.modal", function () {
        if (! graphPage.timemodal.shown ) {
            setTimeout(function() {
                graphPage.timemodal.setInitialDates();
                graphPage.timemodal.updateSubmitState();
                //graphPage.timemodal.shown = true;
            }, 600);
        }
    });
});

function TimeModal() {

}

TimeModal.prototype.shown = false;

TimeModal.prototype.setInitialDates = function() {

    /* Get current time period from URL */
    var current = parseURI();

    this.start = moment.unix(current['starttime']);
    this.start.startOf('day');

    this.end = moment.unix(current['endtime']);
    this.end.endOf('day');

    $('#pickerstart').data("DateTimePicker").date(this.start);
    $('#pickerend').data("DateTimePicker").date(this.end);

    $("#pickerstart").on("dp.change", function(e) {
        graphPage.timemodal.updateSubmitState();
    });
    $("#pickerend").on("dp.change", function(e) {
        graphPage.timemodal.updateSubmitState();
    });

};

TimeModal.prototype.submit = function() {
    var current = parseURI();
    var smom = $('#pickerstart').data("DateTimePicker").date();
    var emom = $('#pickerend').data("DateTimePicker").date();

    $("#modal-timeselect").modal('hide');
    graphPage.changeView(current['view'], smom.unix(), emom.unix());

};
TimeModal.prototype.updateSubmitState = function () {

    var s = $('#pickerstart').data("DateTimePicker").date();
    this.start = s;

    var e = $('#pickerend').data("DateTimePicker").date();
    this.end = e;

    $('#pickerend').data("DateTimePicker").minDate(s);
    $('#pickerstart').data("DateTimePicker").maxDate(e);

    if (this.start.isAfter(this.end)) {
        $("#submit").prop("disabled", true);
    } else {
        $("#submit").prop("disabled", false);
    }
};

// vim: set smartindent shiftwidth=4 tabstop=4 softtabstop=4 expandtab :
