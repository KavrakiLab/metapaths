import re
import os
from flask import jsonify

def generate_LPAT_config(start, start_name, target, target_name, carbon_track, allow_reversible, search_id):

    config = "DBHOST\tlocalhost\n"
    config += "DBPORT\t3306\n"
    config += "DBNAME\tMetaDB_2015\n"
    config += "DBUSER\tMetaDBUser\n"
    config += "DBPASS\tmeta\n"
    config += "MOLDIR\tsearches/rpair_mol\n"
    config += "RPAIRDIR\tsearches/rpair_only_maps\n"
    config += "REACTIONDIR\tsearches/rpair_maps\n"
    config += "K\t1000000\n"
    config += "USEREVERSE\t1\n"
    config += "STARTCID\t" + start + "\n"
    config += "TARGETCID\t" + target + "\n"
    config += "CARBONTRACK\t" + carbon_track + "\n"
    config += "PERCENTCARBON\t1.0\n"
    config += "WEIGHTTYPE\tWEIGHT_OF_ONE\n"

    output_loc = "searches/output/" + search_id + "|" + start_name + " (" + start + ")|" + target_name + " (" + target + ")|" + "LPAT.txt"
    output_loc = output_loc.replace(" ", "_")
    config += "OUTPUTDIR\t"+ output_loc + "\n"

    input_loc = write_config_file(search_id, config)
    print config
    return input_loc, output_loc

def generate_hub_config(start, start_name, target, target_name, carbon_track, allow_reversible,
        search_id, selected_hub_compounds, hub_db):

    config = "DBHOST\tlocalhost\n"
    config += "DBPORT\t3306\n"
    config += "DBNAME\tMetaDB_2015\n"
    config += "DBUSER\tMetaDBUser\n"
    config += "DBPASS\tmeta\n"
    config += "MOLDIR\tsearches/rpair_mol\n"
    config += "RPAIRDIR\tsearches/rpair_only_maps\n"
    config += "REACTIONDIR\tsearches/rpair_maps\n"
    config += "K\t1000000\n"
    config += "USEREVERSE\t1\n"
    config += "STARTCID\t" + start + "\n"
    config += "TARGETCID\t" + target + "\n"
    config += "CARBONTRACK\t" + carbon_track + "\n"
    config += "PERCENTCARBON\t1.0\n"
    config += "WEIGHTTYPE\tWEIGHT_OF_ONE\n"
    config += "HUBTABLE\tsearches/" + hub_db + "\n"
    config += "IGNORE_CMPD\t" + ",".join(selected_hub_compounds) + "\n"

    output_loc = "searches/output/" + search_id + "|" + start_name + " (" + start + ")|" + target_name + " (" + target + ")|" + "Hub|" + hub_db + ".txt"
    output_loc = output_loc.replace(" ", "_")
    config += "OUTPUTDIR\t"+ output_loc + "\n"
#    config += "USEHUBTABLE\t1\n"
#    config += "HUBS\t" + ",".join(selected_hub_compounds)


    input_loc = write_config_file(search_id, config)
    return input_loc, output_loc


#
# Helpers
#

def write_config_file(search_id, config):
    config_loc = "searches/input/" + search_id + ".txt"

    config_file = open(config_loc, 'w')
    config_file.write(config)
    config_file.close()

    return config_loc

def get_canonical_cmpds(goal):
    filename = "searches/canonical_pathways/" + goal + ".txt"
    if os.path.isfile(filename):
        canonical_cmpds_file = open(filename, "r")
        canonical_paths = canonical_cmpds_file.readlines()
        canonical_cmpds = []
        if canonical_paths != None:
            for canonical_path in canonical_paths:
                cmpd_pairs = re.findall("C[0-9]{5}-C[0-9]{5}",canonical_path)
                canonical_cmpds.append(cmpd_pairs)
            return canonical_cmpds
    return None


