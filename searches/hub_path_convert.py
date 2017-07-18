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

    #print(lines)
    first_path_list = []
    hub_path_list = []
    second_path_list = []

    # Convert each path and write out to the same file
    first_path = True
    for line in lines:
        #print(line)
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
            first_path_list.append(path)

        elif("[" not in line):
            first_path = False
            raw_path = line.split(" ")
            path = ""
            for item in raw_path[1:-1]:
                path += item[0:6] + ","
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
            second_path_list.append(path)


    min_length = len(first_path_list)
    if(min_length > len(second_path_list)):
        min_length = len(second_path_list)
    for i in range(min_length):
        hub_middle = hub_path_list[0]
        if(len(hub_path_list) > i):
            hub_middle = hub_path_list[i]

        f.write(first_path_list[i] + hub_middle + second_path_list[i])
        f.seek(-1, os.SEEK_CUR)
        f.write("\n")
    f.close()


convert_lpat(sys.argv[1])
