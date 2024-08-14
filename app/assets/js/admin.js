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

// pass canvas with image, desired width (int), desired height (int), whether to resize canvas
async function resizeCanvas(canvas, width, height) {
	const width_source = canvas.width;
	const height_source = canvas.height;

	const ratio_w = width_source / width;
	const ratio_h = height_source / height;
	const ratio_w_half = Math.ceil(ratio_w / 2);
	const ratio_h_half = Math.ceil(ratio_h / 2);

	const ctx = canvas.getContext("2d");
	const img = ctx.getImageData(0, 0, width_source, height_source);
	const img2 = ctx.createImageData(width, height);
	const data = img.data;
	const data2 = img2.data;

	for (let j = 0; j < height; j++) {
		for (let i = 0; i < width; i++) {
			const x2 = (i + j * width) * 4;
			let weight = 0;
			let weights = 0;
			let weights_alpha = 0;
			let gx_r = 0;
			let gx_g = 0;
			let gx_b = 0;
			let gx_a = 0;
			const center_y = (j + 0.5) * ratio_h;
			const yy_start = Math.floor(j * ratio_h);
			const yy_stop = Math.ceil((j + 1) * ratio_h);
			for (let yy = yy_start; yy < yy_stop; yy++) {
				const dy = Math.abs(center_y - (yy + 0.5)) / ratio_h_half;
				const center_x = (i + 0.5) * ratio_w;
				const w0 = dy * dy; //pre-calc part of w
				const xx_start = Math.floor(i * ratio_w);
				const xx_stop = Math.ceil((i + 1) * ratio_w);
				for (let xx = xx_start; xx < xx_stop; xx++) {
					const dx = Math.abs(center_x - (xx + 0.5)) / ratio_w_half;
					const w = Math.sqrt(w0 + dx * dx);
					if (w >= 1) {
						//pixel too far
						continue;
					}
					//hermite filter
					weight = 2 * w * w * w - 3 * w * w + 1;
					const pos_x = 4 * (xx + yy * width_source);
					//alpha
					gx_a += weight * data[pos_x + 3];
					weights_alpha += weight;
					//colors
					if (data[pos_x + 3] < 255) weight = (weight * data[pos_x + 3]) / 250;
					gx_r += weight * data[pos_x];
					gx_g += weight * data[pos_x + 1];
					gx_b += weight * data[pos_x + 2];
					weights += weight;
				}
			}
			data2[x2] = gx_r / weights;
			data2[x2 + 1] = gx_g / weights;
			data2[x2 + 2] = gx_b / weights;
			data2[x2 + 3] = gx_a / weights_alpha;
		}
	}
	//clear and resize canvas
	canvas.width = width;
	canvas.height = height;

	//draw
	ctx.putImageData(img2, 0, 0);

	return;
}

function displayInputImages(input, displayDivID) {
	if (input.files) {
		const newcanvas = document.createElement("canvas");
		const newctx = newcanvas.getContext("2d");

		const imgContainer = document.getElementById(displayDivID);
		imgContainer.innerHTML = "";

		for (const file of input.files) {
			const reader = new FileReader();

			reader.onload = (e) => {
				const img = document.createElement("img");
				img.src = e.target.result;
				img.onerror = () => {
					img.alt = `Failed rendering ${file.name} (possibly obscure filetype), please convert to jpeg, png, or any other more common file format`;
					img.src = "";
					// img.dataset.uploadData = reader.readAsDataURL(file).result;
				};

				img.onload = () => {
					newcanvas.width = img.width;
					newcanvas.height = img.height;
					newctx.drawImage(img, 0, 0);

					const targetRatio = Math.min(
						Math.min(img.width, 1280) / img.width,
						Math.min(img.height, 1440) / img.height,
					);
					resizeCanvas(
						newcanvas,
						Math.floor(img.width * targetRatio),
						Math.floor(img.height * targetRatio),
					).then((outputCanvas) => {
						img.dataset.uploadData = newcanvas.toDataURL("image/jpeg", 0.8);
					});

					img.classList.add("img-fluid");
				};

				imgContainer.appendChild(img);
			};

			reader.readAsDataURL(file);
		}
	}
}

