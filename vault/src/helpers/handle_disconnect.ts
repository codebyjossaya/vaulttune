import { Socket } from "socket.io";
import Server from "../classes/server";
import Room from "../classes/room";
import { ConnectedUser } from "../interfaces/types";
export function handleDisconnect(t: Server,socket: ConnectedUser) {
    const room: Room = t.rooms.find(room => room.getMembers().find(member => member.id === socket.id))
    if (room !== undefined) room?.removeMember(socket)
    console.log(`Device ${socket.id} has been disconnected from the server`)
    socket.disconnect()
    t.notify(`${socket.data.firebase?.displayName || "Unknown User"} has disconnected`, 'warning');



}