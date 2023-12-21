import Irys from "@irys/sdk";
import Query from "@irys/query";

import dotenv from "dotenv";
dotenv.config();

const getIrys = async () => {
	const key = process.env.PRIVATE_KEY;
	const token = "matic";
	const url = "https://node2.irys.xyz";

	const irys = new Irys({
		url,
		token,
		key,
	});
	return irys;
};

// Function to check eligibility
export const isEligible = async (address) => {
	return true;

	// Get the current date at the time of running the script
	const currentDate = new Date();

	// Reset the time to 00:00:00.000 for the start of the day
	const startOfDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
	const fromTimestamp = startOfDay.getTime(); // First millisecond of the current day

	// Set the time to 23:59:59.999 for the end of the day
	const endOfDay = new Date(
		currentDate.getFullYear(),
		currentDate.getMonth(),
		currentDate.getDate(),
		23,
		59,
		59,
		999,
	);
	const toTimestamp = endOfDay.getTime();

	const myQuery = new Query({ url: "https://node2.irys.xyz/graphql" });
	const results = await myQuery
		.search("irys:transactions")
		.fields({
			id: true,
		})
		.tags([
			{ name: "application-id", values: ["merry-pointmass"] },
			{ name: "address", values: [address] },
		])
		.fromTimestamp(startOfDay)
		.toTimestamp(endOfDay);

	return results.length === 0;
};

// Function to get random points
export const getRandomPoints = () => {
	// Generate random integer between 42 and 420
	return Math.floor(Math.random() * (420 - 42 + 1)) + 42;
};

// Function to store points on Irys and return receipt
export const storePointsOnIrys = async (points, address) => {
	// Combine with any existing tags
	const tags = [
		{ name: "application-id", value: "merry-pointmass" },
		{ name: "address", value: address },
		{ name: "points", value: points.toString() },
	];
	const irys = await getIrys();
	const receipt = await irys.upload("POINTS", { tags });

	return receipt;
};

// Function to get total points
function getPointsValue(tags) {
	const pointsTag = tags.find((tag) => tag.name === "points");
	return pointsTag ? parseInt(pointsTag.value, 10) : 0;
}

export const getTotalPoints = async (address) => {
	const myQuery = new Query({ url: "https://node2.irys.xyz/graphql" });
	const results = await myQuery
		.search("irys:transactions")
		.fields({
			tags: {
				name: true,
				value: true,
			},
		})
		.tags([
			{ name: "application-id", values: ["merry-pointmass"] },
			{ name: "address", values: [address] },
		]);

	let pointCounter = 0;
	for (let i = 0; i < results.length; i++) {
		// @ts-ignore
		pointCounter += getPointsValue(results[i].tags);
	}
	return pointCounter;
};
