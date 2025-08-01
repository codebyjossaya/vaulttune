import { Socket } from 'socket.io/dist';
import Room from "../classes/room"
import Song from "../classes/song"
import Server from "../classes/server"
import { basename, join, dirname } from 'path';
import { extname } from 'path';
import express, {Request, Response, RequestHandler} from 'express';


export async function handleiOSPlaySong(t: Server, socket: Socket, room_id: string, song_id: string) {
    console.log(`iOS device ${socket.id} is requesting song ${song_id} from room ${room_id}`)
    const room: Room | undefined = t.rooms.find((element: Room) => element.id === room_id);
    if (room === undefined) {
        socket.emit("error","Room not found");
        return;
    }
    const members = room!.getMembers();
    if (members.find(member => member.id === socket.id) === undefined) {
        socket.emit("error","User has not joined this room");
        return;
    }
    const song = room.songs.find((element: Song) => element.id === song_id);
    if (song === undefined) {
        socket.emit("error","This song does not exist");
    }
    socket.emit('song data - iOS', song)
 
    t.app.removeAllListeners("/")
    const disconnectHandler = () => t.app.removeAllListeners("/"); 
    console.log("Enabling HTTP server..")
    t.app.use(`/${socket.id}/`,express.static(dirname(song.path), {
        setHeaders: (res: Response, filePath: string) => {
            const ext = extname(filePath);
            const mimeTypes: Record<string, string> = {
                '.m3u8': 'application/vnd.apple.mpegurl',
                '.ts': 'video/mp2t',
                '.mp3': 'audio/mpeg',
            };
    
            if (mimeTypes[ext]) {
                res.setHeader('Content-Type', mimeTypes[ext]);
            }
    
            // Ensure CORS is enabled for cross-device playback
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Cache-Control', 'no-store');
            res.setHeader('Accept-Ranges', 'bytes'); // Enables seeking support
            res.setHeader('Cache-Control', 'no-store');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, bypass-tunnel-reminder');
        }
    })); 
    // Store a reference to the disconnect handler for this socket
    if (!socket.data.iosDisconnectHandler) {
        socket.data.iosDisconnectHandler = disconnectHandler;
    } else {
        // Remove previous handler if it exists
        socket.off('disconnect', socket.data.iosDisconnectHandler);
        socket.data.iosDisconnectHandler = null;
        console.log("Reassigning disconnect handler for iOS device");
        socket.data.iosDisconnectHandler = disconnectHandler; 
    }
    // Add the new disconnect listener
    socket.on('disconnect', socket.data.iosDisconnectHandler);
    console.log("Sending playlist link to iOS device")
    console.log(`Playlist link: ${t.address}/${socket.id}/${basename(song.path)}`)
    socket.emit('song playlist - iOS', `${t.address}/${socket.id}/${basename(song.path)}`)
    

        
}