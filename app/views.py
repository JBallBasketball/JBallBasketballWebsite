import json
import os

import gspread
from flask import Blueprint, render_template, send_from_directory, redirect, request, url_for

import app.database as database

if os.environ.get('FLASK_ENV') == 'development':
	from dotenv import load_dotenv

	load_dotenv()

views = Blueprint('views', __name__)

google_service_account_key = json.loads(os.environ["GOOGLE_SERVICE_ACCOUNT_KEY"])
service_account = gspread.service_account_from_dict(google_service_account_key)


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


@views.route('/contact/', methods=['GET'])
def contact():
	return render_template("contact.html")


@views.route('/signup/', methods=['GET'])
def signup():
	return render_template("signup.html")


@views.route('/regular-season-signup/', methods=['GET'])
def regular_season_signup():
	return render_template("regular-season-signup.html")


@views.route('/regular-season-signup/', methods=['POST'])
def regular_season_signup_post():
	database.add_signup(request.form)
	return redirect(url_for("views.index"))


valid_account_creds = list(map(lambda el: tuple(el.split(":")), os.environ["ADMIN_LOGINS"].split(",")))


@views.route('/admin/', methods=['GET'])
def admin():
	# return render_template("admin.html")

	if ("auth" in request.args) and database.validate_temp_cred(request.remote_addr, request.args.get("auth")):
		return render_template("admin.html")
	return redirect(url_for("views.admin_login"))


@views.route('/admin-login/', methods=['GET'])
def admin_login():
	return render_template("admin-login.html")


@views.route('/admin-login/', methods=['POST'])
def admin_login_post():
	ip = request.remote_addr

	# if ip in banned_ips:
	# 	return redirect(url_for("views.admin_login"))

	username = request.form.get("username")
	password = request.form.get("password")
	# otp = request.form.get("otp")

	if (username, password) in valid_account_creds:  # and otp_validator.verify(otp):
		auth_code = database.add_temp_cred(ip)
		return redirect(url_for("views.admin", auth=auth_code))

	# if ip not in failed_login_attempts:
	# 	failed_login_attempts[ip] = 0
	# failed_login_attempts[ip] += 1
	#
	# if failed_login_attempts[ip] > 10:
	# 	banned_ips.append(ip)

	return redirect(url_for("views.admin_login"))
