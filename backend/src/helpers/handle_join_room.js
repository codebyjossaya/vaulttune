"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleJoinRoom = handleJoinRoom;
function handleJoinRoom(t, socket, id) {
    console.log("Device ".concat(socket.id, " is attempting to join room ").concat(id));
    var room = t.rooms.find(function (room) { return room.id === id; });
    if (room) {
        room.addMember(socket);
        t.io.to(room.id).emit("new device", "Device ".concat(socket.id, " is joining this room"));
        socket.emit("status", "Joined room " + room.name);
        socket.emit("songs", room.songs);
        socket.emit("playlists", room.playlists);
    }
    else {
        console.error("Room ".concat(id, " does not exist"));
        socket.emit("error", "Room not found");
    }
    return;
}
