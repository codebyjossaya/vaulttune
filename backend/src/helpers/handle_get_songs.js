"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleGetSongs = handleGetSongs;
function handleGetSongs(t, socket, room_id) {
    console.log("Device ".concat(socket.id, " requested list of songs from room id ").concat(room_id));
    var room = t.rooms.find(function (room) { return room.id === room_id; });
    if (room === undefined) {
        socket.emit("Room not found");
        return;
    }
    var members = room.getMembers();
    if (members.find(function (member) { return member.id === socket.id; }) === undefined) {
        socket.emit("error", "User has not joined this room");
        return;
    }
    socket.emit("songs", room.songs);
    socket.emit("playlists", room.playlists);
}
