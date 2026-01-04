import { Song } from "@/app/types";
import { useState, useRef, useContext } from "react";
import Image from "next/image";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PlusIcon, MinusIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SocketContext } from "@/app/components/SocketContext";
export default function EditSongView({song, setSong}: {song: Song | undefined, setSong: (song: Song) => void }) {
    
    
    const [newPicture, setNewPicture] = useState<Blob | null>(null);
    const [newTitle, setNewTitle] = useState<string>(song?.title || "");
    const [newArtists, setNewArtists] = useState<string[]>(song?.artists || []);
    const [newAlbum, setNewAlbum] = useState<string>(song?.album || "");
    const newPictureRef = useRef<HTMLInputElement>(null);
    const socketCtx = useContext(SocketContext);

    if (song?.coverImage?.includes("blob")) {
        fetch(song?.coverImage).then((res) => res.blob()).then((blob) => {
            if (!newPicture) {
                setNewPicture(blob);
            }
        }).catch((error) => {
            console.error("Error fetching image:", error);
        });
        
    } else {
        fetch(`${socketCtx?.url.current}/photo/${song?.id}?socketId=${socketCtx?.socket?.current?.id}`).then((res) => {
            if (res.ok) {
                return res.blob();
            } else {
                throw new Error("Failed to fetch image");
            }
        }).then((blob) => {
            if (!newPicture) {
                setNewPicture(blob);
            }
        }).catch((error) => {
            console.error("Error fetching image:", error);
        });
    }
    

    return (
        <div className="mt-4 w-full flex items-center lg:items-start justify-center flex-col lg:flex-row gap-4">
            <DropdownMenu onClick={(e) => e.stopPropagation()}>
                <DropdownMenuTrigger asChild>
                    <Image 
                        src={newPicture ? URL.createObjectURL(newPicture) : "/placeholder.jpg"}
                        alt="Album Art"
                        onClick={(e) => e.stopPropagation()}
                        width={window.innerWidth < 640 ? 200 : 400}
                        height={window.innerWidth < 640 ? 200 : 400}
                        className="inline-block rounded-md"
                    />
                </DropdownMenuTrigger>
                <DropdownMenuContent onClick={(e) => e.stopPropagation()} align="start"  className="absolute z-10001">
                    <DropdownMenuItem onClick={() => {
                        newPictureRef.current?.click();
                    }}>
                        <p>Change photo</p>
                        
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <div className="flex flex-col justify-start items-start">
                <Input type="file" ref={newPictureRef} accept="image/*" className="hidden" onChange={(e) => {
                    console.log(e);
                    setNewPicture(e.currentTarget.files ? e.currentTarget.files[0] : null);
                }} />
                <h2>Title</h2>
                <Input type="text" value={newTitle} onChange={(e) => setNewTitle(e.currentTarget.value)} className="mb-4" />
                <h2>Artist{newArtists.length > 1 ? "s" : ""}</h2>
                {newArtists ? newArtists.map((artist, index) => (
                    <div key={index} className="flex gap-2">
                        <Input type="text" value={artist} onChange={(e) => {
                            const updatedArtists = [...newArtists];
                            updatedArtists[index] = e.currentTarget.value;
                            setNewArtists(updatedArtists);
                        }} className="mb-4" />
                        {index == newArtists.length - 1 && <button className="p-1 border-0 h-fit" onClick={() => {
                            setNewArtists([...newArtists, ""]);
                        }}><PlusIcon /></button>}
                        {index !== 0 && <button className="p-1 border-0 h-fit" onClick={() => {
                            const updatedArtists = newArtists.filter((_, i) => i !== index);
                            setNewArtists(updatedArtists); 
                        }}><MinusIcon /></button>}
                    </div>
                )) : null}
                <h2>Album</h2>
                <Input type="text" value={newAlbum} onChange={(e) => setNewAlbum(e.currentTarget.value)} className="mb-4" />
                <button className="my-4 px-4 py-2 rounded-md hover:bg-emerald-700 hover:text-white w-full" onClick={async () => {
                if (!song) return;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const updatedSong: Song = {
                    ...song,
                    title: newTitle,
                    artists: newArtists,
                    album: newAlbum,
                    coverImage: newPicture ? URL.createObjectURL(newPicture) : song.coverImage
                };
                setSong(updatedSong as Song);
                }}>Upload Song</button>                                
            </div>
            
                            
        </div>
    )
}