def extract_pathways(string_pathways, background_hubs_filename, hub_db):
    pathways = []
    all_hub_nodes = set([])
    all_hub_links = []
    # Finds compound IDs by extracting words that start with the letter 'C'
    regex = re.compile("C\w+")
    regex2 = re.compile("RP[0-9]{5}")

    start = None
    goal = None
    hubs_exist = False

    for string_path in string_pathways:
        if string_path == "":
            continue
        atp_used = 0
        hub_len = 0
        tab_split_path = string_path.split("\t")
        carbons_conserved = []
        if len(tab_split_path) > 1:
            carbons_conserved = re.findall("[0-9]+=[0-9]+", tab_split_path[-1])
        if len(tab_split_path) == 3:
            atp_used = int(tab_split_path[-2])
        if len(tab_split_path) == 4:
            hub_len = tab_split_path[1]
        path_compounds = regex.findall(string_path)
        path_rpairs = regex2.findall(string_path)
        #print path_compounds
        #print path_rpairs
        nodes = set([])
        links = []
        hub_nodes = set([])
        hub_links = []

        if start == None and goal == None:
            start = path_compounds[0]
            goal = path_compounds[-1]

        rpair_idx = 0
        for i in range(len(path_compounds) - 1):
            j = i + 1
            if ("_HS" in path_compounds[i] and "_HE" in path_compounds[j]) or ("_HS" in path_compounds[i] and "_HM" in path_compounds[j])  or ("_HM" in path_compounds[i] and "_HM" in path_compounds[j]) or ("_HM" in path_compounds[i] and "_HE" in path_compounds[j]):
                hubs_exist = True
                hub_nodes.add(path_compounds[i])
                hub_nodes.add(path_compounds[j])
                hub_links.append(path_compounds[i][0:6] + "-" + path_compounds[j][0:6])
            else:
                links.append(path_compounds[i][0:6] + "-" + path_compounds[j][0:6] + ":" + path_rpairs[rpair_idx])
                rpair_idx += 1

        pathway = {}
        pathway["atoms"] = carbons_conserved # TODO: actually calculate this
        pathway["atp"] = atp_used
        pathway["nodes"] = [node[0:6] for node in (set(path_compounds) - hub_nodes)]
        pathway["links"] = list(links)
        pathway["hub_nodes"] = [hub_node[0:6] for hub_node in hub_nodes]
        pathway["hub_links"] = list(hub_links)
        pathway["hub_len"] = int(hub_len)
        #pathway["canonical"] = is_pathway_canonical(path_compounds, start, goal)
        pathways.append(pathway)
        if(hubs_exist):
            all_hub_links = all_hub_links + hub_links

        canonical_paths = get_canonical_cmpds(goal)
        canonical_links = set([])
        canonical_cmpds = set([])
        if canonical_paths != None:
            for canonical_cmpd_pairs in canonical_paths:
                canonical_links = set(canonical_cmpd_pairs) | canonical_links
                for canonical_cmpd_pair in canonical_cmpd_pairs:
                    cmpds = canonical_cmpd_pair.split("-")
                    canonical_cmpds.add(cmpds[0])
                    canonical_cmpds.add(cmpds[1])

        canonical_links = list(canonical_links)
        canonical_cmpds = list(canonical_cmpds)

    pathways_data = {
        "info" : {
            "start" : start,
            "goal" : goal,
            "canonical_nodes" : canonical_cmpds,
            "canonical_links" : canonical_links,
            },
        "hub_db" : hub_db,
        "pathways" : pathways,
    }

    # If this is a hub search, add in the rest of the hubs
    if(hubs_exist):
        #pathways_data["background_hubs"] = get_background_hubs_from_file(background_hubs_filename, set(all_hub_links))
        pathways_data["background_hubs"] = get_background_hubs_from_file(background_hubs_filename)

    return pathways_data

# def get_background_hubs_from_file(background_hubs_filename, all_hub_links):
#     b_hubs_file = open(background_hubs_filename, "r")
#     b_nodes = {}
#     b_links = []
#     on_links = False
#     for line in b_hubs_file:
#         line.replace("\n", "")
#         if not on_links:
#             if "LINKS" not in line:
#                 node_info = line.split(",")
#                 b_nodes[node_info[0]] = (float(node_info[1]), float(node_info[2]))
#             else:
#                 on_links = True
#         else:
#             if(line not in all_hub_links):
#                 b_links.append(line.replace("\r","").replace("\n",""))

#     return { "b_nodes" : b_nodes, "b_links" : b_links }

def get_background_hubs_from_file(background_hubs_filename):
    b_hubs_file = open(background_hubs_filename, "r")
    return b_hubs_file.read().split("\n")


def get_pathways_from_file(pathways_filename, background_hubs_filename, hub_db):
    pathways_file = open(pathways_filename, "r")
    return extract_pathways(pathways_file.readlines(), background_hubs_filename, hub_db)


def hub_paths_to_json(hub_src, hub_dst, hub_db, string_hub_pathways):
    pathways = []

    # Finds compound IDs by extracting words that start with the letter 'C'
    regex = re.compile("C\w+")

    for string_path in string_hub_pathways:
        path_compounds = regex.findall(string_path[0])

        links = []
        for i in range(len(path_compounds) - 1):
            j = i + 1
            links.append(path_compounds[i] + "," + path_compounds[j])

        pathway = {}
        pathway["atoms"] = 0 # TODO: actually calculate this
        pathway["nodes"] = path_compounds
        pathway["links"] = links

        # Empty list since hub pathways don't contain hubs themselves
        pathway["hub_links"] = []
        pathway["hub_nodes"] = []

        pathways.append(pathway)


    hub = {
        "info" : {"source" : hub_src, "target" : hub_dst},
	   "hub_db" : hub_db,
        "pathways" : pathways
    }
    return jsonify(hub)


def remove_input_file(search_id):
    os.remove("searches/input/" + search_id + ".txt")
