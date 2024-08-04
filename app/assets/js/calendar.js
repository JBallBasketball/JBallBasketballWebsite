document.addEventListener("DOMContentLoaded", () => {
	const calendarEl = document.getElementById("calendar");

	const isMobile = window.orientation > -1;
	const defaultView = "seasonView"; // isMobile ? "listMonth" : "dayGridMonth";

	const calendar = new FullCalendar.Calendar(calendarEl, {
		initialView: defaultView,
		views: {
			seasonView: {
				// visibleRange: (currentDate) => {
				// 	const startDate = new Date(currentDate.valueOf());
				// 	const endDate = new Date(currentDate.valueOf());

				// 	startDate.setDate(startDate.getDate() - 1);
				// 	endDate.setDate(endDate.getDate() + 2);

				// 	return { start: startDate, end: endDate };
				// },
				type: 'list',
				duration: { years: 2 }
			},
		},
		googleCalendarApiKey: "AIzaSyArpnXq7FTW0zC66yjkU29xkQSVNULGZK4",
		events: {
			googleCalendarId:
				"83a5402b35c85f1fb47a597373e1bbac4d77ca93a679fbfc00cba9f7bd65e0a7@group.calendar.google.com",
		},
		timeZone: "local",
		themeSystem: "bootstrap5",
		headerToolbar: {
			left: "prev,next today",
			center: "title",
			right: "multiMonthYear,dayGridMonth,timeGridWeek,seasonView",
		},
		weekNumbers: false,
		dayMaxEvents: true, // allow "more" link when too many events
		defaultAllDay: false,
	});

	calendar.render();
});
