import os
import re
import string
import sys

def convert_lpat(filename):
    # Read the original file and then empty it out
    f = open(filename, "r+")
    lines = f.readlines()
    f.seek(0)
    f.truncate()

    # Convert each path and write out to the same file
    for line in lines:
        tab_split = line.split("\t")
        carbons_conserved = ""
        if len(tab_split) == 3:
            carbons_conserved = tab_split[-1]
        path_segments = []
        for item in line.split(";"):
            if len(item) > 0:
                cleaned_item = "".join(x for x in item if x.isalnum())
                if cleaned_item[0] == "C":
                    f.write(cleaned_item[0:6] + ",")
                elif cleaned_item[0] == "R":
                    f.write(cleaned_item[0:7] + ",")

        f.seek(-1, os.SEEK_CUR)
        if carbons_conserved != "":
            f.write("\t" + carbons_conserved)
        f.write("\n")
    f.close()

def is_pathway_canonical(cmpdlist, start, goal):
    canonical_cmpds_file = open("canonical_pathways/" + start + "_" + goal + ".txt", "r")
    canonical_cmpds = canonical_cmpds_file.read()
    canonical_cmpd_list = canonical_cmpds.split(",")
    print "Canonical list: " + str(canonical_cmpd_list)
    print "Current pathway: " + str(cmpdlist)
    if(canonical_cmpd_list == cmpdlist):
        return True
    else:
        return False

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
        pathway["canonical"] = is_pathway_canonical(path_compounds, start, goal)
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

def get_pathways_from_file(pathways_filename, background_hubs_filename, hub_db):
    pathways_file = open(pathways_filename, "r")
    return extract_pathways(pathways_file.readlines(), background_hubs_filename, hub_db)

convert_lpat(sys.argv[1])
output = get_pathways_from_file(sys.argv[1], "na", "na")

print output