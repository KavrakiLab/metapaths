
function initialize_search_panel() {
    // TODO: should we fetch nicely formatted results from the server?
    var dropdown_data = format_dropdown_data();

    // Enable select menu
    $('select').select2({
        data: dropdown_data,
        placeholder: "Start type or select an item",
        allowClear: true
    });

    $('select').on("select2:select", function(){
        var selected_val = $('select').select2().val();
        console.log(selected_val);
    });


    // Initially no value is selected
    clear_search();
}

function format_dropdown_data() {
    var data = [];
    for (var id in kegg_data) {
        data.push({"id" : id, "text" : kegg_data[id].name});
    }
    return data;
}


function clear_search() {
    $('select').select2().val(null).trigger("change");
}
