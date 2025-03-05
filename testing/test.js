
const socket = io("https://4n7gkt8l-3000.use.devtunnels.ms/");
let g_room_id = "";

// Connection handlers
socket.on("connect", () => {
    console.log("Connected to server!");
});

socket.on("connect_error", (err) => {
    console.error("Connection error:", err);
});

// Room handling
socket.on("available rooms", (rooms) => {
    const roomDiv = document.getElementById("rooms");
    roomDiv.innerHTML = rooms.map(room => 
        `<div>
            <button onclick="join_room('${room.id}')">${'Join room ' + (room.name)}</button>
        </div>`
    ).join('');
});


// Song listing
socket.on("songs", (songs) => {
    const songsDiv = document.getElementById("songs");
    songsDiv.innerHTML = songs.map(song => 
        `<div>
            <button onclick="play_song('${g_room_id}', '${song.id}')">${song.metadata.common.title}</button>
        </div>`
    ).join('');
    console.log("Songs received:", songs);
});

// Audio streaming
socket.on("song data start", (song) => {
    console.log("Song stream starting:", song);

    const source = new MediaSource();
    document.getElementById("audioele").src = URL.createObjectURL(source);
    source.addEventListener("sourceopen",() => {
        source.duration = song.metadata.format.duration;
        const sourceBuffer = source.addSourceBuffer(getMimeType(song))
        
        socket.on("song data", (chunk) => {
            console.log(chunk);
            sourceBuffer.appendBuffer(chunk);
        });
        socket.on("song data end", () => {
            socket.off("song data");
        });
        
        socket.emit("song data ready");
    })    

    
});

// Helper functions
function getMimeType(song) {
    // Common audio formats mapping
    const mimeTypes = {
      'mp3': 'audio/mpeg',
      'flac': 'audio/flac',
      'wav': 'audio/wav',
      'ogg': 'audio/ogg',
      'aac': 'audio/aac',
      'm4a': 'audio/mp4'
    };
  
    const container = song.metadata.format.container;
    
    if (container && container in mimeTypes) {
      return mimeTypes[container];
    }
  
    // Fallback to generic audio type
    return 'audio/mpeg';
}

// Expose functions to window
window.join_room = function(room_id) {
    g_room_id = room_id;
    socket.emit("join room", room_id);
    console.log("Joining room:", room_id);
};

window.play_song = function(room_id, song_id) {
    socket.emit("play song", room_id, song_id);
    console.log("Playing song:", song_id, "in room:", room_id);
};

// Debug helpers
window.socket = socket;



