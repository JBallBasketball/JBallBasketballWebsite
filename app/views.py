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

# from sendgrid import SendGridAPIClient
# from sendgrid.helpers.mail import Mail

if os.environ.get('FLASK_ENV') == 'development':
	from dotenv import load_dotenv

	load_dotenv()

views = Blueprint('views', __name__)

# sg = SendGridAPIClient(os.environ['SENDGRID_API_KEY'])

# EMAIL_VERIFICATION_API_KEY = os.environ["EMAIL_VERIFICATION_API_KEY"]

BLOB_READ_WRITE_TOKEN = os.environ["BLOB_READ_WRITE_TOKEN"]

google_service_account_key = json.loads(os.environ["GOOGLE_SERVICE_ACCOUNT_KEY"])
service_account = gspread.service_account_from_dict(google_service_account_key)

otp_validator = pyotp.TOTP(os.environ["OTP_SECRET_KEY"])


def get_standings_sheet_data():
	return service_account.open_by_key("1Fz02ntmQ7oQdZPYXKBAR0wgjYWlAsw8qtnrAuO5A7Dk").sheet1.get_all_records()


@views.route("/assets/<path:path>")
def static_dir(path):
	return send_from_directory("assets", path)


@views.route('/sitemap.xml')
@views.route('/robots.txt')
def sitemap_and_robots():
	return send_from_directory("assets", request.path[1:])


@views.route("/<path:path>.html/", methods=['GET'])
def html_redirect(path):
	return redirect(f"/{path}")


@views.route('/', methods=['GET'])
def index():
	return render_template("index.html")


@views.route('/calendar/', methods=['GET'])
def calendar():
	return render_template("calendar.html")


@views.route('/coaches/', methods=['GET'])
def coaches():
	return render_template("coaches.html")


@views.route('/photos/', methods=['GET'])
def photos():
	return render_template("photos.html")


@views.route('/standings/', methods=['GET'])
def standings():
	return render_template("standings.html")


@views.route('/standings_data/', methods=['GET'])
def standings_data():
	return get_standings_sheet_data()


@views.route('/contact/', methods=['GET'])
def contact():
	return render_template("contact.html")


@views.route('/signup/', methods=['GET'])
def signup():
	return render_template("signup.html")


valid_account_creds = list(map(lambda el: tuple(el.split(":")), os.environ["ADMIN_LOGINS"].split(",")))
valid_temp_creds = {}  # {(ip, auth code): timestamp}
failed_login_attempts = {}
banned_ips = []


@views.route('/admin/', methods=['GET'])
def admin():
	# return render_template("admin.html")

	if ("auth" in request.args) and ((key := (request.remote_addr, request.args.get("auth"))) in valid_temp_creds):
		if time.time() - valid_temp_creds[key] <= 3600:  # 1 hour
			return render_template("admin.html")
	return redirect(url_for("views.admin_login"))


@views.route('/admin-login/', methods=['GET'])
def admin_login():
	return render_template("admin-login.html")


@views.route('/admin-login/', methods=['POST'])
def admin_login_post():
	ip = request.remote_addr

	if ip in banned_ips:
		return redirect(url_for("views.admin_login"))

	username = request.form.get("username")
	password = request.form.get("password")
	otp = request.form.get("otp")

	print(username, password, otp, valid_account_creds, otp_validator.now())
	if (username, password) in valid_account_creds and otp_validator.verify(otp):
		temp_auth_code = pyotp.random_base32()
		valid_temp_creds[(ip, temp_auth_code)] = time.time()
		return redirect(url_for("views.admin", auth=temp_auth_code))

	if ip not in failed_login_attempts:
		failed_login_attempts[ip] = 0
	failed_login_attempts[ip] += 1

	if failed_login_attempts[ip] > 10:
		banned_ips.append(ip)

	return redirect(url_for("views.admin_login"))


@views.route("/get-all-event-links/", methods=['GET'])
def get_all_event_links():
	return [event["url"] for event in req.get("https://blob.vercel-storage.com",
	                                          headers={
		                                          "authorization": "Bearer " + BLOB_READ_WRITE_TOKEN,
		                                          "prefix": "events/"
	                                          }).json()["blobs"] if event["size"] and event["pathname"].startswith("events/")]


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


@views.route("/post-event/", methods=['POST'])
def post_event():
	event_data = request.json

	if "auth" not in request.args:
		return {}, 401

	if not (((key := (request.remote_addr, request.args.get("auth"))) in valid_temp_creds
			and time.time() - valid_temp_creds[key] <= 3600)):  # 1 hour
		return redirect(url_for("views.admin_login"))

	if ("title" not in event_data
			or "desc" not in event_data
			or "date" not in event_data
			or "cover" not in event_data
			or "photos" not in event_data):
		return {}, 400

	event_data["cover"] = upload_image(optimize_image(event_data["cover"]))

	event_data["photos"] = list(map(lambda data_url: upload_image(optimize_image(data_url)), event_data["photos"]))

	req.put(f"https://blob.vercel-storage.com/events/{event_data["date"]}.json", data=json.dumps(event_data), headers={
		"access": "public",
		"authorization": f"Bearer {BLOB_READ_WRITE_TOKEN}",
		"x-api-version": "4",
		"x-content-type": 'application/json',
		"x-cache-control-max-age": f"{0}",  # Not cached
	})

	return {}, 200
