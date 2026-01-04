import DisplayMode from "@/app/components/DisplayMode";
import { Input } from "@/components/ui/input";
import { Label } from "@radix-ui/react-dropdown-menu";
import { useContext, useEffect, useState } from "react";
import * as md from 'music-metadata'
import { ErrorContext } from "@/app/components/ErrorContext";
import { Spinner } from "@/components/ui/spinner";

import { SocketContext } from "@/app/components/SocketContext";
import { Song } from "@/app/types";
import EditSongView from "./EditSongView";
import Loading from "./Loading";

export default function UploadSongs({ exit }: { exit: () => void }) {
    const [file, setFile] = useState<File | null>(null);
    const [metadata, setMetadata] = useState<md.IAudioMetadata | null>(null);
    const [ song, setSong ] = useState<Song | null>(null);
    const [ loading, setLoading ] = useState<boolean>(false);
    const errorCtx = useContext(ErrorContext)
    const socketCtx = useContext(SocketContext);
    useEffect(() => {
        if (file) {
            // Handle file upload logic here
            console.log("File selected:", file.name);
            md.parseBlob(file).then((metadata) => {
                setMetadata(metadata);
                
                setSong({
                    id: "",
                    title: metadata.common.title || file.name,
                    artists: metadata.common.artists || ["Unknown Artist"],
                    album: metadata.common.album || "Unknown Album",
                    duration: metadata.format.duration || 0,
                    coverImage: metadata.common.picture && metadata.common.picture.length > 0 ? URL.createObjectURL(new Blob([metadata.common.picture[0].data as Uint8Array<ArrayBuffer>], { type: metadata.common.picture[0].format })) : undefined,
                    mime: file.type
                })
            }).catch((error) => {  
            
                console.error("Error reading metadata:", error);
                errorCtx.setError("Error reading metadata: " + (error as Error).message);
            });
                
         

            
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [file]);
    return (
        <DisplayMode title="Upload Songs" setOpen={exit}>
            <p>Upload a new song to your Vault</p>
            {window.innerWidth > 640 && <div className="h-0.5 w-full bg-amber-50/30 my-2" />}
            <div className="">
                <Label className="">Select Audio File</Label>
                <div className="w-full flex items-center text-center justify-center">
                    <Input type="file" accept="audio/*" className="w-[50%] text-center mt-4" onInput={(e) => {
                        setFile(e.currentTarget.files ? e.currentTarget.files[0] : null);
                    }} />
                 </div>
                {loading && <Loading message="Uploading..." />}
                {
                    file ? song ? (
                            <EditSongView song={song} setSong={async (updatedSong) => {
                                setSong(updatedSong);
                                const coverImage = updatedSong.coverImage?.includes("blob") ? await fetch(updatedSong.coverImage).then(res => res.blob()) : null;
                                metadata!.common.title = updatedSong.title;
                                metadata!.common.artists = updatedSong.artists;
                                metadata!.common.album = updatedSong.album;
                                metadata!.common.picture = coverImage ? [{
                                    format: (updatedSong.coverImage as unknown as Blob).type,
                                    data: new Uint8Array(await coverImage!.arrayBuffer())
                                }] : [];

                                setSong(null);
                                setLoading(true);
                                socketCtx?.socket?.current?.emit('upload song', await file.arrayBuffer(), metadata);
                                socketCtx?.socket?.current?.once('status', (message) => {
                                    if (message.includes("Song successfully uploaded")) {
                                        setLoading(false);
                                        exit();
                                    }

                                });
                                socketCtx?.socket?.current?.once('error', (message) => {
                                    errorCtx.setError(message);
                                    setLoading(false);
                                    exit();
                                });
                            }} />
                    ) : (
                        <div>
                            <p className="mt-4">Reading metadata...</p>
                            <Spinner className="size-24" />
                        </div>
                    ) : null
                }
                
            </div>
            
        </DisplayMode>
    )
}