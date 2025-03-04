"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleDisconnect = handleDisconnect;
function handleDisconnect(t, socket) {
    var room = t.rooms.find(function (room) { return room.getMembers().find(function (member) { return member.id === socket.id; }); });
    if (room !== undefined)
        room === null || room === void 0 ? void 0 : room.removeMember(socket);
    console.log("Device ".concat(socket.id, " has been disconnected from the server"));
    socket.disconnect();
}