function submitNewEvent() {
	const title = document.getElementById("new-event-title").value;
	const desc = document.getElementById("new-event-desc").value;
	const date = document.getElementById("new-event-date").value;
	const cover =
		document.getElementById("cover-display").children[0]?.dataset.uploadData;
	const photos = Array.from(document.getElementById("photo-display").children)
		.map((child) => child.dataset.uploadData)
		.filter((item) => item);

	if (!title || !desc || !date || !cover || !photos.length) {
		alert("Fill all sections before uploading!");
		return;
	}

	const uploadButtonContainer = document.getElementById(
		"upload-new-event-modal-footer",
	);

	const oldUploadButtons = uploadButtonContainer.innerHTML;

	uploadButtonContainer.innerHTML = "";

	const uploadSpinner = document.createElement("div");
	uploadSpinner.classList.add("spinner-border");
	uploadSpinner.classList.add("text-primary");
	uploadSpinner.role = "status";
	uploadButtonContainer.appendChild(uploadSpinner);

	const urlParams = new URLSearchParams(window.location.search);
	fetch(`/api/post-new-event/?auth=${urlParams.get("auth")}`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			title: title,
			desc: desc,
			date: date,
			cover: cover,
			photos: photos,
		}),
	})
		.then((response) => {
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			document.getElementById("new-event-form").reset();
			document.getElementById("new-event-cover").onchange();
			document.getElementById("new-event-photos").onchange();

			bootstrap.Modal.getInstance(
				document.getElementById("upload-new-modal"),
			).hide();

			uploadButtonContainer.innerHTML = oldUploadButtons;
		})
		.catch((err) => {
			console.log(`Error!!! ${err}`);
		});
}

function showElementByID(elementID) {
	document.getElementById(elementID).classList.remove("d-none");
}

function hideElementByID(elementID) {
	document.getElementById(elementID).classList.add("d-none");
}

