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


@api.route('/standings-data/', methods=['GET'])
def standings_data():
	return database.get_standings_sheet_data()


@api.route("/get-all-events/", methods=['GET'])
def get_all_events():
	return database.get_all_events()


@api.route("/update-events/", methods=['POST'])
def update_events():
	if "auth" not in request.args:
		print("Unauthorized event post attempt: No auth param!")
		return {"success": False}, 401

	if not database.validate_temp_cred(request.remote_addr, request.args.get("auth")):  # 1 hour
		print("Unauthorized event post attempt: Invalid auth param!")
		return {"success": False}, 401

	database.update_events()

	return {"success": True}, 200


@api.route("/check-login-validity/", methods=['GET'])
def check_login_validity():
	if "auth" not in request.args:
		print("Unauthorized event post attempt: No auth param!")
		return {"success": False}, 400

	if not database.validate_temp_cred(request.remote_addr, request.args.get("auth")):  # 1 hour
		print("Unauthorized event post attempt: Invalid auth param!")
		return {"success": False}, 401

	return {"success": True}, 200
