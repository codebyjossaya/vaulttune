"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
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
            },
            maxHttpBufferSize: 1e8
        });
        this.io.on('connection', function (socket) {
            console.log("Device ".concat(socket.id, " has connected to the server"));
            socket.emit("status", "Connection recieved");
            socket.emit("available rooms", _this.getRooms());
            // handlers
            socket.on('join room', function (id) { return ((0, handle_join_room_1.handleJoinRoom)(_this, socket, id)); });
            socket.on('play song', function (room_id, song_id) { (0, handle_play_song_1.handlePlaySong)(_this, socket, room_id, song_id); });
            socket.on('upload song', function (room_id, buf) { (0, handle_upload_song_1.handleUploadSong)(_this, socket, room_id, buf); });
            socket.on('get songs', function (room_id) { (0, handle_get_songs_1.handleGetSongs)(_this, socket, room_id); });
            socket.on('disconnect', function () { (0, handle_disconnect_1.handleDisconnect)(_this, socket); });
        });
    }
    Server.prototype.createRoom = function (name, song_dir) {
        return __awaiter(this, void 0, void 0, function () {
            var room, status;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("Creating room ".concat(name));
                        room = new room_1.Room(name);
                        return [4 /*yield*/, room.addSongDir(song_dir)];
                    case 1:
                        status = _a.sent();
                        if (!status.success)
                            console.error("Error adding song directory to room. Room will still be created.\nError:".concat(status.error));
                        this.rooms.push(room);
                        return [2 /*return*/];
                }
            });
        });
    };
    Server.prototype.start = function () {
        this.httpServer.listen(3000);
        console.log("VaultTune server running on port 3000");
    };
    Server.prototype.stop = function () {
        this.io.close();
        this.httpServer.close();
        console.log("VaultTune server has stopped running");
    };
    Server.prototype.getRooms = function () {
        return this.rooms.map(function (room) {
            return {
                name: room.name,
                id: room.id,
            };
        });
    };
    return Server;
}());
exports.Server = Server;