function updateEditEventsModal() {
	const eventContainer = document.getElementById("event-accordion");
	const exampleEvent = document.getElementById("example-editable-event");

	fetch("/api/get-all-events")
		.then((resp) => {
			if (!resp.ok) {
				throw new Error(`Failed fetching event data! ${resp.status}`);
			}
			return resp.json();
		})
		.then((allEventData) => {
			exampleEvent.classList.add("d-none");

			exampleEvent.remove();
			document.body.appendChild(exampleEvent);

			while (eventContainer.children.length > 0) {
				eventContainer.children[0].remove();
			}

			for (const eventData of allEventData) {
				const newEvent = exampleEvent.cloneNode(true);
				newEvent.classList.remove("d-none");
				newEvent.id = `event-${eventData._id}`;

				const newHeader = newEvent.querySelector(
					"#example-event-accordion-header",
				);
				newHeader.id = `header-${eventData._id}`;
				newHeader.innerText = `${eventData.title} - ${eventData.date}`;
				newHeader.dataset.bsTarget = `#event-${eventData._id} #content-${eventData._id}`;
				newHeader.ariaControls = `#event-${eventData._id} #content-${eventData._id}`;
				// change aria-controls

				const newContent = newEvent.querySelector("#example-event-content");
				newContent.id = `content-${eventData._id}`;
				newContent.classList.remove("item-1");

				const newTitle = newEvent.querySelector(
					"#example-editable-event-title",
				);
				newTitle.id = `title-${eventData._id}`;
				newTitle.innerText = eventData.title;

				const newEditingTitle = newEvent.querySelector(
					"#example-editing-event-title",
				);
				newEditingTitle.id = `title-editing-${eventData._id}`;
				newEditingTitle.value = eventData.title;

				const newDate = newEvent.querySelector("#example-editable-event-date");
				newDate.id = `date-${eventData._id}`;
				newDate.innerText = eventData.date;

				const newEditingDate = newEvent.querySelector(
					"#example-editing-event-date",
				);
				newEditingDate.id = `date-editing-${eventData._id}`;
				newEditingDate.value = eventData.date;

				const newDesc = newEvent.querySelector("#example-editable-event-desc");
				newDesc.id = `desc-${eventData._id}`;
				newDesc.innerText = eventData.desc;

				const newEditingDesc = newEvent.querySelector(
					"#example-editing-event-desc",
				);
				newEditingDesc.id = `desc-editing-${eventData._id}`;
				newEditingDesc.innerText = eventData.desc;

				const newCover = newEvent.querySelector("#example-editable-cover");
				newCover.id = `cover-${eventData._id}`;
				newCover.src = eventData.cover;

				const newCoverDeleteButton = newEvent.querySelector(
					"#example-editable-cover-delete-button",
				);
				newCoverDeleteButton.id = `cover-delete-button-${eventData._id}`;
				newCoverDeleteButton.onclick = () => {
					deleteCover(eventData._id);
				};

				const newCoverAddButton = newEvent.querySelector(
					"#example-editable-cover-add-button",
				);
				newCoverAddButton.id = `cover-add-button-${eventData._id}`;

				newCoverAddButton.onchange = () => {
					const reader = new FileReader();

					reader.onload = (e) => {
						newCover.src = e.target.result;
						newCover.onerror = () => {
							alert(
								`Failed rendering ${file.name} (possibly obscure filetype), please convert to jpeg, png, or any other more common file format`,
							);
							newCover.src = FAILED_IMAGE_URL;
						};
					};

					reader.readAsDataURL(newCoverAddButton.files[0]);

					if (newCover.src !== FAILED_IMAGE_URL) {
						hideElementByID(`cover-add-button-${eventData._id}`);
						showElementByID(`cover-delete-button-${eventData._id}`);
					}
				};

				const newPhotoContainer = newEvent.querySelector(
					"#example-event-photo-container",
				);
				newPhotoContainer.id = `photo-container-${eventData._id}`;

				const basePhotoHolder = newEvent.querySelector(
					"#example-event-accordion-photo",
				);
				for (photoURL of eventData.photos) {
					const newPhotoHolder = basePhotoHolder.cloneNode(true);
					newPhotoHolder.classList.remove("d-none");
					const photoID = `${eventData._id}-${photoURL.split("/").at(-1)}`;
					newPhotoHolder.id = `photo-holder-${photoID}`;

					const newPhoto = newPhotoHolder.querySelector(
						"#example-editable-image",
					);
					newPhoto.id = `photo-${photoID}`;
					newPhoto.src = photoURL;

					const newPhotoDeleteButton = newPhotoHolder.querySelector(
						"#example-editable-image-delete-button",
					);
					newPhotoDeleteButton.id = `photo-delete-button-${photoID}`;
					newPhotoDeleteButton.onclick = () => deletePhoto(photoID);

					newPhotoContainer.appendChild(newPhotoHolder);
				}

				basePhotoHolder.classList.add("d-none");

				basePhotoHolder.remove();
				document.body.appendChild(basePhotoHolder);

				const newPhotoAddButtonHolder = newEvent.querySelector(
					"#example-editable-add-photo-button-holder",
				);
				newPhotoAddButtonHolder.id = `photo-add-button-holder-${eventData._id}`;

				const newPhotoAddButton = newEvent.querySelector(
					"#example-editable-add-photo-button",
				);
				newPhotoAddButton.id = `photo-add-button-${eventData._id}`;

				newPhotoAddButton.onchange = () => {
					const reader = new FileReader();

					reader.onload = (e) => {
						const newPhotoHolder = basePhotoHolder.cloneNode(true);
						newPhotoHolder.classList.remove("d-none");
						const photoID = `${eventData._id}-${randomUUID()}`;
						newPhotoHolder.id = `photo-holder-${photoID}`;

						const newPhoto = newPhotoHolder.querySelector(
							"#example-editable-image",
						);
						newPhoto.id = `photo-${photoID}`;
						newPhoto.src = e.target.result;
						newPhoto.onerror = () => {
							alert(
								`Failed rendering ${file.name} (possibly obscure filetype), please convert to jpeg, png, or any other more common file format`,
							);
							newPhoto.src = FAILED_IMAGE_URL;
						};

						const newPhotoDeleteButton = newPhotoHolder.querySelector(
							"#example-editable-image-delete-button",
						);
						newPhotoDeleteButton.id = `photo-delete-button-${photoID}`;
						newPhotoDeleteButton.onclick = () => deletePhoto(photoID);

						newPhotoContainer.appendChild(newPhotoHolder);
					};

					reader.readAsDataURL(newPhotoAddButton.files[0]);
				};

				const newDeleteButton = newEvent.querySelector(
					"#example-editable-event-delete-button",
				);
				newDeleteButton.id = `delete-button-${eventData._id}`;
				newDeleteButton.onclick = () => deleteEvent(eventData._id);

				const newEditButton = newEvent.querySelector(
					"#example-editable-event-edit-button",
				);
				newEditButton.id = `edit-button-${eventData._id}`;
				newEditButton.onclick = () => startEditingEvent(eventData._id);

				const newCancelButton = newEvent.querySelector(
					"#example-editable-event-cancel-button",
				);
				newCancelButton.id = `cancel-button-${eventData._id}`;
				newCancelButton.onclick = () => cancelEditingEvent(eventData._id);

				const newSaveButton = newEvent.querySelector(
					"#example-editable-event-save-button",
				);
				newSaveButton.id = `save-button-${eventData._id}`;
				newSaveButton.onclick = () => saveEvent(eventData._id);

				eventContainer.appendChild(newEvent);
			}
		})
		.catch((err) => {
			console.log(err);
		});
}

