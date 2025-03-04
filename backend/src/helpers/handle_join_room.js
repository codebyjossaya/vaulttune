"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleJoinRoom = handleJoinRoom;
function handleJoinRoom(t, socket, id) {
    var room = t.rooms.find(function (room) { return room.id === id; });
    if (room) {
        room.addMember(socket);
        this.io.to(room.id).emit("new device", "Device ".concat(socket.id, " is joining this room"));
        socket.emit("status", "Joined room " + room.name);
        socket.emit("songs", room.songs);
        socket.emit("playlists", room.playlists);
    }
    else {
        socket.emit("error", "Room not found");
    }
    return;
}
