const FAILED_IMAGE_URL =
	"https://cdn.bootstrapstudio.io/placeholders/1400x800.png";

function randomUUID() {
	return Math.random().toString(36).substring(2, 10);
}

const loginValidChecker = setInterval(() => {
	const urlParams = new URLSearchParams(window.location.search);
	fetch(`/api/check-login-validity/?auth=${urlParams.get("auth")}`).then(
		(resp) => {
			if (resp.status !== 200) {
				window.location.replace("/admin-login/");
				throw new Error(`Failed validating login credentials! ${resp.status}`);
			}
		},
	);
}, 10000);

function showElementByID(elementID) {
	document.getElementById(elementID).classList.remove("d-none");
}

function hideElementByID(elementID) {
	document.getElementById(elementID).classList.add("d-none");
}

function updateEvents() {
	hideElementByID("update-events-button")
	showElementByID("update-events-spinner")

	const urlParams = new URLSearchParams(window.location.search);
	fetch(`/api/update-events/?auth=${urlParams.get("auth")}`, {
		method: "POST",
	}).then((resp) => {
		if (resp.status !== 200) {
			alert("Updating events failed!");
		}
		hideElementByID("update-events-spinner")
		showElementByID("update-events-button")
	});
}
