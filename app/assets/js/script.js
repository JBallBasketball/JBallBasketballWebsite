document.addEventListener("DOMContentLoaded", () => {
	const pageLinks = document.getElementById("navbar-links").children;

	Array.prototype.forEach.call(pageLinks, (link) => {
		if (link.children[0].href === document.URL) {
			link.children[0].classList.add("active");
		}
	});
});
