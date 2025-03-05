import { io } from "https://cdn.socket.io/4.8.1/socket.io.min.js"

let room_id = "";
let song_id = "";


const socket = io("http://localhost:3000/"); // Change port if needed

socket.on("connect", () => {
    console.log("Connected to server!");
});

socket.on("connect_error", (err) => {
console.error("Connection error:", err);
});
socket.on("available rooms", (rooms) => {
    console.log(rooms)
})

window.socket = socket;

socket.on("songs",console.log)
socket.on("playlists",console.log)

socket.on("song data start", (song) => {
    const chunks = [];
    socket.on("song data", (chunk) => chunks.push(chunk))
    socket.on("song data end", () => {
        socket.removeAllListeners("song data")
        const blob = getSongBlob(chunks,song)
        document.getElementById("audioele").src = URL.createObjectURL(blob)
    })
    socket.emit("song data ready")
})

function getSongBlob(chunks,song) {
    const small_chunks = [];
    let offset;
    for(const chunk of chunks) {
        offset = 0;
        const chunkSize = 8;
        while(offset < chunk.byteLength) {
            small_chunks.push(chunk.slice(offset,offset + chunkSize));
            offset += chunkSize;
        }
    }
    const buffer = new ArrayBuffer(song.size)
    const view = new DataView(buffer)

    offset = 0;
    for(const smallChunk of small_chunks) {
        const smallView = new DataView(smallChunk)
        if(smallChunk.byteLength === 8) {
            view.setBigUint64(offset, smallView.getBigUint64(0));
            offset += 8;
        }
        else {
            for (let i = 0; i < smallChunk.byteLength; i++) view.setUint8(offset + i, smallView.getUint8(i));
            offset += smallChunk.byteLength;
        }   
    }
    // add in decompression
    return new Blob([buffer], { type: song.type || 'audio/mpeg' })
}

