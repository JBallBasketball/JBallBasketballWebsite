import base64
import io

import cloudinary
import cloudinary.uploader
import cloudinary.api

import requests as req
import json
import os

import base64
import io
import json
import os
import time

import cloudinary
import cloudinary.uploader
import cloudinary.api

import gspread
import pyotp
from PIL import Image
import requests as req
# import requests as req
from flask import Blueprint, render_template, send_from_directory, redirect, request, url_for

import gspread
from PIL import Image
from flask import Blueprint, render_template, send_from_directory, redirect, request, url_for

import app.database as database

if os.environ.get('FLASK_ENV') == 'development':
	from dotenv import load_dotenv

	load_dotenv()

api = Blueprint('api', __name__)

google_service_account_key = json.loads(os.environ["GOOGLE_SERVICE_ACCOUNT_KEY"])
service_account = gspread.service_account_from_dict(google_service_account_key)


def get_standings_sheet_data():
	return service_account.open_by_key("1Fz02ntmQ7oQdZPYXKBAR0wgjYWlAsw8qtnrAuO5A7Dk").sheet1.get_all_records()


@api.route('/standings-data/', methods=['GET'])
def standings_data():
	return get_standings_sheet_data()


@api.route("/get-all-event-links/", methods=['GET'])
def get_all_event_links():
	# return [event["url"] for event in req.get("https://blob.vercel-storage.com",
	#                                           headers={
	# 	                                          "authorization": "Bearer " + BLOB_READ_WRITE_TOKEN,
	# 	                                          "prefix": "events/"
	#                                           }).json()["blobs"] if
	#         event["size"] and event["pathname"].startswith("events/")]

	return database.get_all_events()


def pillow_image_to_data_url(img):
	buffer = io.BytesIO()
	img.save(buffer, format="JPEG")
	return 'data:image/jpeg;base64,' + base64.b64encode(buffer.getvalue()).decode("utf-8")


def data_url_to_pillow_image(base64_str):
	return Image.open(io.BytesIO(base64.decodebytes(bytes(base64_str.split(",")[-1], "utf-8"))))


def optimize_image(data_url):
	img = data_url_to_pillow_image(data_url)
	img.thumbnail((1280, 1440))  # make max width 1280 and max height 1440 without changing aspect ratio

	return pillow_image_to_data_url(img)


def upload_image(data_url):
	return cloudinary.uploader.upload(data_url)["url"]


@api.route("/post-new-event/", methods=['POST'])
def post_new_event():
	event_data = request.json

	if "auth" not in request.args:
		print("Unauthorized event post attempt: No auth param!")
		return {"success": False}, 401

	if not database.validate_temp_cred(request.remote_addr, request.args.get("auth")):  # 1 hour
		print("Unauthorized event post attempt: Invalid auth param!")
		return {"success": False}, 401

	if ("title" not in event_data
			or "desc" not in event_data
			or "date" not in event_data
			or "cover" not in event_data
			or "photos" not in event_data):
		return {"success": False}, 400

	event_data["cover"] = upload_image(optimize_image(event_data["cover"]))

	event_data["photos"] = list(map(lambda data_url: upload_image(optimize_image(data_url)), event_data["photos"]))

	database.add_new_event(event_data)

	return {"success": True}, 200
