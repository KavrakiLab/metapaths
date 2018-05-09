import os
import re
import string
import sys

def convert_lpat(filename):
    # Read the original file and then empty it out
    f = open(filename, "r+")
    content = f.read()
    split_content = content.split("*********")
    f.seek(0)
    f.truncate()

    for less_than_two_hub_paths in split_content[1:-1]:
        if len(less_than_two_hub_paths) > 0:
            path_lines = less_than_two_hub_paths.split("\n")
            for line in path_lines:
                if len(line) > 0:
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

    # Convert each path and write out to the same file
    lines = split_content[-1].split("\n")
    #print(lines)
    first_path_list = {}
    hub_path_list = {}
    second_path_list = {}
    
    first_path = True
    for line in lines:
        #print line
        tab_split_line = line.split("\t")
        if len(line) > 0:
            if(line[0] == "[" and first_path):
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
                    c_conserved = tab_split_line[2]
                    if c_conserved not in first_path_list:
                        first_path_list[c_conserved] = []
                    first_path_list[c_conserved].append(path)

            elif(line[0] != "["):
                first_path = False
                raw_path = tab_split_line[0].split(" ")
                while len(raw_path[-1]) == 0:
                    raw_path = raw_path[:-1]
                path = raw_path[0][0:6] + "_HS,"
                for item in raw_path[1:-1]:
                    cleaned_item = "".join(x for x in item if x.isalnum())
                    if cleaned_item[0] == "C":
                        path += cleaned_item[0:6] + ","
                    elif cleaned_item[0] == "R":
                        path += cleaned_item[0:7] + ","
                path += raw_path[-1][0:6] + "_HE,"

                #print raw_path
                if len(tab_split_line) == 2:
                    c_conserved = tab_split_line[1].replace(":","=")
                    if c_conserved not in hub_path_list:
                        hub_path_list[c_conserved] = []
                    hub_path_list[c_conserved].append(path)

            elif(line[0] == "["):
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
                    c_conserved = tab_split_line[2]
                    if c_conserved not in second_path_list:
                        second_path_list[c_conserved] = []
                    second_path_list[c_conserved].append(path)


    #print "Size of first paths: " + str(len(first_path_list))
    #print "Size of hub paths: " + str(len(hub_path_list))
    #print "Size of second paths: " + str(len(second_path_list))

    if len(first_path_list) == 0 and len(second_path_list) == 0:
        print "looking at only hub to hub paths"
        for cc in hub_path_list:
            for path in hub_path_list[cc]:
                f.write(path[:-1] + "\t" + cc + "\n")

    elif len(first_path_list) == 0:
        print "looking at paths with no start to hub part"
        for cc1 in hub_path_list:
            for cc2 in second_path_list:
                hub_1, hub_2 = get_carbon_conserved_arrays(cc1)
                #print "****"
                #print hub_1
                #print hub_2
                #print cc2
                second_1, second_2 = get_carbon_conserved_arrays(cc2)
                #print second_1
                #print second_2
                #print "****"
                final_1, final_2 = get_merged_carbons_conserved(hub_1, hub_2, second_1, second_2)
                if len(final_1) > 0:
                    cc_str = get_str_cc(final_1, final_2)
                    #print cc_str
                    path1 = hub_path_list[cc1][0]
                    path2 = second_path_list[cc2][0]
                    f.write(path1 + path2[:-11] + "\t" + cc_str + "\n")
                    # for path1 in hub_path_list[cc1]:
                    #     for path2 in second_path_list[cc2]:
                    #             f.write(path1 + path2[:-11] + "\t" + cc_str + "\n")

    elif len(second_path_list) == 0:
        print "looking at paths with no hub to target part"
        for cc1 in first_path_list:
            for cc2 in hub_path_list:
                first_1, first_2 = get_carbon_conserved_arrays(cc1)
                hub_1, hub_2 = get_carbon_conserved_arrays(cc2)
                final_1, final_2 = get_merged_carbons_conserved(first_1, first_2, hub_1, hub_2)
                if len(final_1) > 0:
                    cc_str = get_str_cc(final_1, final_2)
                    path1 = first_path_list[cc1]
                    path2 = hub_path_list[cc2]
                    f.write(path1 + path2[11:-1] + "\t" + cc_str + "\n")
                    # for path1 in first_path_list[cc1]:
                    #     for path2 in hub_path_list[cc2]:
                    #         f.write(path1 + path2[11:-1] + "\t" + cc_str + "\n")

    else:
        print "Full hub search"
        for cc1 in first_path_list:
            for cc2 in hub_path_list:
                for cc3 in second_path_list:
                    cc_str = get_carbons_conserved(cc1, cc2, cc3)
                    if len(cc_str) > 0:
                        path1 = first_path_list[cc1]:
                        path2 = hub_path_list[cc2]:
                        path3 = second_path_list[cc3]:
                        f.write(path1 + path2 + path3[11:-11] + "\t" + cc_str + "\n")        

                        # for path1 in first_path_list[cc1]:
                        #     for path2 in hub_path_list[cc2]:
                        #         for path3 in second_path_list[cc3]:
                        #             f.write(path1 + path2 + path3[11:-11] + "\t" + cc_str + "\n")        

    f.close()

    # min_length = len(first_path_list)
    # if(min_length > len(second_path_list)):
    #     min_length = len(second_path_list)
    # if(min_length != 0):

    # for i in range(min_length):
    #     hub_middle = hub_path_list[0]
    #     if(len(hub_path_list) > i):
    #         hub_middle = hub_path_list[i]

    #     first_path_info = first_path_list[i].split("\t")
    #     hub_middle_info = hub_middle.split("\t")
    #     second_path_info = second_path_list.split("\t")
    #     carbons_conserved = ""

    #     if len(first_path_info) > 1 and len(hub_middle_info) > 1 and len(second_path_info) > 1:
    #         carbons_conserved = get_carbons_conserved(first_path_info[1], hub_middle_info[1], second_path_info[1])
    #         f.write(first_path_info[0] + hub_middle_info[0] + second_path_info[0])


def get_carbon_conserved_arrays(carbon_conserved_string):
    cc_list = re.findall("[0-9]+=[0-9]+", carbon_conserved_string)
    first_list = []
    second_list = []
    for item in cc_list:
        ccs = item.split("=")
        if(len(ccs) == 2):
            first_list.append(ccs[0])
            second_list.append(ccs[1])

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

    return get_str_cc(final_1, final_2)


def get_str_cc(final_1, final_2):
    final_str = ""
    for i in range(len(final_1)):
        final_str += final_1[i] + "=" + final_2[i] + ","
    return final_str


convert_lpat(sys.argv[1])
