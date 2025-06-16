import {Socket} from "socket.io/dist";
import Server from "../classes/server";
import Room from "../classes/room";

export function handleLeaveRoom(t: Server, socket: Socket, room_id: string) {
    const room: Room | undefined = t.rooms.find(room => room.id === room_id);  
    if(!room) {
        socket.emit("error", "Room does not exist")
        return
    }
    room.removeMember(socket);
    socket.emit("status",`Left room ${room.id}`)
}