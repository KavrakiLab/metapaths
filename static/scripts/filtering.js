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
    // Always apply filters to a fresh copy of the original pathways
    var filtered_main_pathways = filter_pathways(JSON.stringify(orig_pathways["info"]), JSON.stringify(orig_pathways["pathways"]), JSON.stringify(orig_pathways["background_hubs"]));

    if (filtered_main_pathways.pathways.length === 0) {
        alert("There are no pathways that meet the specified filtering criteria, please adjust the filters.");
        return;
    } else {
        main_pathways = filtered_main_pathways;
    }

    filter_all_hubs();

    if (shown_hub !== "") {
        load_hub_viz(extract_hub_data_graph(hub_pathways[shown_hub]));
    } else {
        validate_and_visualize(main_pathways);
    }
}

function filter_pathways(str_info, str_pathways, background_hubs) {
    var filtered_pathways = {};
    filtered_pathways["info"] = JSON.parse(str_info);
    filtered_pathways["pathways"] = JSON.parse(str_pathways);
    filtered_pathways["background_hubs"] = background_hubs;
    console.log(background_hubs);

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
            var path_len = pathway.links.length + pathway.hub_len;

            if (path_len > max_path_len) {
                filtered_pathways.pathways.splice(i, 1);
            }
        }
    }

    if ($("#min-carbons-conserved").val() !== "") {
        var min_carbons = parseInt($("#min-carbons-conserved").val());

        for (var i = filtered_pathways.pathways.length - 1; i >= 0; i--) {
            // Iterate in reverse so that we can remove elements with out worrying about indices changing
            var pathway = filtered_pathways.pathways[i];
            var num_carbons = pathway.atoms.length;
            console.log("Number of carbons conserved in path: " + num_carbons);

            if (num_carbons < min_carbons) {
                filtered_pathways.pathways.splice(i, 1);
            }
        }
    }

    if ($("#min-atp-used").val() !== "") {
        var min_atp = parseInt($("#min-atp-used").val());

        for (var i = filtered_pathways.pathways.length - 1; i >= 0; i--) {
            // Iterate in reverse so that we can remove elements with out worrying about indices changing
            var pathway = filtered_pathways.pathways[i];
            var atp_used = pathway.atp;
            console.log("Number of atp used in path: " + atp_used);

            if (atp_used < min_atp) {
                filtered_pathways.pathways.splice(i, 1);
            }
        }
    }

    return filtered_pathways;
}

function filter_all_hubs() {
    for (var hub_link_id in hub_pathways) {
        var filtered = filter_pathways(
            JSON.stringify(hub_pathways[hub_link_id].info),
            JSON.stringify(hub_pathways[hub_link_id].pathways)
        );
        hub_pathways[hub_link_id] = filtered;
    }
}

function reset_filters() {
    if (confirm("Are you sure you want to reset the visualization? All filters will be lost!")) {
        if (shown_hub !== "") {
            close_hub_view();
        }
        $("#excluded-ids").val("");
        $("#included-ids").val("");
        main_pathways = JSON.parse(JSON.stringify(orig_pathways));
        hub_pathways = JSON.parse(JSON.stringify(orig_hub_pathways));
        validate_and_visualize(main_pathways);
    }
}
