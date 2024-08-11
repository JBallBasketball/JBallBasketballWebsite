import datetime
import os

import pymongo.database
import pyotp
from bson import CodecOptions

from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi

if os.environ.get('FLASK_ENV') == 'development':
	from dotenv import load_dotenv

	load_dotenv()

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
	return [{k: v for k, v in event.items() if k != "_id"} for event in events.find()]
