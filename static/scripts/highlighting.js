
function initialize_search_panel() {
    // Enable select menu
    $('#compounds-dropdown').select2({
        data: get_compounds_list(),
        placeholder: "Start typing or click to select an item",
        allowClear: true
    });

    $('#compounds-dropdown').on("select2:select", function(e){
        var selected_val = $('#compounds-dropdown').select2().val();
        highlight(selected_val);
    });

    $('#compounds-dropdown').on("select2:selecting", function(e){
        var unselected_val = $('#compounds-dropdown').select2().val();
        if (unselected_val != null) {
            remove_highlight(unselected_val);
        }
    });

    // Initially no value is selected
    clear_search();
}


function highlight(hl_element) {
    // TODO: need a better way to check this, could be an organism that starts with C
    if (hl_element.startsWith('C')) {
        $("#" + hl_element)[0].style.stroke = "#ff997c";
        $("#" + hl_element)[0].style.strokeWidth = "7px";
    }
}

function remove_highlight(hl_element) {
    // TODO: need a better way to check this, could be an organism that starts with C
    if (hl_element.startsWith('C')) {
        if ($("#" + hl_element).length > 0) {
            $("#" + hl_element)[0].style.stroke = "";
            $("#" + hl_element)[0].style.strokeWidth = "3px";
        }
    }
}

function get_compounds_list() {
    var items = []

    d3.selectAll("circle").data().forEach(function(node) {
        items.push({"id" : node.id, "text" : kegg_data[node.id].name})
    });

    return items;
}


function clear_search() {
    var selected_val = $('select').select2().val();
    if (selected_val != null) {
        remove_highlight(selected_val)
    }
    $('select').select2().val(null).trigger("change");
}
