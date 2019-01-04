import os
import re
import string
import sys
import MySQLdb
import pdb
from get_ATP_usage import get_net_ATP_usage, get_all_KEGG_ReactionIDs, get_KEGG_ReactionID_from_RPAIR

def get_hubs_from_file(filename):
	hub_file = open("searches/" + filename, "r")
	return hub_file.read().split("\n")

def convert_lpat(filename, input_hub_list, target_cmpd):
	hub_list = input_hub_list
	# Read the original file and then empty it out
	f = open(filename, "r+")
	content = f.read()
	# Split input by ******* to get different sections: (0) info/stats, (1) no hub paths,
	# (2) one hub paths, (3) hub to hub paths
	split_content = content.split("*********")
	f.seek(0)
	f.truncate()

	db = MySQLdb.connect(host="localhost",
	                    user="MetaDBUser",
	                    passwd="meta",
	                    db="MetaDB_2015")
	cursor = db.cursor()

	cutoff = 1000

	# Go through all sections, ignoring the info/stats section
	for less_than_two_hub_paths in split_content[1:-1]:
		if len(less_than_two_hub_paths) > 0:
			path_lines = less_than_two_hub_paths.split("\n")
			#Adding a limit
			count = 0
			for line in path_lines:
				if count > cutoff:
					break
				count += 1
				if len(line) > 0:
					tab_split = line.split("\t")
					carbons_conserved = ""
					if len(tab_split) == 3:
						carbons_conserved = tab_split[-1]
					path_segments = []
					atp_used = get_net_ATP_usage(line, cursor)
					for item in line.split(";"):
						if len(item) > 0:
							cleaned_item = "".join(x for x in item if x.isalnum())
							if cleaned_item[0] == "C":
								f.write(cleaned_item[0:6] + ",")
							elif cleaned_item[0] == "R":
								f.write(cleaned_item[0:7] + ",")
					f.seek(-1, os.SEEK_CUR)
					if carbons_conserved != "":
						f.write("\t" + atp_used)
						f.write("\t" + carbons_conserved)
					f.write("\n")

	all_hub_path_info = split_content[-1]

	if target_cmpd in all_hub_path_info:
		# Convert each path and write out to the same file
		lines = split_content[-1].split("\n")
		#print(lines)
		first_path_list = {}
		hub_path_list = {}
		second_path_list = {}
		
		first_path = True
		hub_path_len_dict = {}

		end_first_list = []
		end_hub_list = []

		start_hub_list = []
		start_end_list = []

		for line in lines:
			#print line
			tab_split_line = line.split("\t")
			if len(line) > 0:
				atp_used = get_net_ATP_usage(line, cursor)
				if(line[0] == "[" and first_path):
					path = ""
					for item in line.split(";"):
						if len(item) > 0:
							cleaned_item = "".join(x for x in item if x.isalnum())
							if cleaned_item[0] == "C":
								path += cleaned_item[0:6] + ","
							elif cleaned_item[0] == "R":
								path += cleaned_item[0:7] + ","
					
					end_first_list.append(path[-7:-1])
					path = path[:-1] + "_HS," + "\t" + atp_used

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
					start_hub_list.append(raw_path[0][0:6])

					prev_item = ""
					for item in raw_path[1:-1]:
						cleaned_item = "".join(x for x in item if x.isalnum())
						tentative_cmpd = cleaned_item[0:6]
						if cleaned_item[0] == "C" and tentative_cmpd in hub_list and tentative_cmpd != prev_item:
							path += tentative_cmpd + "_HM,"
							prev_item = tentative_cmpd
						#elif cleaned_item[0] == "R":
						#    path += cleaned_item[0:7] + ","
					path += raw_path[-1][0:6] + "_HE," + "\t" + atp_used
					end_hub_list.append(raw_path[-1][0:6])

					#print raw_path
					if len(tab_split_line) == 2:
						c_conserved = tab_split_line[1].replace(":","=")
						if c_conserved not in hub_path_list:
							hub_path_list[c_conserved] = []

						hub_path_len = len(re.findall("RP[0-9]{5}",tab_split_line[0]))
						if c_conserved not in hub_path_len_dict:
							hub_path_len_dict[c_conserved] = {}

						hub_path_id = raw_path[0][0:6] + "_" + raw_path[-1][0:6]               
						if hub_path_id not in hub_path_len_dict[c_conserved]:
							hub_path_len_dict[c_conserved][hub_path_id] = {}

						hub_path_len_dict[c_conserved][hub_path_id][path] = hub_path_len

							#if hub_path_len < hub_path_len_dict[c_conserved][hub_path_id]:
							#	hub_path_len_dict[c_conserved][hub_path_id] = hub_path_len
						hub_path_list[c_conserved].append(path)

				elif(line[0] == "["):
					raw_path = line.split(";")
					cleaned_start_item = "".join(x for x in raw_path[0] if x.isalnum())
					path = cleaned_start_item[0:6] + "_HE,"
					start_end_list.append(cleaned_start_item[0:6])

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
						second_path_list[c_conserved].append(path + "\t" + atp_used)


		#Filter out any partially completed paths that should not be there
		remove_from_first_list = set(end_first_list) - set(start_hub_list)
		remove_from_hub_list = []
		if len(start_end_list) > 0:
			remove_from_hub_list = set(end_hub_list) - set(start_end_list)

		for cc in reversed(first_path_list.keys()):
			for path in reversed(first_path_list[cc]):
				compound = path.split("_HS")[0][-6:]
				if compound in remove_from_first_list:
					fist_path_list[cc].remove(path)
					print "Removing " + path 
			if len(first_path_list[cc]) == 0:
				first_path_list.pop(cc, None)

		for cc in reversed(hub_path_list.keys()):
			for path in reversed(hub_path_list[cc]):
				compound = path.split("_HE")[0][-6:]
				if compound in remove_from_hub_list:
					hub_path_list[cc].remove(path)
					print "Removing " + path
			if len(hub_path_list[cc]) == 0:
				hub_path_list.pop(cc, None)	


		#print "Size of first paths: " + str(len(first_path_list))
		#print "Size of hub paths: " + str(len(hub_path_list))
		#print "Size of second paths: " + str(len(second_path_list))
		db.close()
		#print hub_path_list

		hub_cutoff = 1000
		if len(first_path_list) == 0 and len(second_path_list) == 0:
			print "looking at only hub to hub paths"
			for cc in hub_path_list:
				count = 0
				for raw_path in hub_path_list[cc]:
					path_segs = raw_path.split("\t")
					path = path_segs[0]
					hub_path_id = path[0:6] + "_" + path[-10:-4]
					if count < hub_cutoff:
						#pdb.set_trace()
						f.write(path[:-1] + "\t" + str(hub_path_len_dict[cc][hub_path_id][raw_path]) + "\t" + path_segs[1] + "\t" + cc + "\n")
					else:
						break
					count += 1

		elif len(first_path_list) == 0:
			print "looking at paths with no start to hub part"
			cc_str_dict = {}
			#print hub_path_list
			for cc1 in hub_path_list:
				for cc2 in second_path_list:
					hub_1, hub_2 = get_carbon_conserved_arrays(cc1)

					second_1, second_2 = get_carbon_conserved_arrays(cc2)

					final_1, final_2 = get_merged_carbons_conserved(hub_1, hub_2, second_1, second_2)

					if len(final_1) > 0:
						cc_str = get_str_cc(final_1, final_2)
						# if cc_str not in cc_str_dict:
						# 	cc_str_dict[cc_str] = 1
						#if cc_str_dict[cc_str] > 5:
						#	continue

						visited_hub_path_ids = []

						#print cc_str
						for path in hub_path_list[cc1]:
							count = 0
							atp_used = 0
							path1_segs = path.split("\t")
							path1 = path1_segs[0]
							atp_used += int(path1_segs[1])
							hub_path_id = path1[0:6] + "_" + path1[-10:-4]
							
							if hub_path_id in visited_hub_path_ids:
								continue
							for path2_raw in second_path_list[cc2]:
								path2_segs = path2_raw.split("\t")
								path2 = path2_segs[0]
								if path2[0:6] != path1[-10:-4]:
									#print "Path1: " + str(path1[-10:-4])
									#print "Path2: " + str(path2[0:6])
									continue
								atp_used += int(path2_segs[1])
								visited_hub_path_ids.append(hub_path_id)
								if count < hub_cutoff:
									count += 1
									f.write(path1[:-10] + path2[:-1] + "\t" + str(hub_path_len_dict[cc1][hub_path_id][path]) + "\t" + str(atp_used) + "\t" + cc_str + "\n")
								else:
									break
							#cc_str_dict[cc_str] += 1
							# for path1 in hub_path_list[cc1]:
							#     for path2 in second_path_list[cc2]:
							#             f.write(path1 + path2[:-11] + "\t" + cc_str + "\n")

		elif len(second_path_list) == 0:
			print "looking at paths with no hub to target part"
			cc_str_dict = {}
			for cc1 in first_path_list:
				for cc2 in hub_path_list:
					first_1, first_2 = get_carbon_conserved_arrays(cc1)
					hub_1, hub_2 = get_carbon_conserved_arrays(cc2)
					final_1, final_2 = get_merged_carbons_conserved(first_1, first_2, hub_1, hub_2)
					if len(final_1) > 0:
						cc_str = get_str_cc(final_1, final_2)
						# if cc_str not in cc_str_dict:
						# 	cc_str_dict[cc_str] = 1
						# elif cc_str_dict[cc_str] > 5:
						# 	continue
						# else:
						for path in hub_path_list[cc2]:
							path1_segs = first_path_list[cc1][0].split("\t")
							path2_segs = path.split("\t")
							path1 = path1_segs[0]
							path2 = path2_segs[0]
							atp_used = int(path1_segs[1]) + int(path2_segs[1])
							hub_path_id = path2[0:6] + "_" + path2[-10:-4]
							f.write(path1 + path2[11:-1] + "\t" + str(hub_path_len_dict[cc2][hub_path_id][path]) + "\t" + str(atp_used) + "\t" + cc_str + "\n")
							
							#cc_str_dict[cc_str] += 1
					# for path1 in first_path_list[cc1]:
					#     for path2 in hub_path_list[cc2]:
					#         f.write(path1 + path2[11:-1] + "\t" + cc_str + "\n")

		else:
			print "Full hub search!"
			cc_str_dict = {}
			for cc1 in first_path_list:
				for cc2 in hub_path_list:
					for cc3 in second_path_list:
						cc_str = get_carbons_conserved(cc1, cc2, cc3)
						if len(cc_str) > 0:
							# if cc_str not in cc_str_dict:
							# 	cc_str_dict[cc_str] = 1
							# elif cc_str_dict[cc_str] > 5:
							# 	continue
							# else:
							count1 = 0
							for raw_path1_segs in first_path_list[cc1]:
								count2 = 0
								for raw_path2_segs in hub_path_list[cc2]:
									count3 = 0
									for raw_path3_segs in second_path_list[cc3]:
										path1_segs = raw_path1_segs.split("\t")
										path2_segs = raw_path2_segs.split("\t")
										path3_segs = raw_path3_segs.split("\t")
										path1 = path1_segs[0]
										path2 = path2_segs[0]
										path3 = path3_segs[0]
										hub_path_id = path2[0:6] + "_" + path2[-10:-4]
										atp_used = int(path1_segs[1]) + int(path2_segs[1]) + int(path3_segs[1])
										if count3 < hub_cutoff:
											count3 += 1
											f.write(path1 + path2[11:-10] + path3[:-1] + "\t" + str(hub_path_len_dict[cc2][hub_path_id][raw_path2_segs]) + "\t" + str(atp_used) + "\t" + cc_str + "\n")        
										else:
											break

									if count2 < hub_cutoff:
										count2 += 1
									else:
										break

								if count1 < hub_cutoff:
									count1 += 1
								else:
									break

							#cc_str_dict[cc_str] += 1

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

	final_1, final_2 = get_merged_carbons_conserved(temp_1, temp_2, last_1, last_2)

	return get_str_cc(final_1, final_2)


def get_str_cc(final_1, final_2):
	final_str = ""
	for i in range(len(final_1)):
		final_str += final_1[i] + "=" + final_2[i] + ","
	return final_str


def file_to_list(filename):
	f = open(filename, "r")
	contents = f.read()
	return contents.split("\n")

convert_lpat(sys.argv[1], file_to_list(sys.argv[2]), sys.argv[3])
