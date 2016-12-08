function enable_test(source, schedule_id) {
    $.ajax({
        type: "PUT",
        url: API_URL + "/v2/sites/" +
                encodeURIComponent(encodeURIComponent(source)) +
                "/schedule/" + encodeURIComponent(schedule_id) + "/status",
        data: JSON.stringify({"status": "enable"}),
        contentType: "application/json",
        success: function() {
            location.reload();
        }
    });
}


function disable_test(source, schedule_id) {
    $.ajax({
        type: "PUT",
        url: API_URL + "/v2/sites/" +
                encodeURIComponent(encodeURIComponent(source)) +
                "/schedule/" + encodeURIComponent(schedule_id) + "/status",
        data: JSON.stringify({"status": "disable"}),
        contentType: "application/json",
        success: function() {
            location.reload();
        }
    });
}


function sign_certificate(name) {
    $.ajax({
        type: "POST",
        url: API_URL + "/v2/certificates/" +
                encodeURIComponent(encodeURIComponent(name)),
        success: function() {
            location.reload();
        },
        error: function() {
            location.reload();
        }
    });
}


function revoke_certificate(name) {
    $.ajax({
        type: "DELETE",
        url: API_URL + "/v2/certificates/" +
                encodeURIComponent(encodeURIComponent(name)),
        success: function() {
            location.reload();
        },
        error: function() {
            location.reload();
        }
    });
}
