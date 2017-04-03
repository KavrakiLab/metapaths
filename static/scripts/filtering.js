Set.prototype.intersection = function(setB) {
    var intersection = new Set();
    for (var elem of setB) {
        if (this.has(elem)) {
            intersection.add(elem);
        }
    }
    return intersection;
}


function add_excluded_node(compound_id) {
    var existing = $("#excluded-ids").val();
    if(existing === "") {
        $("#excluded-ids").val(compound_id)
    } else {
        $("#excluded-ids").val(existing + "," + compound_id)
    }
}


function add_included_node(compound_id) {
    var existing = $("#included-ids").val();
    if(existing === "") {
        $("#included-ids").val(compound_id)
    } else {
        $("#included-ids").val(existing + "," + compound_id)
    }
}


function apply_filters() {
    var filtered_main_pathways = filter_pathways(JSON.stringify(json_pathways["info"]), JSON.stringify(json_pathways["pathways"]));
    if (filtered_main_pathways === 0) {
        alert("There are no pathways that meet the specified filtering criteria, please adjust the filters.");
    } else {
        validate_and_visualize(filtered_main_pathways);
    }

    filter_all_hubs();
}

function filter_pathways(str_info, str_pathways) {
    var filtered_pathways = {};
    filtered_pathways["info"] = JSON.parse(str_info);
    filtered_pathways["pathways"] = JSON.parse(str_pathways);

    // First pass: remove pathways which contain an excluded compound
    if ($("#excluded-ids").val() !== "") {
        var excluded = new Set($("#excluded-ids").val().split(","));

        for (var i = filtered_pathways.pathways.length - 1; i >= 0; i--) {
            // Iterate in reverse so that we can remove elements with out worrying about indices changing
            var pathway = filtered_pathways.pathways[i];
            var node_intersect = new Set(pathway.nodes).intersection(excluded);
            var hub_node_intersect = new Set(pathway.hub_nodes).intersection(excluded);

            // If the pathway contains any of the excluded compounds, remove it
            if (node_intersect.size > 0 || hub_node_intersect.size > 0) {
                filtered_pathways.pathways.splice(i, 1);
            }
        }
    }

    // Second pass: remove pathways that don't contain all of the included compounds
    if ($("#included-ids").val() !== "") {
        var included = new Set($("#included-ids").val().split(","));

        for (var i = filtered_pathways.pathways.length - 1; i >= 0; i--) {
            // Iterate in reverse so that we can remove elements with out worrying about indices changing
            var pathway = filtered_pathways.pathways[i];
            var nodes = new Set([...pathway.nodes, ...pathway.hub_nodes]);
            var included_intersect = nodes.intersection(included);

            // If pathway doesn't contain all of the included compounds, remove it
            if (included_intersect.size !== included.size) {
                filtered_pathways.pathways.splice(i, 1);
            }
        }
    }

    if ($("#max-path-len").val() !== "") {
        var max_path_len = parseInt($("#max-path-len").val());

        for (var i = filtered_pathways.pathways.length - 1; i >= 0; i--) {
            // Iterate in reverse so that we can remove elements with out worrying about indices changing
            var pathway = filtered_pathways.pathways[i];
            var path_len = pathway.links.length + pathway.hub_links.length;

            if (path_len > max_path_len) {
                filtered_pathways.pathways.splice(i, 1);
            }
        }
    }

    return filtered_pathways;
}

function filter_all_hubs() {

}

function reset_filters() {
    $("#excluded-ids").val("");
    $("#included-ids").val("");
    validate_and_visualize(json_pathways);
}
