function randomUUID() {
	return Math.random().toString(36).substring(2, 10);
}

fetch("/api/get-all-event-links")
	.then((resp) => {
		if (!resp.ok) {
			throw new Error(`Failed fetching event data! ${resp.status}`);
		}
		return resp.json();
	})
	.then((allEventData) => {
		const examplePhotoCard = document.getElementById("example-photo-card");
		const photoCardContainer = document.getElementById("photo-card-container");

		for (eventData of allEventData) {
			const newPhotoCard = examplePhotoCard.cloneNode(true);
			newPhotoCard.removeAttribute("id");

			const title = newPhotoCard.querySelector("#example-photo-card-title");
			const desc = newPhotoCard.querySelector("#example-photo-card-desc");
			const date = newPhotoCard.querySelector("#example-photo-card-date");
			const cover = newPhotoCard.querySelector("#example-photo-card-cover");
			const button = newPhotoCard.querySelector("#example-photo-card-button");
			const modal = newPhotoCard.querySelector("#example-photo-card-modal");

			title.removeAttribute("id");
			desc.removeAttribute("id");
			date.removeAttribute("id");
			cover.removeAttribute("id");
			button.removeAttribute("id");

			title.innerHTML = eventData.title;
			desc.innerHTML = eventData.desc;
			date.innerHTML = eventData.date;

			cover.src = eventData.cover;

			const modalID = randomUUID();
			modal.id = `modal-${modalID}`;
			button.dataset.bsTarget = `#modal-${modalID}`;

			modal.querySelector(".modal-title").innerHTML =
				`${eventData.title} - ${eventData.date}`;

			const exampleModalImage = modal.querySelector("#example-modal-image");

			for (photo of eventData.photos) {
				const newModalImage = exampleModalImage.cloneNode(true);
				newModalImage.removeAttribute("id");
				newModalImage.classList.remove("invisible-intangible");

				newModalImage.querySelector("a").href = photo;
				newModalImage.querySelector("img").src = photo;

				exampleModalImage.parentElement.appendChild(newModalImage);
			}

			exampleModalImage.remove();

			photoCardContainer.appendChild(newPhotoCard);
		}

		examplePhotoCard.remove();
	})
	.catch((err) => {
		console.log(err);
	});
