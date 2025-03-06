import { useEffect, useState, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { Room, Song } from '../types';
import { Loading } from './Loading';
import { getMimeType } from '../helpers/getMimeType'

const VaultTunePlayer = ({ socket }: {socket: Socket}) => {

  const [room, joinRoom] = useState< string | false>(false)
  const [rooms, setRooms] = useState<Room[] | undefined>(undefined)
  const [songs, setSongs] = useState<Song[]>([])
  const [currentlyPlaying, setCurrentlyPlaying] = useState<Song | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  useEffect(() => {

    socket.emit('get rooms')
    socket.on('available rooms', (data: Room[]) => setRooms(data))
    socket.on('songs', (songs: Song[]) => setSongs(songs));
    socket.on('status', (state: string) => {
        if (state.includes('Joined room ')) joinRoom(state.substring(12,state.length));
    });
    socket.on('error',console.error)
    socket.on('song data start', (song: Song) => {
        setCurrentlyPlaying(song);
        const source = new MediaSource();
        audioRef.current!.src = URL.createObjectURL(source);

        source.addEventListener("sourceopen",() => {
            source.duration = song.metadata.format.duration;
            const sourceBuffer = source.addSourceBuffer(getMimeType(song))
            
            socket.on("song data", (chunk) => {
                if (!sourceBuffer.updating) {
                    sourceBuffer.appendBuffer(chunk);
                }
            });
            socket.on("song data end", () => {
                socket.off("song data");
                sourceBuffer.addEventListener('updateend', () => {
                    if (!sourceBuffer.updating && source.readyState === 'open') {
                        try {
                            source.endOfStream();
                        } catch (e) {
                            console.log("Error ending stream:", e);
                        }
                    }
                });
            });
            
            socket.emit("song data ready");
        });
    });

  }, [socket])
  const playSong = (song: Song) => {
    socket.emit('play song', room, song.id)
  }
  const player = (
    <>
        <div className='currently-playing'>
        <h2>Now playing</h2>
            {currentlyPlaying ? (
                <>
                <div className='top-group'>
                    <div className='song-info-group'>
                            <h1 className='song-title'>{currentlyPlaying.metadata.common.title}</h1>
                            <p className='song-artist'>{currentlyPlaying.metadata.common.artist}</p>
                    </div>
                    {currentlyPlaying.metadata.common.picture ? (
                            <img 
                                className="album-cover" 
                                src={`data:${currentlyPlaying.metadata.common.picture[0].format};base64,${window.btoa(
                                    new Uint8Array(currentlyPlaying.metadata.common.picture[0].data).reduce(
                                        (data, byte) => data + String.fromCharCode(byte), ''
                                    )
                                )}`} 
                                alt={`${currentlyPlaying.metadata.common.title} album cover`}
                            />
                        ) : null}
                </div>
                </> 
            ): (
                <h1 className='song-title'>Nothing yet</h1>
            )}
            <audio className="audio-controls" autoPlay={true} controls={true} ref={audioRef}></audio>
        </div>
        <div className='player-card'>
            {songs.map((song) => {
                const song_duration = `${Math.floor(Number(song.metadata.format.duration)/60)}:${Math.floor((song.metadata.format.duration/60 - Math.floor(Number(song.metadata.format.duration)/60))*60)}`;
                const picture = song.metadata.common.picture;
                // usually picture is an array, so if picture is undefined, we simply don't access the first item in the array.
                let string_char;
                if(picture) {
                    const coverArr = new Uint8Array(picture[0].data);
                    string_char = coverArr.reduce((data, byte)=> data + String.fromCharCode(byte), '');
                }
                const album_cover_data = picture !== undefined ? `data:${picture.format};base64,${window.btoa(string_char!)}`: undefined;
                return (
                    <div className='player-list-item' key={song.id} onClick={() => {playSong(song)}}>
                        {picture ? (<img className='album-cover' src={album_cover_data}></img>) : null}
                        <p className='song-title'>{song.metadata.common.title}</p>
                        <p className='song-artist'>{song.metadata.common.artist}</p>
                        <p className='song-duration'>{song_duration}</p>

                    </div>
                );
            })}
        </div>
    </>
);

  return room ? player : !rooms ? <Loading text="Getting rooms.." /> : (
    <div className="card">
            <h1>VaultTune</h1>
            <h3>Available rooms</h3>
            <div className='list'>
                {rooms!.map(((room) => {
                    return (
                        <div className='list-item' key={room.id}>
                            <p><strong>{room.name}</strong></p>
                            <button onClick={() => socket.emit('join room', room.id)}>Join room</button>
                        </div>
                    );
                }))}
            </div>
    </div>
  );
};

export default VaultTunePlayer;