import datetime
import json
import os

import gspread
import pymongo.database
import pyotp
import requests as req
from bson import CodecOptions
from google.oauth2 import service_account as google_service_account
from googleapiclient.discovery import build
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi

if os.environ.get('FLASK_ENV') == 'development':
	from dotenv import load_dotenv

	load_dotenv()

SCOPES = ['https://www.googleapis.com/auth/drive.readonly']

service_account_key = json.loads(os.environ["GOOGLE_SERVICE_ACCOUNT_KEY"])
creds = google_service_account.Credentials.from_service_account_info(service_account_key, scopes=SCOPES)
service = build('drive', 'v3', credentials=creds)

google_service_account_key = json.loads(os.environ["GOOGLE_SERVICE_ACCOUNT_KEY"])
service_account = gspread.service_account_from_dict(google_service_account_key)

standings_sheet = service_account.open_by_key("1Fz02ntmQ7oQdZPYXKBAR0wgjYWlAsw8qtnrAuO5A7Dk").sheet1
signup_sheet = service_account.open_by_key("142O2MTqvnQ1gXvDAzbp8WC1ijN94KbrQ63Phdzhpc8w").sheet1

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

	ip_geolocation_data = req.get(f"https://api.iplocation.net/?ip={ip}").json()

	valid_temp_creds.insert_one({
		"ip": ip,
		"auth_code": auth_code,
		"timestamp": datetime.datetime.now(tz=datetime.timezone.utc),
		"location_code": ip_geolocation_data["country_code2"]
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


def get_all_events():
	event_data = list(events.find())
	for event in event_data:
		event["_id"] = str(event["_id"])
	event_data.sort(key=lambda x: x["date"], reverse=True)
	return event_data


def get_standings_sheet_data():
	return standings_sheet.get_all_records()


def update_events():
	updated_events = []

	query = f"'{os.environ["EVENT_PHOTOS_FOLDER_ID"]}' in parents"
	results = service.files().list(q=query, fields="files(id, name, mimeType)").execute()
	event_folders = list(filter(lambda folder_data: folder_data["mimeType"] == "application/vnd.google-apps.folder",
	                            results.get('files', [])))
	for event_folder in event_folders:
		query = f"'{event_folder["id"]}' in parents"
		file_results = service.files().list(q=query, fields="files(id, name, mimeType)").execute()
		images = sorted(
			list(filter(lambda file_data: file_data["mimeType"].startswith("image/"), file_results.get('files', []))),
			key=lambda file_data: file_data["name"])
		image_links = list(map(lambda x: f"https://lh3.googleusercontent.com/d/{x["id"]}", images))

		event_title, event_desc, event_date = event_folder["name"].split(" - ")

		updated_events.append({
			"title": event_title,
			"date": event_date,
			"desc": event_desc,
			"cover": image_links[0],
			"photos": image_links,
		})

	events.delete_many({})

	if len(updated_events) > 0:
		events.insert_many(updated_events)


def add_signup(form):
	signup_sheet.append_row(list(form.values()))