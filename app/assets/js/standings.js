document.addEventListener("DOMContentLoaded", () => {
	fetch("/standings_data/")
		.then((response) => {
			if (!response.ok) {
				throw new Error("Network response was not ok");
			}
			return response.json();
		})
		.then((data) => {
			console.log(data);
			const standings = data;

			const standingsContainer = document.getElementById("standings-container");
			let currentRankNum = 1;
			for (const rowData of standings) {
				const teamRow = document.createElement("tr");

				const rank = document.createElement("th");
				rank.scope = "row";
				rank.textContent = currentRankNum;
				currentRankNum += 1;
				teamRow.appendChild(rank);

				for (const stat of [
					"Team",
					"GP",
					"W",
					"L",
					"D",
					"PCT",
					"PF",
					"PA",
					"PD",
				]) {
					const statNode = document.createElement("td");
					statNode.textContent = rowData[stat];
					teamRow.appendChild(statNode);
				}

				standingsContainer.appendChild(teamRow);
			}
		})
		.catch((error) => {
			console.error("There was a problem with the fetch operation:", error);
		});
});
