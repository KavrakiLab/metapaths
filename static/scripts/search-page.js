$(function () {
    $('[data-toggle="popover"]').popover({container: 'body'});

    var alg_options = [{ id: 0, text: 'Hub Search' }, { id: 1, text: 'LPAT' }, { id: 2, text: 'MetaGraph' }];

    $('#algorithm').select2({data: alg_options});

    $.get("/get_compound_names").done(function(results_json) {
        var compound_names = format_compounds(JSON.parse(results_json));

        $('#start-compound').select2({
            data: compound_names,
            placeholder: "Select a start compound",
            allowClear: true
        });
        // Set an initial suggested value
        $('#start-compound').select2().val("C00668").trigger("change");

        $('#target-compound').select2({
            data: compound_names,
            placeholder: "Select a target compound",
            allowClear: true
        });
        // Set an initial suggested value
        $('#target-compound').select2().val("C01613").trigger("change");

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
            "text" : name_map[id] + " (" + id + ")"
        });
    }

    return formatted_names;

}

function search() {

    // If user selected hub search
    if ($("#algorithm").val() === "0") {
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
    } else if ($("#algorithm").val() === "1") {
    } else if ($("#algorithm").val() === "2") {
    } else {
        alert("Invalid algorithm selection.");
    }
}
