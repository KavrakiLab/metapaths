import subprocess
import uuid

def execute_hub_search(start, target, hubs, num_atoms, allow_reversible):
    """docstring for exe"""
    print "Executing hub search with:"
    print(start, target, hubs, num_atoms, allow_reversible)
    search_id = str(uuid.uuid4()) # TODO: Is this okay to do?

    return search_id

def execute_lpat_search(start, target, num_atoms, allow_reversible):
    """docstring for exe"""
    print "Executing LPAT search with:"
    print(start, target, num_atoms, allow_reversible)
    search_id = str(uuid.uuid4()) # TODO: Is this okay to do?
    config_loc = generate_LPAT_config(start, target, num_atoms, allow_reversible, search_id)

    output = subprocess.check_output(["java", "-jar", "LPAT/LinearPathwaySearch.jar", config_loc])

    print output


    return search_id


def generate_LPAT_config(start, target, num_atoms, allow_reversible, search_id):
    config = "DBHOST\tlocalhost\n"
    config += "DBPORT\t3306\n"
    config += "DBNAME\tmetadb\n"
    config += "DBUSER\troot\n"
    config += "DBPASS\tmeta\n"
    config += "MOLDIR\trpair_mol\n"
    config += "RPAIRDIR\trpair_only_maps\n"
    config += "REACTIONDIR\trpair_maps\n"
    config += "K\t1000000\n"
    config += "USEREVERSE\t1\n"
    config += "STARTCID\t" + start + "\n"
    config += "TARGETCID\t" + target + "\n"
    if num_atoms > 0:
        config += "CARBONTRACK\t" + str(num_atoms) + "\n"
    else:
        config += "CARBONTRACK\tmax\n"
    config += "PERCENTCARBON\t1.0\n"
    config += "WEIGHTTYPE\tWEIGHT_OF_ONE\n"
    config += "OUTPUTDIR\tLPAT_OUTPUT\n"

    config_loc = "LPAT_INPUT/" + search_id + ".txt"

    config_file = open("LPAT/" + config_loc, 'w')
    config_file.write(config)
    config_file.close()

    return config_loc


