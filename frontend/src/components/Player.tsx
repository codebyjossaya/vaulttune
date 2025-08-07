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

    const [room, joinRoom] = useState< Room | null>(null);
    const [rooms, setRooms] = useState<Room[] >([])
    const [songs, setSongs] = useState<Song[] | null>(null)
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
    const [iosDialog, setIosDialog] = useState<boolean>(isOniOS(window));
    const [createPlaylistView, setCreatePlaylistView] = useState<boolean>(false);
    const [loadingDialog, setLoadingDialog] = useState<string | null>(null);
    const [selectedSongs, setSelectedSongs] = useState<Song[]>([]);
    const [playlistName, setPlaylistName] = useState<string>("");
    const [initiator, setInitiator] = useState<{ name: string, id: string} | null>(null);
    const [pendingSong, setPendingSong] = useState<Song | null>(null);
    const [nonPendingSong, setNonPendingSong] = useState<Song | null>(null);
    const [loadedSongsData, setLoadedSongsData] = useState<{offset: number, limit: number} | null >({offset: 0, limit: 20});

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
    const roomsRef = useRef<Room[]>(rooms);
    const seekedRef = useRef<boolean>(false);
    const pausedRef = useRef<boolean>(false);
    const playedRef = useRef<boolean>(false);
    const nonPendingSongRef = useRef<Song | null>(null);

    useEffect(() => {
        nonPendingSongRef.current = nonPendingSong;
    }, [nonPendingSong]);


    const socket = config.socket!;

    useEffect(() => {
        
        const listener = (song: Song, total_chunks: number, initiator: { name: string, id: string}) => {
            console.log(`[EVENT] Song data start received - listener instance:`, listener.toString().slice(0, 50));
            songDataListener(song, total_chunks, initiator, room!);
        }
        socket.on('song data start', listener);
        
        return () => {
            socket.removeListener('song data start', listener);
        };
    }, [room]);


    const user = config.user!;
    const signOut = config.signOut;
    const waitForAudioRef = async () => {
            let retries = 0;
            while (!audioRef.current && retries < 20) {
                await new Promise(res => setTimeout(res, 50));
                console.log("Waiting for audioRef to be available...");
                retries++;
            }
        };

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
    async function appendBuffer(obj: SongChunk) {

        const chunkCounter = chunkCounterRef.current;
        const buffer = bufferRef.current;
        buffer?.appendBuffer(obj.buffer);
        if (obj.chunk_counter + 1 === chunkCounter) {
            const source = sourceRef.current!
            console.log("Ending stream")
            buffer!.addEventListener('updateend', () => {
                if (checkSourceBufferDuration(source.duration)) {
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

    async function songDataListener(song: Song, total_chunks: number, initiator: { name: string, id: string}, room: Room) {
        // record the total number of chunks
        console.log(`Total chunks: ${total_chunks}`)
        song.artist_str = "";

        const artists: string[] = song.metadata.common.artists;

        if (artists.length == 1) song.artist_str = artists[0];
        else if (artists.length == 2) song.artist_str = `${artists[0]} and ${artists[1]}`;
        else song.artist_str = artists.slice(0, -1).join(', ') + ', and ' + artists[artists.length - 1];
        if (currentlyPlaying && pendingSong && currentlyPlaying.id === pendingSong.id && song.id !== currentlyPlaying.id) {
            console.log("Removing currently playing song because a new song is being played");
            socket.removeListener(`song data ${currentlyPlaying.id}`, songChunkListener); // remove any previous listeners for this song
        }
        setCurrentlyPlaying(song);
        setInitiator(initiator)
        chunkCounterRef.current = total_chunks;
        // ending a song that is currently loading (waiting for data)

        // Wait for the new audioRef to be available before proceeding
        
        
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
                
                navigator.mediaSession.setActionHandler('nexttrack', () => {
                    audioRef.current!.currentTime = audioRef.current!.duration;
                    console.log("Next track action handler called, skipping to end of song");
                });
            }
        }

        // prepare the audio element for playback
        if (!audioRef.current) {
            await waitForAudioRef();
        }
        sourceRef.current = new MediaSource();
        const source = sourceRef.current;
        audioRef.current!.src = URL.createObjectURL(source);
        

        // need to investigate first time playing issue HERE.
        source.addEventListener('sourceopen', () => {
            console.log("Source opened, setting up source buffer");-
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
                while (queue.length > 0 && !buffer!.updating) {
                    if (buffer!.updating) break; // if the buffer is updating, break the loop
                    const data = queue.shift();
                    console.log("Appending data to buffer", data);
                    try {
                        if (data) appendBuffer(data)
                    } catch (error) {
                        setError("There was an error in playing the song. Please try again.");
                    }
                    
                }
            };
    
            console.log("Listening for song data chunks");
            socket.removeListener(`song data ${song.id}`, songChunkListener); // remove any previous listeners for this song
            socket.on(`song data ${song.id}`, songChunkListener);
            // this event is sent in a non timely manner
            console.log("Waiting for song data end event");
            socket.once(`song data end ${song.id}`, () => {
                console.log("Song data end event received, ending stream");
                setPendingSong(null);
                endOfSongRef.current = true; // set end of song to true
            });
            console.log(room)
            socket.emit(`song data ready`, room?.id, song.id);
            
            

            
        });

    }

    function songChunkListener(obj: SongChunk) {
        if (obj.chunk_counter == 0) {
            audioRef.current!.play();
        }
        const queue = queueRef.current;
        // Immediately append if buffer is ready, otherwise queue
        if (!bufferRef.current?.updating && queue.length === 0) {
            appendBuffer(obj);
        } else {
            queue.push(obj);
        }
    }


    async function playSong(song: Song) {
        if (currentlyPlaying) {
            if (currentlyPlaying.id == song.id) return;
            else {
                // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                isOniOS(window) ? null : socket.emit("stop song", currentlyPlaying.id);
                socket.removeAllListeners(`song data ${currentlyPlaying.id}`);
            }   
        }
        if (pendingSong && !isOniOS(window)) {
            if (pendingSong.id === song.id) {
                console.log("Song is already pending, skipping playback");
                return;
            }
            setNonPendingSong(song);
            await new Promise(resolve => {
                console.log(`Waiting for song data end event (${pendingSong!.metadata.common.title})..`);
                socket.once(`song data end ${pendingSong!.id}`, resolve)
                socket.emit("stop song", currentlyPlaying!.id);
                
            });
            if (song.id !== nonPendingSongRef.current?.id) {
                console.log("New song is different from non-pending song");
                return;
            }
        }
        setNonPendingSong(null);
        setPendingSong(song);

      
        console.log("Playing new song")
        if (audioRef?.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        console.log(`play song${isOniOS(window) ? " - iOS": ""}`)
        socket.emit(`play song${isOniOS(window) ? " - iOS": ""}`, room!.id, song.id);
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
        if ('mediaSession' in navigator) {
            console.log("MediaSession API is supported, setting metadata");
            navigator.mediaSession.metadata = new MediaMetadata({
                title: "VaultTune Player",
                artist: "VaultTune",
                album: "VaultTune",
            });
        }
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
        console.log("Song ended, playing next song");
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
    async function playlist(playlist: Playlist, song: Song) {
        console.log("Playing playlist", playlist);
        setCurrentPlaylist(playlist);
        await playSong(song);
        
        socket.once('song data start', async () => {
            console.log("Song data start received");
            if (!audioRef.current) {
                console.log("AudioRef not available, waiting for it to be ready");
                await waitForAudioRef();
                console.log("AudioRef is now available");
            
            }
            console.log("Adding ended event listener to audioRef");
            audioRef.current!.addEventListener('ended', playlistListener);
        })
        
        
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
       socket.on('connected', () => {
           socket.emit('get rooms');
       });
    }, []);
    useEffect(() => {

        
        socket.on('available rooms', (data: Room[]) => {
            console.log("Received rooms:", data);
            setRooms(data);
            roomsRef.current = data; // update the roomsRef with the new rooms
        })
        socket.on('songs', (total: number, offset: number, limit: number, songs: Song[]) => {
            console.log(`Received ${songs.length} with offset ${offset} and limit ${limit}`);
            if (limit === 0 || offset === 0) {
                setSongs(songs.sort((a, b) => {
                    if (a.metadata.common.title && b.metadata.common.title) {
                        return a.metadata.common.title.localeCompare(b.metadata.common.title);
                    } else return 0;
                }));
                setLoadedSongsData({offset: offset + limit, limit});
            } else {
                setSongs(prevSongs => {
                    if (!prevSongs) return songs;
                    const existingSongIds = prevSongs.map(song => song.id);
                    const newSongs = songs.filter(song => !existingSongIds.includes(song.id));
                    return [...prevSongs, ...newSongs].sort((a, b) => a.metadata.common.title.localeCompare(b.metadata.common.title));

                });

                if (total - (offset + limit) <= limit) setLoadedSongsData({offset: offset + limit, limit: total - (offset + limit)});
                else setLoadedSongsData({offset: offset + limit, limit});
            }
        });
        socket.on('new song', (song: Song) => {
            console.log("New song received:", song);
            setSongs(prevSongs => [...prevSongs!, song].sort((a, b) => a.metadata.common.title.localeCompare(b.metadata.common.title)));
        });
        socket.on('song removed', (song: Song) => {
            console.log("Song removed:", song);
            setSongs(prevSongs => prevSongs!.filter(s => s.id !== song.id)
                                            .sort((a, b) => a.metadata.common.title.localeCompare(b.metadata.common.title)));

        });
        socket.on('playlists', (playlists: Playlist[]) => setPlaylists(playlists));

        // freezes right after joining a room, eventually unfreezes.
        socket.on('status', (state: string) => {
            console.log("New state received:", state);
            // target THIS. get rid of rooms in dependency array.
            if (state.includes('Joined room ')) {
                console.log(roomsRef.current)
                const room = roomsRef.current.find(room => room.id === state.substring(12,state.length));
                console.log("Joined room:", room);
                joinRoom(room!);
                if ('mediaSession' in navigator) {
                    console.log("MediaSession API is supported, setting metadata");
                    navigator.mediaSession.metadata = new MediaMetadata({
                        title: "VaultTune Player",
                        artist: "VaultTune",
                        album: "VaultTune",
                    });
                }
            }

            else if (state === 'Song successfully uploaded') {
            console.log("Upload success")
            setUploadState(UploadStates.SUCCESS);
            setTimeout(() => {
                setUploadState(UploadStates.NO_UPLOAD);
                enableUploadDialog(false);
            },2000)
            }
            else if(state.includes(`Left room`)) {
            setCurrentlyPlaying(null);
            joinRoom(null);
            setSongs([]);
            };
            console.log("State changed to:", state);
        });

        return () => {
            socket.removeAllListeners('available rooms');
            socket.removeAllListeners('songs');
            socket.removeAllListeners('playlists');
            socket.removeAllListeners('status');
        }
    });

    useEffect(() => {

        
        
        socket.on("song data - iOS", (song: Song) => setCurrentlyPlaying(song));
        
        socket.on("song playlist - iOS", (playlist_url: string) => {
            console.log("Playlist URL:", playlist_url)


            socket.on('song data end', () => {
                console.log("Song data end received, ending stream");
                endOfSongRef.current = true; // set end of song to true
            });
            // Instantly skip all remaining chunks from previous song when a new song is requested
            
            const xhr = new XMLHttpRequest();
            xhr.open('GET', playlist_url, true);
            xhr.setRequestHeader('Bypass-Tunnel-Reminder', 'true');
            xhr.responseType = 'blob';
            xhr.onload = () => {
                if (xhr.status === 200) {
                    const audioBlob = new Blob([xhr.response], { type: 'audio/mpeg' });
                    audioRef.current!.src = URL.createObjectURL(audioBlob);
                    audioRef.current!.play();
                } else {
                    console.error("Error fetching playlist data:", xhr.statusText);
                }
            };
            xhr.send();
            
        
            socket.on('error', (error: string) => {
                setError("There was an error. View the error here: " + error)
            });
        });

        return () => {
            socket.removeAllListeners('song data - iOS');
            socket.removeAllListeners('song playlist - iOS');
            socket.removeListener("song data end", )
            socket.removeAllListeners("song data")
            socket.removeAllListeners('error');
            
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [rooms]);

        

        useEffect(() => {

            const seeked = () => {
                console.log("Seeked to", audioRef.current!.currentTime);
                if (seekedRef.current) {
                    console.log("Seeked event already handled, ignoring");
                    return; // prevent multiple seeks
                }
                socket.emit(`song seeked`, room?.id, audioRef.current!.currentTime);
            }
               
            const paused = () => { 
                if (pausedRef.current) {
                    console.log("Paused event already handled, ignoring");
                    return; // prevent multiple pauses
                }
                socket.emit(`song pause`, room?.id);
            }
            const played = () => {
                if (playedRef.current) {
                    console.log("Played event already handled, ignoring");
                    return; // prevent multiple plays
                }
                socket.emit(`song play`, room?.id);
            }
            if (audioRef.current && currentlyPlaying) {
                audioRef.current.addEventListener('seeked', seeked);
                audioRef.current.addEventListener('pause', paused);
                audioRef.current.addEventListener('play', played);

                socket.on(`song seeked`, (id: string, time: number) => {
                    if (audioRef.current && id !== socket.id) {
                        audioRef.current.removeEventListener('seeked', seeked); // remove the event listener to prevent multiple seeks
                        audioRef.current.currentTime = time;
                        audioRef.current.addEventListener('seeked', seeked); // re-add the event listener
                        console.log(`Received seek event to ${time} seconds`);
                        seekedRef.current = true; // prevent multiple seeks
                        setTimeout(() => {
                            seekedRef.current = false; // reset after a short delay
                        }, 100); // adjust delay as needed
                    }
                });
                socket.on(`song paused`, (id: string) => {
                    if (audioRef.current && id !== socket.id) {
                        audioRef.current.removeEventListener('pause', paused); // remove the event listener to prevent multiple pauses
                        audioRef.current.pause();
                        audioRef.current.addEventListener('pause', paused); // re-add the event listener
                        console.log("Song paused by another user");
                        pausedRef.current = true; // prevent multiple pauses
                        setTimeout(() => {
                            pausedRef.current = false; // reset after a short delay
                        }, 100); // adjust delay as needed
                    }
                });
                socket.on(`song played`, (id: string) => {
                    if (audioRef.current && id !== socket.id) {
                        audioRef.current.removeEventListener('play', played); // remove the event listener to prevent multiple plays
                        audioRef.current.play();
                        audioRef.current.addEventListener('play', played); // re-add the event listener
                        console.log("Song played by another user");
                        playedRef.current = true; // prevent multiple plays
                        setTimeout(() => {
                            playedRef.current = false; // reset after a short delay
                        }, 100); // adjust delay as needed
                    }
                });
                
            }

            audioRef.current?.addEventListener('progress', () => {
                if (audioRef.current && audioRef.current.buffered.length > 0) {
                    if ('mediaSession' in navigator) {
                        navigator.mediaSession.setPositionState({
                            duration: audioRef.current.duration,
                            playbackRate: audioRef.current.playbackRate,
                            position: audioRef.current.currentTime,
                        });
                    }
                }
            });

            return () => {
                if (audioRef.current) {
                    audioRef.current.removeEventListener('seeked', seeked);
                    audioRef.current.removeEventListener('pause', paused);
                    audioRef.current.removeEventListener('play', played);
                }
                socket.removeAllListeners(`song seeked`);
                socket.removeAllListeners(`song pause`);
                socket.removeAllListeners(`song play`);
            }

        }, [currentlyPlaying, room?.id, socket]);

        useEffect(() => {
            function updatePlayerHeight() {
                if (currentlyPlaying && playingRef.current && playerRef.current) {
                    playerRef.current.style.height = `calc(${document.documentElement.clientHeight}px - ${playingRef.current.getBoundingClientRect().bottom}px)`;
                    
                } else if (playerRef.current) {
                    playerRef.current.style.height = '';
                }
            }

            updatePlayerHeight();

            window.addEventListener('resize', updatePlayerHeight);

            return () => {
                window.removeEventListener('resize', updatePlayerHeight);
            };
            // Only re-run when currentlyPlaying changes
        }, [currentlyPlaying]);

    // handles appending buffers and detect when end of song is reached
    
    const headerButtons = (
        <>
            <button className='danger' onClick={() => {
                    socket.emit('leave room',room!.id)
                    setPendingSong(null);
                    setCurrentlyPlaying(null);
                    joinRoom(null);
                    setSongs([]);
                    setPlayState(false);
                    setCurrentPlaylist(null);
                    setPlaylistView(null);
                    setNextUp(null);
                    setInitiator(null);
                    setNonPendingSong(null);
                    
                    
                    
                }}>Leave room</button>
            <button onClick={() => {
                console.log("upload dialog");
                enableUploadDialog(true)
                }}>Upload song
            </button>
            <button onClick={() => {
                console.log("Creating playlist");
                setCreatePlaylistView(true);
            }}>Create playlist
            </button>
        </>
    )
    const player = (
        <>
        
        
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
               
                setPlayState(!playing);
            }
        }}>
            <Header ref={headerRef}>
            <p><strong>Room {room?.name}</strong></p>
                {headerButtons}
            </Header>
            {error ?  (
                <Overlay>
                    <h1>There was an error</h1>
                    <p>{error}</p>
                    <button onClick={() => {setError(undefined)}}>Exit</button>
                </Overlay>
            ) : null}
            {
                iosDialog ? (
                    <Overlay>
                        <h1>VaultTune is not fully supported on iOS devices.</h1>
                        <p>Playback may not work as expected.</p>
                        <button onClick={() => {setIosDialog(false)}}>Exit</button>
                    </Overlay>
                ) : null
            }

            {uploadDialog ? (
                <SideOverlay isOpen={uploadDialog} onClose={() => {
                    enableUploadDialog(false);
                    setUploadState(UploadStates.NO_UPLOAD);
                    setFileSelected(false);
                }}>
                    {uploadState === UploadStates.NO_UPLOAD ? (
                        <div>
                        <h1>Upload a song</h1>
                        <input 
                        className='file-upload' 
                        ref={inputRef} 
                        type='file'
                        accept='audio/mpeg, audio/wav, audio/ogg, audio/flac, audio/aac'
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
                    
                </SideOverlay>
            ) : null}

            { playlistView ? (
                <SideOverlay isOpen={playlistView !== null} onClose={() => setPlaylistView(null)}>
                    <div className='currently-playing playlist-view' style={{padding: "3%", marginTop: "5%"}}>
                        
                        <img className="playlist-album-cover" 
                            src={playlistView.album_cover ? URL.createObjectURL(new Blob([new Uint8Array(playlistView.album_cover.data)], { type: playlistView.album_cover.format })) : undefined}
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
                                const album_cover_data = picture !== undefined ? URL.createObjectURL(new Blob([new Uint8Array(picture[0].data)], { type: picture[0].format })) : undefined;
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
            { createPlaylistView ? (
                <>
                    <SideOverlay isOpen={createPlaylistView} onClose={() => setCreatePlaylistView(false)}>
                        <div className='create-playlist-view'>
                            {loadingDialog ? (<Loading text={loadingDialog} />) : (
                                <>
                                    <h1>Create a new playlist</h1>
                                    <input type='text' className='text_input' placeholder='Playlist name' id='playlist-name' onChange={(e) => setPlaylistName(e.target.value)} />
                                    <div className='mini-player-card'>
                                        <div className='player-card'>
                                            {songs && songs.length > 0 ? (
                                                songs.map((song) => {
                                                    const song_duration = `${Math.floor(Number(song.metadata.format.duration)/60)}:${Math.floor((song.metadata.format.duration/60 - Math.floor(Number(song.metadata.format.duration)/60))*60)}`;
                                                    const picture = song.metadata.common.picture;
                                                    // usually picture is an array, so if picture is undefined, we simply don't access the first item in the array.
                                                  
                                                    return (
                                                        <div className='player-list-item' key={song.id} onClick={() => {
                                                            if (selectedSongs.includes(song)) {
                                                                setSelectedSongs(selectedSongs.filter(s => s.id !== song.id));
                                                            } else {
                                                                setSelectedSongs([...selectedSongs, song]);
                                                            }
                                                        }}>
                                                            <input className='checkbox' type='checkbox' checked={selectedSongs.includes(song)} />
                                                            {picture ? (<img className='album-cover' src={URL.createObjectURL(new Blob([new Uint8Array(picture[0].data)], { type: picture[0].format }))}></img>) : null}
                                                            <p className='song-title'>{song.metadata.common.title}</p>
                                                            <p className='song-artist'>{song.metadata.common.artist}</p>
                                                            <p className='song-duration'>{song_duration}</p>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <p>No songs available</p>
                                            )}
                                        </div>
                                        <div>
                                            <button onClick={() => {
                                                if (playlistName.trim() === "") {
                                                    setError("Playlist name cannot be empty");
                                                    return;
                                                }
                                                if (selectedSongs.length === 0) {
                                                    setError("Please select at least one song");
                                                    return;
                                                }
                                                setLoadingDialog("Creating playlist...");
                                                socket.once('playlists', () => {
                                                    setLoadingDialog(null);
                                                    setCreatePlaylistView(false);
                                                    setSelectedSongs([]);
                                                    setPlaylistName("");
                                                });
                                                socket.emit('create playlist', room!.id, playlistName, [...selectedSongs.map(song => song.id)]);
                                                
                                                
                                            }}>Create</button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </SideOverlay>
                </>
            ) : null}
            
            <div className='currently-playing' ref={playingRef}>
                {currentlyPlaying ? (
                    <>
                        { initiator && initiator.id !== socket.id ? (
                            <p className='initiator'>{initiator.name} is playing</p>
                        ) : null}
                        <div>
                            <div className='top-group'>
                            
                            {currentlyPlaying.metadata.common.picture ? (
                                    <img 
                                        className="album-cover" 
                                        src={new Blob([new Uint8Array(currentlyPlaying.metadata.common.picture[0].data)], { type: currentlyPlaying.metadata.common.picture[0].format }) ? URL.createObjectURL(new Blob([new Uint8Array(currentlyPlaying.metadata.common.picture[0].data)], { type: currentlyPlaying.metadata.common.picture[0].format })) : undefined}
                                        alt={`${currentlyPlaying.metadata.common.title} album cover`}
                                    />
                                ) : null}
                            <div className='song-info-group'>
                                <h1 className='song-title'>{currentlyPlaying.metadata.common.title}</h1>
                                <p className='song-artist'>{currentlyPlaying.artist_str}</p>
                                {nextUp ? (<p className='song-artist'>Next up: {nextUp?.metadata.common.title} by {nextUp?.metadata.common.artist}</p>) : null}
                                
                            </div>
                            
                        </div>
                        <audio className="audio-controls" autoPlay={true} controls={true} ref={audioRef} />
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
                {selector == "SONGS" && songs ? 
                    songs.length < 1 ? <p>No songs found</p> : (
                        <>
                            {songs.map((song) => {
                                const song_duration = `${Math.floor(Number(song.metadata.format.duration)/60)}:${Math.floor((song.metadata.format.duration/60 - Math.floor(Number(song.metadata.format.duration)/60))*60)}`;
                                const picture = song.metadata.common.picture;
                                // usually picture is an array, so if picture is undefined, we simply don't access the first item in the array.
                            
                                const album_cover_data = picture !== undefined ? URL.createObjectURL(new Blob([new Uint8Array(picture[0].data)], { type: picture[0].format })) : undefined;
                                return (
                                    <div className={`player-list-item ${nonPendingSong && nonPendingSong .id === song.id || pendingSong && pendingSong.id !== currentlyPlaying?.id && pendingSong.id === song.id ? 'clicked' : ''}`} key={song.id} onClick={() => {
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
                            })}
                           { loadedSongsData && (loadedSongsData.limit !== 0) ? (
                            <button className='load-more' onClick={() => {
                                const offset = loadedSongsData.offset;
                                const limit = loadedSongsData.limit;
                                console.log(`Loading more songs with offset ${offset} and limit ${limit}`);
                                setLoadedSongsData({offset, limit: 0});
                                socket.emit('get songs', room!.id, offset, limit);
                            }}>Load {loadedSongsData.limit} more</button>
                           ) : null}
                        </>
                    ) : playlists.length < 1 ? <p>No playlists found</p> : playlists.map((playlist) => {
                        const picture = playlist.album_cover;
                        // usually picture is an array, so if picture is undefined, we simply don't access the first item in the array.
                        
                        const album_cover_data = picture !== undefined ? URL.createObjectURL(new Blob([new Uint8Array(picture.data)], { type: picture.format })) : undefined;
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
        </>
    );

    return room !== null ? ( songs && songs.length > 0 ? player : <Loading text='Getting songs...'  />) : roomsRef.current.length == 0 ? <Loading text="Getting rooms.." /> : (
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