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

def convert_hub(filename):
    # Read the original file and then empty it out
    f = open(filename, "r+")
    lines = f.readlines()
    f.seek(0)
    f.truncate()

    # Convert each path and write out to the same file
    for line in lines:
        hub_pattern = re.compile("\(([^\)]+)\)")
        hub_links = hub_pattern.findall(line)

        for hub_link in hub_links:
            compound_pattern = re.compile("\C\w+")
            compounds = compound_pattern.findall(hub_link)

            if len(compounds) < 2:
                sys.stderr("less than two compounds in hub link!\n")
                sys.stderr(hub_link)
                sys.stderr(compounds)
                sys.exit(1)

            hub_start = compounds[0][0:6] + "_HS"
            hub_end = compounds[-1][0:6] + "_HE"

            line = string.replace(line, "(" + hub_link + ")", hub_start + "," + hub_end)

        path_segments = []
        for item in line.split(","):
            item = item.strip()
            if len(item) > 0:
                cleaned_item = "".join(x for x in item if x.isalnum() or x == "_")
                if cleaned_item[0] == "C":
                    if cleaned_item[-3] == "_":
                        f.write(cleaned_item[0:9] + ",")
                    else:
                        f.write(cleaned_item[0:6] + ",")
                elif cleaned_item[0] == "R":
                    f.write(cleaned_item[0:7] + ",")


        f.seek(-1, os.SEEK_CUR)
        f.write("\n")
    f.close()


def main():
    if len(sys.argv) != 3:
        sys.stderr.write("Invalid arguments.")
        sys.exit(1)
    else:
        alg = sys.argv[1]

        if alg == "lpat":
            convert_lpat(sys.argv[2])

        elif alg  == "hub":
            convert_hub(sys.argv[2])

        elif alg == "metagraph":
            convert_metagraph(sys.argv[2])

        else:
            sys.stderr.write("Invalid value for algorithm.")
            sys.exit(1)


if __name__ == "__main__":
    main()
