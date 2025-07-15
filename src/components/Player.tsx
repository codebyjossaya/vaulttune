import { useEffect, useState, useRef } from 'react';
import { PlayerConfig, Playlist, Room, Song, SongChunk } from '../types';
import { Loading } from './Loading';
import { Header } from './Header';
import { Overlay } from './Overlay';
import { isOniOS } from '../helpers/oniOS';
import { getMimeType } from '../helpers/getMimeType';
import { SideOverlay } from './SideOverlay';
// import { isFullyVisible } from '../helpers/fullyVisible';
// import { Play, Pause,  } from 'lucide-react';

// Extend Window interface to include socket property

enum UploadStates {
    UPLOADING = "UPLOADING",
    SUCCESS = "SUCCESS",
    FAILED = "FAILED",
    NO_UPLOAD = "NO_UPLOAD"
}

const VaultTunePlayer = ({ config }: { config: PlayerConfig }) => {

  const [room, joinRoom] = useState< Room | null>(null)
  const [rooms, setRooms] = useState<Room[] >([])
  const [songs, setSongs] = useState<Song[]>([])
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [uploadDialog, enableUploadDialog] = useState<boolean>(false);
  const [uploadState, setUploadState] = useState<UploadStates>(UploadStates.NO_UPLOAD);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<Song | null>(null)
  const [fileSelected, setFileSelected] = useState<boolean>(false)
  const [error, setError] = useState<undefined | string>(undefined)
  const [playing, setPlayState] = useState<boolean>(false);
  const [selector, setSelector] = useState<"SONGS" | "PLAYLISTS">("SONGS")
  const [currentPlaylist, setCurrentPlaylist] = useState<Playlist | null>(null);
  const [playlistView, setPlaylistView] = useState<Playlist | null>(null);
  const [nextUp, setNextUp] = useState<Song | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null)
  const playingRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null);
  const headerRef = useRef<HTMLDivElement>(null)
  const bufferRef = useRef<SourceBuffer | null>(null);
  const queueRef = useRef<SongChunk[]>([]);
  const sourceRef = useRef<MediaSource | null>(null);
  const chunkCounterRef = useRef<number>(0);
  const endOfSongRef = useRef<boolean>(true);
  const currentlyPlayingRef = useRef<Song | null>(currentlyPlaying);
  const currentPlaylistRef = useRef<Playlist | null>(currentPlaylist);
  const songStartRef = useRef<boolean>(false);


  const socket = config.socket!;
  const user = config.user!;
  const signOut = config.signOut;

  function checkSourceBufferDuration(expectedDuration: number) {
    if (bufferRef.current) {
        const EPSILON = 0.0005; // 50 milliseconds

        const buffer = bufferRef.current;
        const currentDuration = buffer.buffered.length > 0 ? buffer.buffered.end(buffer.buffered.length - 1) : 0;
        console.log(`Current SourceBuffer duration: ${currentDuration + EPSILON}, expected: ${expectedDuration}`);
        return currentDuration + EPSILON >= expectedDuration;
    }
    return false;
  }
  function appendBuffer(obj: SongChunk) {
    console.log(`Chunk #${obj.chunk_counter} out of ${chunkCounterRef.current} received, appending to buffer`);
    console.log(`Source ref exists? ${sourceRef.current !== null}`);
    const chunkCounter = chunkCounterRef.current;
    const buffer = bufferRef.current;
    buffer?.appendBuffer(obj.buffer);
    if (obj.chunk_counter + 1 === chunkCounter) {
        const source = sourceRef.current!
        console.log("Ending stream")
        buffer!.addEventListener('updateend', () => {
            if (checkSourceBufferDuration(source.duration)) {
                console.log("SourceBuffer duration is sufficient, resolving")
                console.log(`Updating? ${!bufferRef.current?.updating}`);
                try {
                    source!.endOfStream();
                } catch (error) {
                    setError(`Error ending stream: ${error}`);
                }
            } else {
                console.log("Not the last buffer...waiting")
            }
        });
        
        
        
        
    }
  }

  function songChunkListener(obj: SongChunk) {
    console.log(`Received chunk #${obj.chunk_counter}`);
    const queue = queueRef.current;
    // Immediately append if buffer is ready, otherwise queue
    if (!bufferRef.current?.updating && queue.length === 0) {
        appendBuffer(obj);
    } else {
        queue.push(obj);
    }
  }

  function playSong(song: Song) {
    songStartRef.current = false; // reset songStartRef to false to allow new song to be played
    if (currentlyPlaying) {
        if (currentlyPlaying.id == song.id) return;
        else {
            (isOniOS(window) ? null : socket.emit("stop song", currentlyPlaying.id));
            socket.removeAllListeners(`song data ${currentlyPlaying.id}`);
        }
    }
    console.log("Playing new song")
    if (audioRef?.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    console.log(`play song${isOniOS(window) ? " - iOS": ""}`)
    
    socket.emit(`play song${isOniOS(window) ? " - iOS": ""}`, room!.id, song.id)
    setCurrentlyPlaying(null) // remove currently playing song
    
    sourceRef.current = null; // reset sourceRef to allow new song to be played
    bufferRef.current = null; // reset bufferRef to allow new song to be played
  }

  function stopPlayback() {
    setCurrentPlaylist(null);
    setCurrentlyPlaying(null);
    sourceRef.current = null; // reset sourceRef to allow new song to be played
    bufferRef.current = null; // reset bufferRef to allow new song to be played
    audioRef.current!.src = ""; // reset audio source
  }

  function getNextSong(song: Song, playlist: Playlist) {
    const currentPlaylist = playlist;
    const nextSongIndex = currentPlaylist!.songs.findIndex(s => s.id === song.id) + 1;
    if (nextSongIndex < currentPlaylist!.songs.length) {
        const nextSong = currentPlaylist!.songs[nextSongIndex];
        return nextSong;
    } else {
        return null;
    }
  }

  function playlistListener() {
    const currentlyPlaying = currentlyPlayingRef.current;
    console.log("Playlist ended, playing next song");
    console.log("Currently playing song:", currentlyPlaying);
    const nextSong = getNextSong(currentlyPlayingRef.current!, currentPlaylistRef.current!);
    if (nextSong) {
        playSong(nextSong);
        setNextUp(getNextSong(nextSong!, currentPlaylistRef.current!));
    } else {
        console.log("No more songs in the playlist");
        stopPlayback();
        audioRef.current!.removeEventListener('ended', playlistListener);
    }
  }
  function playlist(playlist: Playlist, song: Song) {
    audioRef.current!.removeEventListener('ended', playlistListener);
    console.log("Playing playlist", playlist);
    setCurrentPlaylist(playlist);
    playSong(song)
    if (audioRef.current) {
        audioRef.current.addEventListener('ended', playlistListener);
    }
    if (nextUp == null || nextUp.id !== song.id) {
        console.log("Next song not set")
        setNextUp(getNextSong(song,playlist));
    } else {
        console.log("Next song already set to", nextUp);
    }
  }

    useEffect(() => {
        currentlyPlayingRef.current = currentlyPlaying;
    }, [currentlyPlaying]);

    useEffect(() => {
        currentPlaylistRef.current = currentPlaylist;
    }, [currentPlaylist]);

    useEffect(() => {
        const handleReconnect = () => {
            console.log("✅ Reconnected to server");
            if (!room?.id) return;
            socket.emit("join room", room.id);
            socket.emit("get songs");
            socket.emit("get playlists");
        };
        console.log("Registering reconnect handler");
        socket.on("reconnect", handleReconnect);

        return () => {
            socket.off("reconnect", handleReconnect); // ✅ Remove only this handler
        };
    }, [room?.id]);

    useEffect(() => {

        socket.emit('get rooms')
        socket.on('available rooms', (data: Room[]) => setRooms(data))
        socket.on('songs', (songs: Song[]) => {
            setSongs(songs);
            console.log("Received songs:", songs);
        });
        socket.on('playlists', (playlists: Playlist[]) => setPlaylists(playlists));

        socket.on('status', (state: string) => {
            if (state.includes('Joined room ')) joinRoom(rooms.find(room => room.id = state.substring(12,state.length))!)
            if (state === 'Song successfully uploaded') {
                console.log("Upload success")
                setUploadState(UploadStates.SUCCESS);
                setTimeout(() => {
                    setUploadState(UploadStates.NO_UPLOAD);
                    enableUploadDialog(false);
                },2000)
            }
            if(state.includes(`Left room`)) {
                setCurrentlyPlaying(null);
                joinRoom(null);
                setSongs([]);
            };
        });

        socket.on("song data - iOS", (song: Song) => setCurrentlyPlaying(song))
        socket.on("song playlist - iOS", (playlist_url: string) => {
            console.log("Playlist URL:", playlist_url)
            audioRef!.current!.src = playlist_url;
        });
    
        
        socket.on('error', (error: string) => {
            setError("There was an error. View the error here: " + error)
        })

        // eslint-disable-next-line react-hooks/exhaustive-deps
        return () => {
            socket.removeAllListeners('song data - iOS');
            socket.removeAllListeners('song playlist - iOS');
            socket.removeAllListeners('available rooms');
            socket.removeAllListeners('songs');
            socket.removeAllListeners('status');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [rooms])

        useEffect(() => {
            if(currentlyPlaying) {
                playerRef.current!.style.height = `calc(${isOniOS(window) ? `${0.8 * window.innerHeight}px` : "80vh" } - ${playingRef.current!.offsetHeight}px)`
                // add multiple artists if needed
                if(currentlyPlaying.metadata.common.artists.length > 1) {
                    currentlyPlaying.artist_str = ""
                    const artists: [] = currentlyPlaying.metadata.common.artists;
                    artists.forEach((artist, index) => {
                        console.log(index)
                        if(index == artists.length - 1) currentlyPlaying.artist_str += `, and ${artist}`;
                        else {
                            if(artist != "") currentlyPlaying.artist_str += artist + ", "
                        }
                    })
                } else {
                    currentlyPlaying.artist_str = currentlyPlaying.metadata.common.artist;
                }
            } else {
                if(playerRef.current) {
                    playerRef.current!.style.height = ``;
                }
                
            }
            
        },[currentlyPlaying, playerRef.current])

    // handles appending buffers and detect when end of song is reached
    
        useEffect(() => {
            // or maybe investigate here...
            socket.on('song data start', (song: Song,total_chunks: number) => {
                // record the total number of chunks
                console.log(`Total chunks: ${total_chunks}`)
                chunkCounterRef.current = total_chunks;
                // ending a song that is currently loading (waiting for data)
                if (currentlyPlaying) {
                    if (audioRef.current) {
                        audioRef.current.pause();
                        audioRef.current.currentTime = 0;
                    }
                    console.log("Song data end received, clearing currently playing song");
                    setCurrentlyPlaying(null); // clear currently playing song
                }
                // process currently playing song
                setCurrentlyPlaying(song);
                // ensure songLoadedRef is set to false
                
                // Adding song info to MediaSession
                if ('mediaSession' in navigator) {
                    console.log("MediaSession API is supported, setting metadata");
                    const picture = song.metadata.common.picture?.[0];

                    if (picture) {
                        const base64Image = `data:${picture.format};base64,${window.btoa(
                        new Uint8Array(picture.data).reduce(
                            (data, byte) => data + String.fromCharCode(byte), ''
                        )
                        )}`;

                        navigator.mediaSession.metadata = new MediaMetadata({
                        title: song!.metadata.common.title || '',
                        artist: song!.metadata.common.artist || '',
                        album: song!.metadata.common.album || '',
                        artwork: [
                            {
                            src: base64Image,
                            type: picture.format, // e.g., 'image/jpeg'
                            sizes: '512x512' // or whatever the actual size is
                            }
                        ]
                        });
                    }
                }

                // prepare the audio element for playback
                if (audioRef.current) {
                    sourceRef.current = new MediaSource();
                    let source = sourceRef.current;
                    audioRef.current.src = URL.createObjectURL(source);
                    

                    // need to investigate first time playing issue HERE.
                    source.addEventListener('sourceopen', () => {
                        console.log("Source opened, setting up source buffer");
                        if (!songStartRef.current) {
                            console.log("Song start event received, setting songStartRef to true");
                            songStartRef.current = true;
                        } else {
                            console.log("Song start event already received, skipping setup");
                            return;
                        }
                        console.log("Source opened, creating source buffer");
                        source!.duration = song.metadata.format.duration;
                        const buf = source!.addSourceBuffer(getMimeType(song));
                        bufferRef.current = buf;
                        console.log("Source buffer created",buf);

                        const queue: SongChunk[] = queueRef.current;
                        const buffer = bufferRef.current;
                        // clear the queue
                        queue.length = 0;
                        console.log("Queue cleared", queue);
                        console.log("Preparing listeners for song data");
                        

                        buf.onupdateend = () => {
                            // if there is data in the queue, append it to the buffer
                            console.log("Buffer is now appending data from queue", queue.length);
                            while (queue.length > 0 && !buffer!.updating) {
                                if (buffer!.updating) break; // if the buffer is updating, break the loop
                                const data = queue.shift();
                                console.log("Appending data to buffer", data);
                                try {
                                    if (data) appendBuffer(data)
                                } catch (error) {
                                    console.error("Error appending buffer:", error);
                                    setError("There was an error in playing the song. Please try again.");
                                }
                                
                            }
                        };
                
                        console.log("Listening for song data chunks");
                        socket.removeAllListeners(`song data ${song.id}`); // remove any previous listeners for this song
                        socket.on(`song data ${song.id}`, songChunkListener);
                        // this event is sent in a non timely manner
                        socket.emit(`song data ready ${song.id}`);
                        audioRef.current!.play();
                    });
                    
                    
                }   
            });

            socket.on('song data end', () => {
                console.log("Song data end received, ending stream");
                endOfSongRef.current = true; // set end of song to true
            });
            // Instantly skip all remaining chunks from previous song when a new song is requested

            
                return () => {
                    socket.removeAllListeners("song data end")
                    socket.removeAllListeners("song data")
                    socket.removeAllListeners("song data start")
                }
            // eslint-disable-next-line react-hooks/exhaustive-deps
            },[])


    
    const headerButtons = (
        <>
            <button className='danger' onClick={() => {
                    socket.emit('leave room',room!.id)
                }}>Leave room</button>
            <button onClick={() => {
                console.log("upload dialog");
                enableUploadDialog(true)
                }}>Upload song</button>
        </>
    )
    const player = (
        
        <div id="container" onKeyDown={(e) => {
            if (e.key === "Escape") {
                if (playlistView) {
                    setPlaylistView(null);
                } else if (uploadDialog) {
                    enableUploadDialog(false);
                } else if (error) {
                    setError(undefined);
                }
            }
            // if the user presses space, toggle play/pause
            if (e.key === " ") {
                e.preventDefault();
                setPlayState(!playing);
            }
        }}>
            <audio className="audio-controls" autoPlay={true} controls={true} ref={audioRef}>
            </audio>
            {error ?  (
                <Overlay>
                    <h1>There was an error</h1>
                    <p>{error}</p>
                    <button onClick={() => {setError(undefined)}}>Exit</button>
                </Overlay>
            ) : null}
            {
                isOniOS(window) ? (
                    <Overlay>
                        <h1>VaultTune is not fully supported on iOS devices.</h1>
                        <p>Playback may not work as expected.</p>
                        <button onClick={() => {enableUploadDialog(false)}}>Exit</button>
                    </Overlay>
                ) : null
            }

            {uploadDialog ? (
                <Overlay>
                    {uploadState === UploadStates.NO_UPLOAD ? (
                        <div>
                        <h1>Upload a song</h1>
                        <input 
                        className='file-upload' 
                        ref={inputRef} 
                        type='file'
                        onChange={(e) => setFileSelected(e.target.files !== null && e.target.files.length > 0)}
                        onClick={(e) => e.stopPropagation()}
                        ></input>
                        <div>
                            {fileSelected ? (<button onClick={() => {
                            if (inputRef.current && inputRef.current.files && inputRef.current.files.length > 0) {
                                const file = inputRef.current.files[0];
                                socket.emit('upload song', room!.id, file);
                                
                                setFileSelected(false);
                                setUploadState(UploadStates.UPLOADING)
                            }
                            }}>Submit</button>): undefined}
                            <button onClick={() => {enableUploadDialog(false)}}>Exit</button>
                        </div>
                    </div>
                    
                    ) : uploadState == UploadStates.UPLOADING ? (
                        <Overlay>
                            <Loading text='Uploading your song...' />
                        </Overlay>
                    ) : uploadState == UploadStates.SUCCESS ? (
                        <Overlay>
                            <h1>Your song was successfully uploaded!</h1>
                        </Overlay>
                    ) : (
                        <Overlay>
                            <h1>Your song failed to upload.</h1>
                            <button onClick={() => {
                                setUploadState(UploadStates.NO_UPLOAD   )
                                enableUploadDialog(false)
                            }}>Exit</button>
                        </Overlay>
                    )}
                    
                </Overlay>
            ) : null}

            { playlistView ? (
                <SideOverlay isOpen={playlistView !== null} onClose={() => setPlaylistView(null)}>
                    <div className='currently-playing playlist-view' style={{padding: "3%", marginTop: "5%"}}>
                        
                        <img className="playlist-album-cover" 
                            src={`data:${playlistView.album_cover.format};base64,${window.btoa(
                                new Uint8Array(playlistView.album_cover.data).reduce(
                                    (data, byte) => data + String.fromCharCode(byte), ''
                                )
                            )}`} 
                            alt={`${playlistView.name} album cover`}
                        />
                        <h1>{playlistView.name}</h1>
                        <div style={{display: "flex", flexDirection: "column", alignItems: "center"}}>
                            <button onClick={() => {playlist(playlistView!, playlistView.songs[0]); setPlaylistView(null);}}>Play</button>
                        </div>
                        <div className='player-card playlist-view'>
                            {playlistView.songs.map((song) => {
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
                        <div className='player-list-item' key={song.id} onClick={() => {
                            setPlaylistView(null); // close playlist view when a song is played
                            playlist(playlistView!, song);
                            
                        }}>
                            {picture ? (<img className='album-cover' src={album_cover_data}></img>) : null}
                            <p className='song-title'>{song.metadata.common.title}</p>
                            <p className='song-artist'>{song.metadata.common.artist}</p>
                            <p className='song-duration'>{song_duration}</p>

                        </div>
                    );
                })}
                        </div>
                    </div>
                
            </SideOverlay>
            ) : null}
            <Header ref={headerRef}>
            <p><strong>Room {room?.name}</strong></p>
                {headerButtons}
            </Header>
            <div className='currently-playing' ref={playingRef}>
                {currentlyPlaying ? (
                    <>
                    <div className='top-group'>
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
                        <div className='song-info-group'>
                            <h1 className='song-title'>{currentlyPlaying.metadata.common.title}</h1>
                            <p className='song-artist'>{currentlyPlaying.artist_str}</p>
                            {nextUp ? (<p className='song-artist'>Next up: {nextUp?.metadata.common.title} by {nextUp?.metadata.common.artist}</p>) : null}
                        </div>
                    </div>
                    {/* <div className='controls'>
                            <div className='buttons'>
                                {playing ? <Pause onClick={() => {setPlayState(false)}} />: <Play onClick={() => {setPlayState(true)}}/>}
                            </div>
                        
                            <div className='progress-bar'>
                                <div className='progress-container'>
                                    <div className='progress' ref={songProgressRef}></div>
                                </div>
                            </div>
                    </div> */}

                    </> 
                ): null}
            
            </div>  
            <div className='player-card' ref={playerRef}>
                <div className='switcher'>
                    <button onClick={() => setSelector("SONGS")}>Songs</button>
                    <button onClick={() => setSelector("PLAYLISTS")}>Playlists</button>
                </div>
                {selector == "SONGS" ? songs.map((song) => {
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
                        <div className='player-list-item' key={song.id} onClick={() => {
                            playSong(song);
                            setPlaylistView(null); // close playlist view when a song is played
                            if (currentPlaylist) {
                                setCurrentPlaylist(null); // reset current playlist when a song is played
                            }
                            if (nextUp) {
                                setNextUp(null); // reset next up when a song is played
                            }
                            }}>
                            {picture ? (<img className='album-cover' src={album_cover_data}></img>) : null}
                            <p className='song-title'>{song.metadata.common.title}</p>
                            <p className='song-artist'>{song.metadata.common.artist}</p>
                            <p className='song-duration'>{song_duration}</p>

                        </div>
                    );
                }) : playlists.map((playlist) => {
                    const picture = playlist.album_cover;
                    // usually picture is an array, so if picture is undefined, we simply don't access the first item in the array.
                    let string_char;
                    if(picture) {
                        const coverArr = new Uint8Array(picture.data);
                        string_char = coverArr.reduce((data, byte)=> data + String.fromCharCode(byte), '');
                    }
                    const album_cover_data = picture !== undefined ? `data:${picture.format};base64,${window.btoa(string_char!)}`: undefined;
                    return (
                        <div className='player-list-item' key={playlist.id} onClick={() => {
                            setPlaylistView(playlist);}}>
                            {picture ? (<img className='album-cover' src={album_cover_data}></img>) : null}
                            <p className='song-title'>{playlist.name}</p>
                        </div>
                    );
                })}
                
            </div>
        </div>
    );

    return room !== null ? ( songs.length > 0 ? player : <Loading text='Getting songs...'  />) : rooms.length == 0 ? <Loading text="Getting rooms.." /> : (
        <div className='card-container'>
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
                    <button className='danger' onClick={() => {
                        socket.disconnect();
                    }}>Disconnect from Vault</button>
                    {user.uid === config.vault?.users[0] ? <button>Vault Settings</button> : null}
                    <div className='card-footer'>
                        <p>{user?.displayName}</p>
                        <button className='danger' onClick={() => {signOut()}}>Sign out</button>
                </div>
            </div>
        </div>
    );
    };

    export default VaultTunePlayer;