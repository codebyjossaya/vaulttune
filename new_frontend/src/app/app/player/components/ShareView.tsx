import { Song } from "@/app/types";
import { useContext, useEffect, useRef, useState } from "react";
import { Stage, Layer, Rect, Text, Image } from "react-konva"
import { Spinner } from "@/components/ui/spinner";
import {FastAverageColor} from "fast-average-color"
import { Copy, InfoIcon, SaveAll } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Stage as stg } from "konva/lib/Stage";
import { SocketContext } from "@/app/components/SocketContext";
import { Text as txt} from "konva/lib/shapes/Text";
import Loading from "../../../../components/Loading";
import { OverlayContext } from "@/components/OverlayProvider";
import { AlertContext } from "@/components/AlertProvider";
export default function ShareView({song}: {song?: Song}) {
    const [color, setColor] = useState<string | undefined>(undefined);
    const [dark, setDark] = useState<boolean>(true);
    const [copied, setCopied] = useState<boolean>(true);
    const [loading, setLoading] = useState<boolean>(false);
    const [y, setY] = useState<number>(560.8);
    const [img, setImg] = useState<HTMLImageElement | null>(null);
    const stageRef = useRef<stg>(null);
    const socketCtx = useContext(SocketContext)
    const overlayCtx = useContext(OverlayContext);
    const alertCtx = useContext(AlertContext)
    const baseY = 560.8;
    
    const textRef = useRef<txt>(null);
    
    const handleTextRef = (node: txt) => {
        textRef.current = node;
        console.log('triggered!')
        if (textRef.current) {
            console.log("Text ref current:", textRef.current);
            const textHeight = textRef.current.height();
            if (textHeight > 32) {
                setY(baseY - (textHeight - 32));
            } else {
                setY(baseY);
            }
            console.log(textHeight);
        }
    }
        
        



    useEffect(() => {
        if (!socketCtx?.url.current) {
            console.log("Socket URL not available yet.");
            return;
        }
        console.log("Fetching cover image for song:", song?.title);
        const blob = fetch(`${socketCtx?.url.current}/photo/${song?.id}?socketId=${socketCtx?.socket?.current?.id}`).then(res => res.blob());
        const fac = new FastAverageColor();
        const color = blob.then((blob) => {
            const img = new window.Image();
            if (blob && blob.type.includes('image')) {
                img.src = URL.createObjectURL(blob);
            } else {
                img.src = '/placeholder.jpg';
            }
            setImg(img);
            return fac.getColorAsync(img.src)
            
        });
        color.then((color) => {
            setColor(color.hex);
            setDark(color.isDark);
        }).catch((error) => {
            console.error("Error getting average color:", error);
            setColor('#000000');
            setDark(true);
        });
    }, [socketCtx, socketCtx?.url, song]);


        
    return color && img ? (
        <>
            { !loading ? (<>
                {
                window.innerWidth > 768 && 
                <div className="flex flex-row gap-1 max-w-100">
                    <InfoIcon className="text-gray-500" />
                    <p className="text-gray-500"> 
                        Your vault needs to be exposed to the public Internet to share songs.
                    </p>       
                </div>
            }
                <Stage width={400} height={600} ref={stageRef} className=" bg-black/30" >
                    <Layer>
                        <Rect
                            x={0}
                            y={0}
                            width={400}
                            height={600}
                            fill={color !== '#000000' ? color : '#1e1a4d'}
                        />
                        <Text
                            x={20}
                            y={20}
                            text={song?.title ? song.title.toUpperCase() : "Unknown Title"}
                            width={190}
                            fontSize={16}
                            fontFamily="Geist"
                            fontStyle=""
                            fill={dark ? 'white' : 'black'}
                        />
                        <Text
                            x={190}
                            y={20}
                            width={190}
                            align="right"
                            text={song?.artists ? song.artists.join(", ").toUpperCase() : "Unknown Artist"}
                            fontSize={16}
                            fontFamily="Geist"
                            fontStyle=""
                            fill={dark ? 'white' : 'black'}
                        />
                        <Image
                            x={20}
                            y={120}
                            alt="Cover Image"
                            width={360}
                            height={360}
                            image={img}
                            />
                        <Text
                            x={20}
                            y={y}
                            width={190}
                            ref={handleTextRef}
                            align="left"
                            text={song?.album ? song.album.toUpperCase() : "Unknown Album"}
                            fontSize={16}
                            fill={dark ? 'white' : 'black'}
                        />
                        <Text
                            x={20}
                            y={560.8}
                            width={360}
                            align="right"
                            text={"VaultTune"}
                            fontSize={16}
                            fontStyle="bold"
                            fill={dark ? 'white' : 'black'}
                        />
                    </Layer>
                </Stage>
            <div className="flex flex-row gap-2 w-full justify-center mt-4">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button onClick={async () => {
                            if (!socketCtx) return;
                            setLoading(true);
                            socketCtx?.socket.current?.emit('share song', song);
                            socketCtx?.socket.current?.once('share created', (shareId: string) => {
                                console.log("Share ID received: ", shareId);
                                const link = `${window.location.origin}/share/${shareId}`;
                                navigator.clipboard.writeText(link);
                                setLoading(false);
                                setCopied(true)
                                
                            });
                            socketCtx.socket.current?.once('error', (error: string) => {
                                console.error("Error creating share link: ", error);
                                setLoading(false);
                                overlayCtx.clearOverlay();
                            });
                        }}><Copy /></button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Copy public link</p>
                    </TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button onClick={() => {
                            if (stageRef.current) {
                                const dataURL = stageRef.current.toDataURL({ pixelRatio: 3 });
                                const link = document.createElement('a');
                                link.download = `${song?.title || 'song'}.png`;
                                link.href = dataURL;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                            }
                        }}><SaveAll /></button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Save image</p>
                    </TooltipContent>
                </Tooltip>
            </div>   
            </>
            ) : <Spinner className="size-24" /> }
        </>
    ) : <Loading message="Loading..." />;
}