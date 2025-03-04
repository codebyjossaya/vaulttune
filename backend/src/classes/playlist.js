"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Playlist = void 0;
var Playlist = /** @class */ (function () {
    function Playlist(name) {
        this.name = name;
    }
    Playlist.prototype.addSong = function (song) {
        this.songs.push(song);
    };
    Playlist.prototype.removeSong = function (song) {
        this.songs = this.songs.filter(function (member) { return member.path !== song.path; });
    };
    Playlist.prototype.getSongs = function () {
        return this.songs.map(function (song) { return song.exportSong(); });
    };
    return Playlist;
}());
exports.Playlist = Playlist;
