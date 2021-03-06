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
        search_id, hub_list, hub_db):

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
    config += "IGNORE_CMPD\t" + hub_list_file + "\n"
    config += "NUMCLOSESTHUBS\t3\n"
    config += "HUBSEARCHDEPTH\t2\n"
    config += "MAXRXNINHUBPATH\t15\n"

    output_loc = "searches/output/" + search_id + "|" + start_name + " (" + start + ")|" + target_name + " (" + target + ")|" + "Hub.txt"
    output_loc = output_loc.replace(" ", "_")
    config += "OUTPUTDIR\t"+ output_loc + "\n"

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


def extract_pathways(string_pathways, background_hubs_filename, hub_db):
    pathways = []
    all_hub_nodes = set([])
    all_hub_links = []
    # Finds compound IDs by extracting words that start with the letter 'C'
    regex = re.compile("C\w+")

    start = None
    goal = None
    hubs_exist = False

    for string_path in string_pathways:
        tab_split_path = string_path.split("\t")
        carbons_conserved = []
        if len(tab_split_path) > 1:
            carbons_conserved = re.findall("[0-9]+=[0-9]+", tab_split_path[-1])
        path_compounds = regex.findall(string_path)
        nodes = set([])
        links = []
        hub_nodes = set([])
        hub_links = []

        if start == None and goal == None:
            start = path_compounds[0]
            goal = path_compounds[-1]

        for i in range(len(path_compounds) - 1):
            j = i + 1
            if ("_HS" in path_compounds[i] and "_HE" in path_compounds[j]) or ("_HS" in path_compounds[i] and "_HM" in path_compounds[j])  or ("_HM" in path_compounds[i] and "_HM" in path_compounds[j]) or ("_HM" in path_compounds[i] and "_HE" in path_compounds[j]):
                hubs_exist = True
                hub_nodes.add(path_compounds[i])
                hub_nodes.add(path_compounds[j])
                hub_links.append(path_compounds[i][0:6] + "-" + path_compounds[j][0:6])
            else:
                links.append(path_compounds[i][0:6] + "-" + path_compounds[j][0:6])

        pathway = {}
        pathway["atoms"] = carbons_conserved # TODO: actually calculate this
        pathway["nodes"] = [node[0:6] for node in (set(path_compounds) - hub_nodes)]
        pathway["links"] = list(links)
        pathway["hub_nodes"] = [hub_node[0:6] for hub_node in hub_nodes]
        pathway["hub_links"] = list(hub_links) 
        pathways.append(pathway)
        if(hubs_exist):
            all_hub_links = all_hub_links + hub_links

    pathways_data = {
        "info" : {
            "start" : start,
            "goal" : goal
            },
        "hub_db" : hub_db,
        "pathways" : pathways
    }

    # If this is a hub search, add in the rest of the hubs
    if(hubs_exist):
        pathways_data["background_hubs"] = get_background_hubs_from_file(background_hubs_filename, set(all_hub_links))

    return pathways_data

def get_background_hubs_from_file(background_hubs_filename, all_hub_links):
    b_hubs_file = open(background_hubs_filename, "r")
    b_nodes = {}
    b_links = []
    on_links = False
    for line in b_hubs_file:
        line.replace("\n", "")
        if not on_links:
            if "LINKS" not in line:
                node_info = line.split(",")
                b_nodes[node_info[0]] = (float(node_info[1]), float(node_info[2]))
            else:
                on_links = True
        else:
            if(line not in all_hub_links):
                b_links.append(line.replace("\r","").replace("\n",""))

    return { "b_nodes" : b_nodes, "b_links" : b_links }


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
