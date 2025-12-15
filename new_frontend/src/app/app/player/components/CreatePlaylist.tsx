"use client"
import { useContext, useState } from "react";
import { SocketContext } from "@/app/components/SocketContext";
import { DialogContent, DialogDescription, DialogTitle } from "@radix-ui/react-dialog";
import { DialogHeader } from "@/components/ui/dialog";
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

const frameworks = [
  {
    value: "next.js",
    label: "Next.js",
  },
  {
    value: "sveltekit",
    label: "SvelteKit",
  },
  {
    value: "nuxt.js",
    label: "Nuxt.js",
  },
  {
    value: "remix",
    label: "Remix",
  },
  {
    value: "astro",
    label: "Astro",
  },
]

export function ExampleCombobox() {
  const [open, setOpen] = React.useState(false)
  const [value, setValue] = React.useState("")

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between"
        >
          {value
            ? frameworks.find((framework) => framework.value === value)?.label
            : "Select framework..."}
          <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search framework..." />
          <CommandList>
            <CommandEmpty>No framework found.</CommandEmpty>
            <CommandGroup>
              {frameworks.map((framework) => (
                <CommandItem
                  key={framework.value}
                  value={framework.value}
                  onSelect={(currentValue) => {
                    setValue(currentValue === value ? "" : currentValue)
                    setOpen(false)
                  }}
                >
                  <CheckIcon
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === framework.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {framework.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}


export default function CreatePlaylist({exit}: {exit?: () => void}) {
    const socketCtx = useContext(SocketContext);
    const [open, setOpen] = useState<boolean>(false);
    const [playlistName, setPlaylistName] = useState<string>("");
    const [songsSelected, setSongsSelected] = useState<Song[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [submitted, setSubmitted] = useState<boolean>(false);

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
        <DialogContent className="bg-black rounded-xl p-10">
            <DialogHeader>
                <DialogTitle>Create New Playlist</DialogTitle>
                <DialogDescription>Select songs to add to your new playlist.</DialogDescription>
            </DialogHeader>
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
                    <CommandInput placeholder="Search songs..." />
                    <CommandList>
                        <CommandEmpty>No songs found.</CommandEmpty>
                        <CommandGroup>
                        {socketCtx?.data.songs.map((song: Song) => {
                          return (
                            <CommandItem
                            key={song.id}
                            value={`${song.metadata.common.title} - ${song.metadata.common.artist}`}
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
                            {song.metadata.common.title} - {song.metadata.common.artist}
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
            
            
        </DialogContent>
    );
    
}