import blessed from "blessed";
import { getDay, getDaysInMonth } from "date-fns";
import figlet from "figlet";
import { isEligible, getRandomPoints, storePointsOnIrys, getTotalPoints } from "./pointmass-irys.js";
import { ethers } from "ethers";

const ethereumAddress = process.argv[2];
if (!ethers.utils.isAddress(ethereumAddress)) {
	console.error("Invalid Ethereum address.");
	process.exit(1);
}

/*** UI STUFF */
const truncateString = (str, num) => {
	if (str.length <= num) return str;
	return str.slice(0, num) + "..." + str.slice(-num);
};

const activeDay = 21; // Example active day

// Create a screen object for blessed
const screen = blessed.screen({
	smartCSR: true,
	title: "Holiday Calendar",
});

const dayBoxWidth = 6; // Width of each day box
const dayBoxHeight = 3; // Height of each day box
const BORDER_PADDING = 2; // Border padding size for the calendar box

// Festive color palette
const palette = {
	background: "#ADD8E6", // Light blue background
	borderColor: "#FFFFFF", // White border
	dayColor: "#FFFFFF", // White for the days
	weekendColor: "#FF6347", // Red for the weekends
	specialDayColor: "#32CD32", // Green for special days like Christmas
};

// Shades of blue for the snowflake pattern
const shadesOfBlue = [
	"#ADD8E6", // Light blue
	"#87CEFA", // Sky blue
	"#87CEEB", // Light sky blue
	"#00BFFF", // Deep sky blue
	"#1E90FF", // Dodger blue
	"#4169E1", // Royal blue
	"#0000FF", // Blue
	"#0000CD", // Medium blue
	"#00008B", // Dark blue
	"#191970", // Midnight blue
];

