"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Server = void 0;
var socket_io_1 = require("socket.io");
var room_1 = require("./room");
var handle_upload_song_1 = require("../helpers/handle_upload_song");
var handle_join_room_1 = require("../helpers/handle_join_room");
var handle_play_song_1 = require("../helpers/handle_play_song");
var handle_get_songs_1 = require("../helpers/handle_get_songs");
var http_1 = require("http");
var handle_disconnect_1 = require("../helpers/handle_disconnect");
var Server = /** @class */ (function () {
    function Server() {
        var _this = this;
        this.rooms = [];
        this.httpServer = (0, http_1.createServer)();
        this.io = new socket_io_1.Server(this.httpServer, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });
        this.io.on('connection', function (socket) {
            console.log("Device ".concat(socket.id, " has connected to the server"));
            socket.emit("status", "Connection recieved");
            socket.emit("available rooms", _this.rooms);
            // handlers
            socket.on('join room', function (id) { return ((0, handle_join_room_1.handleJoinRoom)(_this, socket, id)); });
            socket.on('play song', function (room_id, song_id) { (0, handle_play_song_1.handlePlaySong)(_this, socket, room_id, song_id); });
            socket.on('upload song', function (room_id, blob) { (0, handle_upload_song_1.handleUploadSong)(_this, socket, room_id, blob); });
            socket.on('get songs', function (room_id) { (0, handle_get_songs_1.handleGetSongs)(_this, socket, room_id); });
            socket.on('disconnect', function () { (0, handle_disconnect_1.handleDisconnect)(_this, socket); });
        });
    }
    Server.prototype.createRoom = function (name, song_dir) {
        var room = new room_1.Room(name);
        room.addSongDir(song_dir);
        this.rooms.push(room);
    };
    Server.prototype.start = function () {
        this.httpServer.listen(3000);
        console.log("VaultTune server running on port 3000");
    };
    return Server;
}());
exports.Server = Server;
