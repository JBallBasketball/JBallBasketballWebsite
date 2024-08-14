import datetime
import json
import os

import gspread
import pymongo.database
import pyotp
from bson import CodecOptions, ObjectId

from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi

if os.environ.get('FLASK_ENV') == 'development':
	from dotenv import load_dotenv

	load_dotenv()

google_service_account_key = json.loads(os.environ["GOOGLE_SERVICE_ACCOUNT_KEY"])
service_account = gspread.service_account_from_dict(google_service_account_key)

MONGODB_PASSWORD = os.environ["MONGODB_PASSWORD"]

uri = f"mongodb+srv://jballbasketball:{MONGODB_PASSWORD}@jball.xrazc.mongodb.net/?retryWrites=true&w=majority&appName=JBall"

# Create a new client and connect to the server
client = MongoClient(uri, server_api=ServerApi('1'))

db: pymongo.database.Database = client.jball
valid_temp_creds: pymongo.collection.Collection = db.get_collection("validTempCreds",
                                                                    codec_options=CodecOptions(tz_aware=True))
events: pymongo.collection.Collection = db.events


def add_temp_cred(ip):
	auth_code = pyotp.random_base32()

	valid_temp_creds.insert_one({
		"ip": ip,
		"auth_code": auth_code,
		"timestamp": datetime.datetime.now(tz=datetime.timezone.utc)
	})

	return auth_code


def validate_temp_cred(ip, auth_code):
	credential_timestamps = sorted(
		[datetime.datetime.now(tz=datetime.timezone.utc) - temp_cred["timestamp"] for temp_cred in
		 valid_temp_creds.find({
			 "ip": ip,
			 "auth_code": auth_code
		 })])

	creds_valid = credential_timestamps and credential_timestamps[0] < datetime.timedelta(hours=1)
	return creds_valid


def add_new_event(event_data):
	events.insert_one(event_data)


def get_all_events():
	event_data = list(events.find())
	for event in event_data:
		event["_id"] = str(event["_id"])
	event_data.sort(key=lambda x: x["date"], reverse=True)
	return event_data


def get_standings_sheet_data():
	return service_account.open_by_key("1Fz02ntmQ7oQdZPYXKBAR0wgjYWlAsw8qtnrAuO5A7Dk").sheet1.get_all_records()


def delete_event(event_id):
	events.delete_one({"_id": ObjectId(event_id)})
