import Server from "./backend/src/classes/server";
import { readdirSync } from "fs";
import Room from "./backend/src/classes/room";
const readline = require("readline-sync");


async function main() {
	const server = new Server({name: "Jossaya's Vault", network: true, api: "https://api.jcamille.tech"});

	
	const files = readdirSync(`${__dirname}/backend/settings/rooms`);
	if (files.length !== 0) {
		console.log(`There are ${files.length} rooms in the settings directory.`);
		files.forEach(async (file) => {
			console.log(`Room file: ${file}`);
			console.log(`Load this room? (y/n)`);
			const answer = readline.question("> ");
			if (answer.toLowerCase() === "y") {
				console.log(`Loading room: ${file}`);
				const room = await Room.fromFile(`${__dirname}/backend/settings/rooms/${file}`);
				server.attachRoom(room);
			} else {
				console.log(`Skipping room: ${file}`);
			}
		});
	}
	server.start();
}
try {
	main();
} catch (error) {
	console.error(error);
}


