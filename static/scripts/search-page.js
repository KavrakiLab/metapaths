$(function () {
    $('[data-toggle="popover"]').popover({container: 'body'});

    $.get("/get_compound_names").done(function(results_json) {
        var compound_names = format_compounds(JSON.parse(results_json));

        $('#start-compound').select2({
            data: compound_names,
            placeholder: "Select a start compound",
            allowClear: true
        });
        $('#target-compound').select2({
            data: compound_names,
            placeholder: "Select a target compound",
            allowClear: true
        });
    }).fail(function(error) {
        console.log(error);
        alert("An error occured, please refresh the page to try again.");
    });

});

function upload() {
    location.assign("/visualize");
}

function load_search(search_id) {
    localStorage.setItem("search_id", search_id);
    location.assign("/visualize");
}

function format_compounds(name_map) {
    var formatted_names = [];

    for (var id in name_map) {
        formatted_names.push({
            "id" : id,
            "text" : name_map[id]
        });
    }

    return formatted_names;

}

function search() {

    if ($("#algorithm").val() === "Hub Search") {
        var query = {
            "start" : $("#start-compound").val(),
            "target" : $("#target-compound").val(),
            "atoms" : parseInt($("#num-atoms").val()),
            "reversible" : $("#allow-reversible").is(":checked")
        }
        console.log("Search query", query);

        $.ajax({
            url: "/hub_search",
            data: query,
            success: function(response) {
                var search_id = JSON.parse(response)["search_id"];

                var results_url = window.location.href + "visualize/" + search_id;

                // alert("");

                var alert_html = "<br><div class='alert alert-success alert-dismissible' role='alert'>";
                alert_html += "<button type='button' class='close' data-dismiss='alert' aria-label='Close'> <span aria-hidden='true'>&times;</span></button>"
                alert_html += "Your pathway search has been submitted. The results can be viewed at this link: <a href='" + results_url + "'>" + results_url + "</a>"
                alert_html += "<div>"

                $("#alert-location").html(alert_html);

            }
        });
    }
}
