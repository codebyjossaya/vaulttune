import { Socket } from "socket.io";
import { Server } from "../classes/server";
import { Room } from "../classes/room";
export function handleDisconnect(t: Server,socket: Socket) {
    const room = t.rooms.find(room => room.getMembers().find(member => member.id === socket.id))
    if (room !== undefined) room?.removeMember(socket)
    console.log(`Device ${socket.id} has been disconnected from the server`)
    socket.disconnect()



}