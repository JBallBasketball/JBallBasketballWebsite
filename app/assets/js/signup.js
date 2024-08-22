function sendSignupToSheet() {
	const signupForm = document.getElementById("signup-form");

	const formInputs = {};

	for (const input of signupForm.querySelectorAll("input")) {
		if (input.type === "radio" && !input.checked) {
			if (!(input.name in formInputs)) {
				formInputs[input.name] = ["", input.required];
			}
			continue;
		}

		formInputs[input.name] = [input.value, input.required];
	}

	for (const [key, [value, required]] of Object.entries(formInputs)) {
		if (required && value === "") {
			return;
		}
	}

	console.log("Hello!");
}