addEventListener("DOMContentLoaded", () => {
	updateEditEventsModal();
});

function startEditingEvent(eventID) {
	hideElementByID(`title-${eventID}`);
	showElementByID(`title-editing-${eventID}`);

	hideElementByID(`date-${eventID}`);
	showElementByID(`date-editing-${eventID}`);

	hideElementByID(`desc-${eventID}`);
	showElementByID(`desc-editing-${eventID}`);

	showElementByID(`cover-${eventID}`);

	hideElementByID(`edit-button-${eventID}`);
	hideElementByID(`delete-button-${eventID}`);

	showElementByID(`save-button-${eventID}`);
	showElementByID(`cancel-button-${eventID}`);

	showElementByID(`cover-delete-button-${eventID}`);

	for (const child of document.getElementById(`photo-container-${eventID}`)
		.children) {
		if (child.id === `photo-add-button-holder-${eventID}`) {
			continue;
		}
		const photoID = child.id.split("photo-holder-").at(-1);
		showElementByID(`photo-delete-button-${photoID}`);
	}

	showElementByID(`photo-add-button-holder-${eventID}`);
	showElementByID(`photo-add-button-${eventID}`);
}

function cancelEditingEvent(eventID) {
	showElementByID(`title-${eventID}`);
	hideElementByID(`title-editing-${eventID}`);

	showElementByID(`date-${eventID}`);
	hideElementByID(`date-editing-${eventID}`);

	showElementByID(`desc-${eventID}`);
	hideElementByID(`desc-editing-${eventID}`);

	showElementByID(`edit-button-${eventID}`);
	showElementByID(`delete-button-${eventID}`);

	hideElementByID(`save-button-${eventID}`);
	hideElementByID(`cancel-button-${eventID}`);

	hideElementByID(`cover-delete-button-${eventID}`);

	for (const child of document.getElementById(`photo-container-${eventID}`)
		.children) {
		if (child.id === `photo-add-button-holder-${eventID}`) {
			continue;
		}
		const photoID = child.id.split("photo-holder-").at(-1);
		hideElementByID(`photo-delete-button-${photoID}`);
	}

	hideElementByID(`photo-add-button-holder-${eventID}`);
	hideElementByID(`photo-add-button-${eventID}`);

	setTimeout(() => updateEditEventsModal(), 1000);
}

function deleteEvent(eventID) {
	const urlParams = new URLSearchParams(window.location.search);
	fetch(`/api/delete-event/?auth=${urlParams.get("auth")}`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			id: eventID,
		}),
	})
		.then((response) => {
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
		})
		.catch((err) => {
			console.log(`Error!!! ${err}`);
		});

	setTimeout(() => updateEditEventsModal(), 1000);
}

function deleteCover(eventID) {
	const cover = document.getElementById(`cover-${eventID}`);
	cover.src = FAILED_IMAGE_URL;

	hideElementByID(`cover-delete-button-${eventID}`);
	showElementByID(`cover-add-button-${eventID}`);
}

function deletePhoto(photoID) {
	const photo = document.getElementById(`photo-holder-${photoID}`);
	photo.remove();
}

function saveEvent(eventID) {
	const newTitle = document.getElementById(`title-editing-${eventID}`).value;
	const newDate = document.getElementById(`date-editing-${eventID}`).value;
	const newDesc = document.getElementById(`desc-editing-${eventID}`).value;
	const newCover = document.getElementById(`cover-${eventID}`).src;

	if (newCover.src === FAILED_IMAGE_URL) {
		alert("Please add a cover!");
		return;
	}

	const newPhotos = [];
	const photoContainer = document.getElementById(`photo-container-${eventID}`);
	for (const child of photoContainer.children) {
		if (child.id === `photo-add-button-holder-${eventID}`) {
			continue;
		}

		const photoID = child.id.split("photo-holder-").at(-1);
		newPhotos.push(document.getElementById(`photo-${photoID}`).src);
	}

	const urlParams = new URLSearchParams(window.location.search);
	fetch(`/api/save-event/?auth=${urlParams.get("auth")}`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			id: eventID,
			title: newTitle,
			date: newDate,
			desc: newDesc,
			cover: newCover,
			photos: newPhotos,
		}),
	})
		.then((response) => {
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
		})
		.catch((err) => {
			console.log(`Error!!! ${err}`);
		});

	setTimeout(() => updateEditEventsModal(), 1000);
}
