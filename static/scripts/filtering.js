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
    var excluded = new Set($("#excluded-ids").val().split(","));
    console.log(excluded);
    console.log(json_pathways);

    var filtered_pathways = {};
    filtered_pathways["info"] = JSON.parse(JSON.stringify(json_pathways["info"]));
    filtered_pathways["pathways"] = []


    var temp = [];
    // First pass: exclude pathways which contain an excluded compound
    json_pathways["pathways"].forEach(function(pathway) {
        var node_intersect = new Set(pathway.nodes).intersection(excluded);
        var hub_node_intersect = new Set(pathway.hub_nodes).intersection(excluded);

        // If pathway doesn't contain any of the excluded compounds, keep it
        if (node_intersect.size === 0 && hub_node_intersect.size === 0) {
            temp.push(JSON.parse(JSON.stringify(pathway)));
        }
    });
    console.log(json_pathways);
    console.log(temp);

    if ($("#included-ids").val() !== "") {
        var included = new Set($("#included-ids").val().split(","));
        console.log("asdf");
        // Second pass: remove any pathways that don't include any of the included compounds
        temp.forEach(function(pathway) {
            var node_intersect = new Set(pathway.nodes).intersection(included);
            var hub_node_intersect = new Set(pathway.hub_nodes).intersection(included);

            // If pathway contains all of the included compounds, keep it
            if (node_intersect.size + hub_node_intersect.size === included.size) {
                filtered_pathways["pathways"].push(pathway);
            }
        });
    } else {
        filtered_pathways["pathways"] = temp;
    }

    console.log(filtered_pathways);
    if (filtered_pathways.pathways.length === 0) {
        alert("There are no pathways that meet the specified filtering criteria, please adjust the filters.");
    } else {
        validate_and_visualize(filtered_pathways);
    }
}


function reset_filters() {
    $("#excluded-ids").val("");
    $("#included-ids").val("");
    validate_and_visualize(json_pathways);
}
