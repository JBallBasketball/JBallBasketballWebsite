import os

from flask import Blueprint, request

import app.database as database

# import requests as req

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


@api.route("/get-sponsors/", methods=['GET'])
def get_sponsors():
	return database.get_sponsors()


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


@api.route("/update-sponsors/", methods=['POST'])
def update_sponsors():
	if "auth" not in request.args:
		print("Unauthorized event post attempt: No auth param!")
		return {"success": False}, 401

	if not database.validate_temp_cred(request.remote_addr, request.args.get("auth")):  # 1 hour
		print("Unauthorized event post attempt: Invalid auth param!")
		return {"success": False}, 401

	database.update_sponsors()

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
