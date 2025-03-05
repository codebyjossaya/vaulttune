"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handlePlaySong = handlePlaySong;
function handlePlaySong(t, socket, room_id, song_id) {
    console.log("Device ".concat(socket.id, " is requesting song ").concat(song_id, " from room ").concat(room_id));
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
    // add in compression
    var buf = song.getBuffer();
    var offset = 0;
    var chunkSize = (buf.byteLength / song.metadata.format.duration) * 5;
    socket.emit("song data start", song.exportSong());
    var sendSongData = function () {
        while (offset < buf.byteLength) {
            socket.emit("song data", buf.slice(offset, offset + chunkSize));
            offset += chunkSize;
        }
        console.log("Finished sending song data");
        socket.emit("song data end");
        socket.off('song data ready', sendSongData);
    };
    socket.on('song data ready', sendSongData);
}