// Use figlet to create ASCII art text for the title
figlet(
	"Merry Pointmass",
	{
		font: "Standard",
		horizontalLayout: "default",
		verticalLayout: "default",
	},
	(err, asciiArt) => {
		if (err) {
			throw new Error(`Could not generate ASCII art: ${err}`);
		}

		// Create a box for the "Merry Pointmass" title
		const titleBox = blessed.box({
			top: 0, // Position at the top of the screen
			left: "center",
			width: "100%", // Span the entire width
			height: asciiArt.split("\n").length, // The height of the figlet text
			content: asciiArt,
			tags: true,
			align: "center",
			valign: "middle",
			style: {
				fg: "red", // Festive red color for the title
				bg: palette.background,
			},
		});

		// Append the title box to the screen
		screen.append(titleBox);

		// Create a box for the entire calendar, position it below the title box
		const calendarBox = blessed.box({
			top: titleBox.height + 1,
			left: "center",
			width: dayBoxWidth * 7 + BORDER_PADDING * 2,
			height: dayBoxHeight * 6 + BORDER_PADDING * 2,
			content: "",
			tags: true,
			style: {
				fg: palette.dayColor,
				bg: palette.background,
				border: {
					fg: palette.borderColor,
				},
			},
			border: {
				type: "line",
			},
		});

		// Create a day box with a specific background color
		const createDayBox = (day, fgColor, bgColor, width, height, left, top) => {
			return blessed.box({
				width: width,
				height: height,
				left: left,
				top: top,
				content: `{center}${day}{/center}`,
				tags: true,
				style: {
					fg: fgColor,
					bg: bgColor,
				},
			});
		};

		screen.render();

		const drawCalendar = () => {
			const year = new Date().getFullYear();

			const month = 11; // December
			const daysInMonth = getDaysInMonth(new Date(year, month));
			const firstDayOfWeek = getDay(new Date(year, month, 1));

			// Clear the calendar box before drawing new content
			calendarBox.setContent("");
			calendarBox.detach();
			screen.append(calendarBox);

			let dayCounter = 1;
			for (let week = 0; week < 6; week++) {
				for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
					if (week === 0 && dayOfWeek < firstDayOfWeek) {
						// Skip days until first day of December
						continue;
					}
					if (dayCounter > daysInMonth) {
						// Stop if we've reached the end of December
						break;
					}

					// Determine the background color for each day
					const bgColor = shadesOfBlue[dayCounter % shadesOfBlue.length];

					// Create and position day boxes
					const dayBox = createDayBox(
						dayCounter,
						palette.dayColor,
						bgColor,
						dayBoxWidth,
						dayBoxHeight,
						dayOfWeek * dayBoxWidth + BORDER_PADDING,
						week * dayBoxHeight + BORDER_PADDING,
					);
					calendarBox.append(dayBox);

					dayCounter++;
				}
			}
			screen.render();
		};

		const holidayRed = "red";
		const startAnimation = async (activeDay) => {
			// Get all day boxes
			const dayBoxes = calendarBox.children.slice(); // Clone the array
			const activeDayString = activeDay.toString();

			// Find the active day box and get its color
			const activeBox = dayBoxes.find(
				(box) =>
					box
						.getContent()
						.replace(/{\/?center}/g, "")
						.trim() === activeDayString,
			);
			const activeColor = holidayRed;
			//activeBox.style.bg;

			// Turn off lights randomly over 3 seconds for inactive day boxes
			const totalDuration = 3000; // Total duration of the animation
			let elapsed = 0; // Time elapsed since the animation started

			const interval = setInterval(() => {
				if (elapsed >= totalDuration) {
					clearInterval(interval); // Stop the "turning off" animation after 3 seconds

					// Now, start turning them back on with the active day color
					dayBoxes.forEach((box) => {
						// Skip the active day box
						if (box !== activeBox) {
							box.setContent("");
							box.style.bg = activeColor;
						}
					});
					screen.render(); // Render the screen to show changes

					return;
				}

				// Randomly select an inactive square to turn off if any are left
				const inactiveDayBoxes = dayBoxes.filter((box) => box !== activeBox && box.getContent() !== "");
				if (inactiveDayBoxes.length > 0) {
					const randomIndex = Math.floor(Math.random() * inactiveDayBoxes.length);
					const boxToTurnOff = inactiveDayBoxes[randomIndex];
					boxToTurnOff.setContent(""); // Clear the content
					boxToTurnOff.style.bg = "red"; // Match the background color
				}

				elapsed += 100; // Increment the elapsed time
				screen.render(); // Render the screen to show changes
			}, 100); // Update every 100 milliseconds

			setTimeout(() => {
				// Change the background color of the calendarBox

				calendarBox.style.bg = holidayRed;

				// Clear content of all boxes (to simulate turning them back on with no numbers)
				calendarBox.children.forEach((box) => {
					box.setContent("");
					box.style.bg = holidayRed;
				});

				// Ensure the active day box is still visible
				// activeBox.setContent(activeDayString);
				activeBox.style.bg = holidayRed;
				// activeBox.style.fg = palette.dayColor;

				// Render the changes
				screen.render();
			}, 3000);

			setTimeout(() => {
				calendarBox.style.bg = holidayRed;

				// 1. Remove the number from the active day
				activeBox.setContent("");
				// Render the changes
				screen.render();
				performAction();
			}, 3100);
		};

		// const message = `Welcome to day ${activeDay} of Pointmass, ready to see what you're getting today?\n\nPress space to continue.`;
		const messageBox = blessed.text({
			parent: screen, // Parent it directly to the screen, not calendarBox
			top: titleBox.height + 1, // Position it right below the titleBox
			left: "center",
			width: "100%",
			height: "100%-1", // Full screen height minus one for the titleBox height
			content: "",
			tags: true,
			align: "left", // Align text to the left
			valign: "top", // Align text to the top
			scrollable: true,
			alwaysScroll: true,
			keys: true,
			vi: true,
			mouse: true, // If you want to enable mouse scrolling as well
			style: {
				fg: "white", // Text color
				bg: palette.background, // Background color
			},
		});

		screen.append(messageBox); // Append the messageBox to the screen

		messageBox.hide();

		const displayMessage = (message) => {
			messageBox.setContent(message);
			messageBox.show();
			screen.render();
		};
		let currentContent = "";
		const appendContent = (newContent) => {
			currentContent += (currentContent ? "\n" : "") + newContent; // Append with new line if not empty
			messageBox.setContent(currentContent); // Set the new content
			messageBox.setScrollPerc(100); // Scroll to the bottom to show latest content
			screen.render(); // Render the updated screen
		};

		// Display messages and perform actions based on the current step
		let stepCounter = 0;
		let points = 0;
		const performAction = async () => {
			switch (stepCounter) {
				case 0:
					await startAnimation(activeDay);
					break;
				case 1:
					// Remove the calendar
					calendarBox.detach();
					// Adjust messageBox to full screen, below the titleBox
					messageBox.top = titleBox.height + 1;
					messageBox.width = "100%";
					messageBox.height = "100%-1";
					messageBox.show();

					// Check to see if the person has used this today
					if (!(await isEligible(ethereumAddress))) {
						displayMessage("You've already claimed points for today\n\nPress q to exit.");
						stepCounter = 42;
					} else {
						displayMessage(
							`Welcome to day ${activeDay} of Pointmass!\n\nReady to see what you're getting today?\n\nPress space to continue.`,
						);
					}
					break;
				case 2:
					points = getRandomPoints();
					displayMessage(
						`Rolling the random point generator... \nYou've earned ${points} points.\n\nPress space to save.`,
					);
					break;
				case 3:
					const receipt = await storePointsOnIrys(points, ethereumAddress);
					// Format the receipt
					const formattedReceipt = `
\tPublic: ${truncateString(receipt.public, 20)}
\tVersion: ${receipt.version}
\tID: ${truncateString(receipt.id, 20)}
\tTimestamp: ${new Date(receipt.timestamp).toLocaleString()}
\tSignature: ${truncateString(receipt.signature, 20)}
\tDeadline Height: ${receipt.deadlineHeight}
`;

					displayMessage(
						"Your points have been permanently stored on Irys, here's your receipt:\n\n" + formattedReceipt,
					);
					break;

				case 4:
					const totalPoints = await getTotalPoints(ethereumAddress);
					displayMessage(`You have ${totalPoints} total points,  come back tomorrow to earn more.`);
					break;
				case 5:
					return process.exit(0); // Exit the application
					break;
				default:
					// Reset or end the process
					stepCounter = -1;
					break;
			}
			stepCounter++;
		};

		// Key event listener
		screen.key(["escape", "q", "C-c", "space"], (ch, key) => {
			if (key.name === "escape" || key.name === "q" || key.name === "C-c") {
				return process.exit(0); // Exit the application
			} else if (key.name === "space") {
				performAction();
			}
		});

		drawCalendar();
		screen.render();
	},
);
