import { Server } from "./backend/src/classes/server";


async function main() {
	const server = new Server()
	await server.createRoom("music", "C:/Users/MaxGa/Music")
	server.start()
}

main().catch(console.error);

