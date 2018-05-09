import os
import re
import string
import sys

def convert_lpat(filename):
    # Read the original file and then empty it out
    f = open(filename, "r+")
    content = f.read()
    split_content = content.split("*********")
    lines = split_content[-1].split("\n")
    f.seek(0)
    f.truncate()

    #print(lines)
    first_path_list = []
    hub_path_list = []
    second_path_list = []

    for less_than_two_hub_paths in split_content[:-1]:
        if len(less_than_two_hub_paths) > 0:
            path_lines = less_than_two_hub_paths.split("\n")
            for line in path_lines:
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

        #f.seek(-1, os.SEEK_CUR)
        if carbons_conserved != "":
            f.write("\t" + carbons_conserved)
        f.write("\n")

    # Convert each path and write out to the same file
    first_path = True
    for line in lines:
        #print(line)
        tab_split_line = line.split("\t")
        if("[" in line and first_path):
            path = ""
            for item in line.split(";"):
                if len(item) > 0:
                    cleaned_item = "".join(x for x in item if x.isalnum())
                    if cleaned_item[0] == "C":
                        path += cleaned_item[0:6] + ","
                    elif cleaned_item[0] == "R":
                        path += cleaned_item[0:7] + ","
            path = path[:-1] + "_HS,"

            if len(tab_split_line) == 3:
                path += "\t" + tab_split_line[2]
            first_path_list.append(path)

        elif("[" not in line):
            first_path = False
            raw_path = line.split(" ")
            path = ""
            for item in raw_path[1:-1]:
                path += item[0:6] + ","

            if len(tab_split_line) == 2:
                path += "\t" + tab_split_line[1]
            hub_path_list.append(path)

        elif("[" in line):
            raw_path = line.split(";")
            cleaned_start_item = "".join(x for x in raw_path[0] if x.isalnum())
            path = cleaned_start_item[0:6] + "_HE,"

            for item in raw_path[1:]:
                if len(item) > 0:
                    cleaned_item = "".join(x for x in item if x.isalnum())
                    if cleaned_item[0] == "C":
                        path += cleaned_item[0:6] + ","
                    elif cleaned_item[0] == "R":
                        path += cleaned_item[0:7] + ","

            if len(tab_split_line) == 3:
                path += "\t" + tab_split_line[2]
            second_path_list.append(path)


    min_length = len(first_path_list)
    if(min_length > len(second_path_list)):
        min_length = len(second_path_list)
    for i in range(min_length):
        hub_middle = hub_path_list[0]
        if(len(hub_path_list) > i):
            hub_middle = hub_path_list[i]

        first_path_info = first_path_list[i].split("\t")
        hub_middle_info = hub_middle.split("\t")
        second_path_info = second_path_list.split("\t")
        carbons_conserved = ""

        if len(first_path_info) > 1 and len(hub_middle_info) > 1 and len(second_path_info) > 1:
            carbons_conserved = get_carbons_conserved(first_path_info[1], hub_middle_info[1], second_path_info[1])

        f.write(first_path_info[0] + hub_middle_info[0] + second_path_info[0] + "\t" + carbons_conserved)
        f.seek(-1, os.SEEK_CUR)
        f.write("\n")
    f.close()

def get_carbon_conserved_arrays(carbon_conserved_string):
    cc_list = re.findall(carbon_conserved_string,"[0-9]+:[0-9]+")
    first_list = []
    second_list = []
    for item in cc_list:
        ccs = item.split(":")
        first_list.append(ccs[1])
        second_list.append(ccs[2])

    return first_list, second_list

def get_merged_carbons_conserved(first_1, first_2, second_1, second_2):
    intersection = set(first_2) & set(second_1)

    new_mapping_1 = []
    new_mapping_2 = []

    for item in intersection:
        new_mapping_1.append(first_1[first_2.index(item)])
        new_mapping_2.append(second_2[second_1.index(item)])

    return new_mapping_1, new_mapping_2

def get_carbons_conserved(first_path_cc, hub_cc, second_path_cc):
    first_1, first_2 = get_carbon_conserved_arrays(first_path_cc)
    middle_1, middle_2 = get_carbon_conserved_arrays(hub_cc)
    last_1, last_2 = get_carbon_conserved_arrays(second_path_cc)
    temp_1, temp_2 = get_merged_carbons_conserved(first_1, first_2, middle_1, middle_2)

    final_1, final_2 = get_merged_carbons_conserved(temp_1, temp_2, final_1, final_2)

    final_str = ""
    for i in range(len(final_1)):
        final_str += final_1[i] + ":" + final_2[i]
    return final_str


convert_lpat(sys.argv[1])
