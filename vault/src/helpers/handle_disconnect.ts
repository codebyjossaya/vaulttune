import { Socket } from "socket.io";
import Server from "../classes/server";
import Room from "../classes/room";
import { User } from "../interfaces/types";
export function handleDisconnect(t: Server,socket: User) {
    const room: Room = t.rooms.find(room => room.getMembers().find(member => member.id === socket.id))
    if (room !== undefined) room?.removeMember(socket)
    console.log(`Device ${socket.id} has been disconnected from the server`)
    socket.disconnect()



}