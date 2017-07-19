import re
import os
from flask import jsonify

def generate_LPAT_config(start, target, carbon_track, allow_reversible, search_id):

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
        search_id, selected_hub_compounds):

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
    config += "HUBTABLE\tsearches/hub_table\n"

    output_loc = "searches/output/" + search_id + "|" + start_name + " (" + start + ")|" + target_name + " (" + target + ")|" + "Hub.txt"
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


def extract_pathways(string_pathways):
    pathways = []

    # Finds compound IDs by extracting words that start with the letter 'C'
    regex = re.compile("C\w+")

    start = None
    goal = None
    for string_path in string_pathways:
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
                hub_nodes.add(path_compounds[i])
                hub_nodes.add(path_compounds[j])
                hub_links.append(path_compounds[i][0:6] + "-" + path_compounds[j][0:6])
            else:
                links.append(path_compounds[i][0:6] + "-" + path_compounds[j][0:6])

        pathway = {}
        pathway["atoms"] = 0 # TODO: actually calculate this
        pathway["nodes"] = [node[0:6] for node in (set(path_compounds) - hub_nodes)]
        pathway["links"] = list(links)
        pathway["hub_nodes"] = [hub_node[0:6] for hub_node in hub_nodes]
        pathway["hub_links"] = list(hub_links)

        pathways.append(pathway)

    pathways_data = {
        "info" : {
            "start" : start,
            "goal" : goal
            },
        "pathways" : pathways
    }

    return pathways_data


def get_pathways_from_file(pathways_filename):
    pathways_file = open(pathways_filename, "r")
    return extract_pathways(pathways_file.readlines())


def hub_paths_to_json(hub_src, hub_dst, string_hub_pathways):
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
        "pathways" : pathways
    }
    return jsonify(hub)


def remove_input_file(search_id):
    os.remove("searches/input/" + search_id + ".txt")
