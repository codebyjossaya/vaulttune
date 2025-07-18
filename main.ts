import Server from "./backend/src/classes/server";
import { readdirSync, existsSync,mkdirSync } from "fs";
import Room from "./backend/src/classes/room";
import e from "cors";
import { homedir } from "os";
const readline = require("readline-sync");


async function main() {
	const server = new Server({name: "Jossaya's Vault", network: true, api: "https://api.jcamille.tech"});
	const files_dir = `${__dirname}/backend/settings/rooms`;
	console.log(`Checking for existing rooms in ${files_dir}`);
	if (!existsSync(files_dir)) {
		console.log(`Directory ${files_dir} does not exist. Creating it...`);
		mkdirSync(files_dir, { recursive: true });
		console.log(`Directory ${files_dir} created.`);
	}
	
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
	server.createRoom("Default Room", `${homedir()}/Music`);
}
try {
	main();
} catch (error) {
	console.error(error);
}


