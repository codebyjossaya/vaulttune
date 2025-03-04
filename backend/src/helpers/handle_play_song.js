"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handlePlaySong = handlePlaySong;
function handlePlaySong(t, socket, room_id, song_id) {
    var room = t.rooms.find(function (element) { return element.id === room_id; });
    if (room === undefined) {
        socket.emit("error", "Room not found");
        return;
    }
    var members = room.getMembers();
    if (members.find(function (member) { return member.id === socket.id; }) === undefined) {
        socket.emit("error", "User has not joined this room");
        return;
    }
    var song = room.songs.find(function (element) { return element.id === song_id; });
    if (song === undefined) {
        socket.emit("error", "This song does not exist");
    }
    socket.emit("song info", song);
    socket.emit("song data", song.getBuffer());
}
