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

	try {
		const urlParams = new URLSearchParams(window.location.search);
		fetch(`/post-event/?auth=${urlParams.get("auth")}`, {
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
		}).then(response => {
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			document.getElementById("new-event-form").reset();
			document.getElementById("new-event-cover").onchange();
			document.getElementById("new-event-photos").onchange();

			bootstrap.Modal.getInstance(
				document.getElementById("upload-new-modal"),
			).hide();
		}).catch(err => {
			console.log(`Error!!! ${err}`)
		});
	} catch (error) {
		console.error("Error:", error);
	}
}
