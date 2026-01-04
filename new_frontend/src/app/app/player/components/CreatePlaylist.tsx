"use client"
import { useContext, useState } from "react";
import { SocketContext } from "@/app/components/SocketContext";
import { Input } from "@/components/ui/input";
import { Song } from "@/app/types";
import { Label } from "@/components/ui/label";



import * as React from "react"
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Spinner } from "@/components/ui/spinner";
import DisplayMode from "@/app/components/DisplayMode";

export default function CreatePlaylist({exit}: {exit?: () => void}) {
    const socketCtx = useContext(SocketContext);
    const [open, setOpen] = useState<boolean>(false);
    const [playlistName, setPlaylistName] = useState<string>("");
    const [songsSelected, setSongsSelected] = useState<Song[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [submitted, setSubmitted] = useState<boolean>(false);
    const [searchTerm, setSearchTerm] = useState<string>("");

    if (loading) return (
      <div className="w-full h-full items-center justify-center">
        <Spinner />
      </div>
    )
    if (submitted) {
      setTimeout(() => {
        if (exit) exit();
        setSubmitted(false);
        setSongsSelected([]);
        setPlaylistName("");
      }, 1000)
      return (
        <div className="w-full h-full flex items-center justify-center">
          <h2 className="text-2xl font-bold">Playlist created!</h2>
        </div>
      )
    }
    return (
      <DisplayMode title="Create New Playlist" setOpen={exit ? exit : () => {}}>       
            <p>Select songs to add to your new playlist.</p>
            <Label htmlFor="playlist-name" className="mt-4 mb-2">Playlist Name</Label>
            <Input type="text" id="playlist-name" placeholder="Playlist Name" onKeyDown={(e) => {
              setPlaylistName(e.currentTarget.value + e.key);
            }} className="w-full mb-4" />
            <Label htmlFor="search-songs" className="mt-4 mb-2">Search Songs</Label>
            <Popover open={open} onOpenChange={setOpen}>
                 <PopoverTrigger asChild>
                    <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className=" w-full justify-between bg-black "
                    >
                    {songsSelected.length > 0
                        ? `${songsSelected.length} song(s) selected`
                        : "Select songs..."}
                    <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0 max-h-60 overflow-y-auto">
                    <Command>
                    <CommandInput placeholder="Search songs..." onKeyUp={(e: React.KeyboardEvent<HTMLInputElement>) => {
                      console.log(e.currentTarget.value);
                      setSearchTerm(e.currentTarget.value != "Search songs..." ? e.currentTarget.value : "");
                    }}/>
                    <CommandList onKeyDown={(e) => {
                      if (e.ctrlKey && e.key === 'a') {
                        e.preventDefault();
                        const filteredSongs = socketCtx?.data.songs.filter(song => `${song.title} - ${song.artists.join(", ")}`.toLowerCase().includes(searchTerm.toLowerCase()) ) || [];
                        if (songsSelected.length === filteredSongs.length) {
                          setSongsSelected([]);
                        } else {
                          setSongsSelected(filteredSongs);                          
                        }
                      }
                    }}>
                        <CommandEmpty>No songs found.</CommandEmpty>
                        <CommandGroup>
                        {socketCtx?.data.songs.map((song: Song) => {
                          return (
                            <CommandItem
                            key={song.id}
                            value={`${song.title} - ${song.artists.join(", ")}`}
                            onSelect={() => {
                                const songId = song.id;
                                const selectedSong = socketCtx.data.songs.find(s => s.id === songId);
                                if (selectedSong) {
                                    if (songsSelected.find(s => s.id === selectedSong.id)) {
                                        setSongsSelected(songsSelected.filter(s => s.id !== selectedSong.id));
                                    } else {
                                        setSongsSelected([...songsSelected, selectedSong]);
                                    }
                                }
                            }}
                            >
                            <CheckIcon
                                className={cn(
                                "mr-2 h-4 w-4",
                                songsSelected.find(s => s.id === song.id) ? "opacity-100" : "opacity-0"
                                )}
                            />
                            {song.title} - {song.artists.join(", ")}
                            </CommandItem>
                        )
                        })}
                        </CommandGroup>
                    </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
            <Button className="mt-6 w-full" onClick={() => {
              setLoading(true);
              socketCtx?.socket?.current?.emit("create playlist", playlistName, songsSelected.map(s => s.id));
              socketCtx?.socket.current?.once("playlists", () => {
                setLoading(false);
                setSubmitted(true);
              });
            }}>Create Playlist</Button>
            
            
        </DisplayMode>
    );
    
}