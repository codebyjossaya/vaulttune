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
exports.Room = void 0;
var song_1 = require("./song");
var playlist_1 = require("./playlist");
var fs_1 = require("fs");
var types_1 = require("../types");
var Room = /** @class */ (function () {
    function Room(name, id, songs, playlists) {
        if (id === void 0) { id = undefined; }
        if (songs === void 0) { songs = []; }
        if (playlists === void 0) { playlists = []; }
        this.songs = [];
        this.playlists = [];
        this.dirs = [];
        this.members = [];
        this.name = name;
        this.songs = songs;
        this.playlists = playlists;
        var date = new Date();
        var timestamp = date.toISOString();
        var random = Math.floor(Math.random() * 1000000);
        this.id = (id === undefined) ? "room_".concat(timestamp, "_").concat(random) : id;
    }
    Room.prototype.addMember = function (socket) {
        socket.join(this.id);
        this.members.push(socket);
    };
    Room.prototype.removeMember = function (socket) {
        socket.leave(this.id);
        this.members = this.members.filter(function (member) { return member.id !== socket.id; });
    };
    Room.prototype.getMembers = function () {
        return this.members;
    };
    Room.prototype.addSongDir = function (path) {
        return __awaiter(this, void 0, void 0, function () {
            var allowedExtensions, songs, _loop_1, this_1, _i, songs_1, song, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 5, , 6]);
                        allowedExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac', '.wma'];
                        console.log("Adding songs in ".concat(path));
                        this.dirs.push(path);
                        songs = (0, fs_1.readdirSync)(path);
                        console.log("Songs: ".concat(songs));
                        _loop_1 = function (song) {
                            var _b, _c;
                            return __generator(this, function (_d) {
                                switch (_d.label) {
                                    case 0:
                                        if (!allowedExtensions.some(function (ext) { return song.toLowerCase().endsWith(ext); }))
                                            return [2 /*return*/, "continue"];
                                        _c = (_b = this_1.songs).push;
                                        return [4 /*yield*/, song_1.Song.create(types_1.SongStatus.SYSTEM, null, { path: path + "/" + song })];
                                    case 1:
                                        _c.apply(_b, [_d.sent()]);
                                        return [2 /*return*/];
                                }
                            });
                        };
                        this_1 = this;
                        _i = 0, songs_1 = songs;
                        _a.label = 1;
                    case 1:
                        if (!(_i < songs_1.length)) return [3 /*break*/, 4];
                        song = songs_1[_i];
                        return [5 /*yield**/, _loop_1(song)];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/, { success: true, error: undefined }];
                    case 5:
                        error_1 = _a.sent();
                        return [2 /*return*/, { success: false, error: error_1 }];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    Room.prototype.exportSettings = function () {
        var data = {
            id: this.id,
            name: this.name,
            songs: this.songs.map(function (song) { return song.exportSong(); }),
            playlists: this.playlists.map(function (playlist) {
                return {
                    name: playlist.name,
                    songs: playlist.getSongs()
                };
            })
        };
        (0, fs_1.writeFileSync)("".concat(__dirname, "/../../settings/rooms/").concat(this.name, ".json"), JSON.stringify(data));
    };
    Room.readSettings = function (name) {
        return __awaiter(this, void 0, void 0, function () {
            var data, songs, playlists, _i, _a, song, _b, _c, _d, _e, playlist, new_playlist, _loop_2, _f, _g, song;
            return __generator(this, function (_h) {
                switch (_h.label) {
                    case 0:
                        data = JSON.parse((0, fs_1.readFileSync)("".concat(__dirname, "/../../settings/rooms/").concat(name, ".json"), "utf-8"));
                        songs = [];
                        playlists = [];
                        _i = 0, _a = data.songs;
                        _h.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 4];
                        song = _a[_i];
                        _c = (_b = songs).push;
                        return [4 /*yield*/, song_1.Song.create(types_1.SongStatus.SYSTEM, null, { path: song.path })];
                    case 2:
                        _c.apply(_b, [_h.sent()]);
                        _h.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4:
                        _d = 0, _e = data.playlists;
                        _h.label = 5;
                    case 5:
                        if (!(_d < _e.length)) return [3 /*break*/, 11];
                        playlist = _e[_d];
                        new_playlist = new playlist_1.Playlist(playlist.name);
                        _loop_2 = function (song) {
                            var existing_song, new_song;
                            return __generator(this, function (_j) {
                                switch (_j.label) {
                                    case 0:
                                        existing_song = songs.find(function (element) { return element.id === song.id; });
                                        if (!(existing_song === undefined)) return [3 /*break*/, 2];
                                        return [4 /*yield*/, song_1.Song.create(types_1.SongStatus.SYSTEM, null, { path: song.path })];
                                    case 1:
                                        new_song = _j.sent();
                                        songs.push(new_song);
                                        new_playlist.addSong(new_song);
                                        return [3 /*break*/, 3];
                                    case 2:
                                        new_playlist.addSong(existing_song);
                                        _j.label = 3;
                                    case 3: return [2 /*return*/];
                                }
                            });
                        };
                        _f = 0, _g = playlist.songs;
                        _h.label = 6;
                    case 6:
                        if (!(_f < _g.length)) return [3 /*break*/, 9];
                        song = _g[_f];
                        return [5 /*yield**/, _loop_2(song)];
                    case 7:
                        _h.sent();
                        _h.label = 8;
                    case 8:
                        _f++;
                        return [3 /*break*/, 6];
                    case 9:
                        playlists.push(new_playlist);
                        _h.label = 10;
                    case 10:
                        _d++;
                        return [3 /*break*/, 5];
                    case 11: return [2 /*return*/, new Room(data.name, data.id, songs, playlists)];
                }
            });
        });
    };
    return Room;
}());
exports.Room = Room;
