import sys
import MySQLdb
import os
import re

def get_net_ATP_usage(pathway, cursor):	
	net_ATP = 0
	rpairs = re.findall("RP[0-9]{5}", pathway)
	reactions = get_all_KEGG_ReactionIDs(rpairs, cursor)
	for reaction in reactions:
		ATP_used = 0
		ATP_made = 0
		# Get ATP used
		#print reaction
		cursor.execute("SELECT amount FROM KEGGReactionsLeft WHERE KEGGReactionID = '" + reaction + "' AND KEGGCompoundID = 'C00002';")
		query_result = cursor.fetchall()
		if(len(query_result) > 0):
			#print query_result[0][0]
			ATP_used = int(query_result[0][0])

		cursor.execute("SELECT amount FROM KEGGReactionsRight WHERE KEGGReactionID = '" + reaction + "' AND KEGGCompoundID = 'C00002';")
		query_result = cursor.fetchall()

		if(len(query_result) > 0):
			#print query_result[0][0]
			ATP_made = int(query_result[0][0])

		net_ATP += ATP_made - ATP_used
	return str(net_ATP)


def get_all_KEGG_ReactionIDs(rpairs, cursor):
	KEGG_reactions = []
	for rpair in rpairs:
		KEGG_reactions.append(get_KEGG_ReactionID_from_RPAIR(cursor, rpair))
	return KEGG_reactions

def get_KEGG_ReactionID_from_RPAIR(cursor, rpair):
	#print rpair
	reaction = ""
	cursor.execute("SELECT KEGGReactionID FROM KEGGReactionsRpair WHERE KEGGRpairID = '" + rpair + "';")
	query_result = cursor.fetchall()
	if(len(query_result) > 0):
		reaction = query_result[0][0]
	#else:
		#print "Couldn't find Reaction for " + rpair
	return reaction