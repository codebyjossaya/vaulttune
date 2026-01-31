/* eslint-disable react-hooks/set-state-in-effect */
import { SocketContext } from "@/app/components/SocketContext";
import { SLE } from "@/app/types";
import DisplayMode from "@/components/DisplayMode";
import { useContext, useEffect, useState } from "react";
import { StateContext } from "./StateProvider";
import Loading from "@/components/Loading";
import { auth } from "@/lib/firebase/main";
import { OverlayContext } from "@/components/OverlayProvider";

export default function SLEView() {
    const socketCtx = useContext(SocketContext);
    const stateCtx = useContext(StateContext)
    const overlayCtx = useContext(OverlayContext);
    const [ mode, setMode ] = useState<"list" | "create" | "joined">("list");
    const [ loading, setLoading ] = useState<string | false>(false);
    const [ joinedSLE, setJoinedSLE ] = useState<SLE | null | undefined >(null);
    useEffect(() => {
        if (joinedSLE?.id === socketCtx?.data.activeSLE.current?.id) {
            if (joinedSLE) setMode("joined");
            return;
        }
        if (joinedSLE === null) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setJoinedSLE(socketCtx?.data.activeSLE.current);
            return;
        }
        socketCtx?.data.setActiveSLE(joinedSLE ?? undefined)
        if (joinedSLE) setMode("joined");
    }, [joinedSLE, socketCtx?.data])
    // useEffect(() => {
    //     if (!socketCtx?.data.sles.current) return;
    //     socketCtx?.data.sles.current.forEach((sle) => {
    //         if (sle.users.has(socketCtx.socket.current?.id || "")) {
    //             setJoinedSLE(sle);
    //             setMode("joined");
    //         }
    //     });
    // }, [socketCtx?.data.sles.current])
    const listSLE = () => {
        return (
            <>
                {
                    !socketCtx?.data.sles.current || socketCtx.data.sles.current.length === 0 
                    ? (<p>No Shared Listening Experiences available.</p>)
                    : socketCtx?.data.sles.current.map((sle) => {
                        return (
                            <div key={sle.id} className="p-4 mb-4 bg-gray-700 rounded-lg">
                                <h3 className="text-lg font-bold mb-2">SLE ID: {sle.id}</h3>
                                <p>Users Connected</p>
                                {Object.values(sle.users).map((socket) => (
                                    <p key={socket.id}>{socket.auth.displayName}</p>
                                ))}
                                <p>Current Song: {sle.currentSong ? sle.currentSong.title : "None"}</p>
                                <p>Is Playing: {sle.isPlaying ? "Yes" : "No"}</p>
                                <button onClick={() => {
                                    if (!socketCtx || !socketCtx.socket.current || !stateCtx) return;
                                    setLoading("Joining SLE...");
                                    socketCtx.socket.current.once("sle joined", (data: SLE) => {
                                        setJoinedSLE(data);
                                        setLoading(false);
                                        setMode("joined");
                                    });
                                    socketCtx.socket.current.emit("join sle", sle.id);

                                }}>Join</button>
                            </div>
                        )
                        })
                }
                <button className="mt-2" onClick={() => setMode("create")}>Create New SLE</button>
            </>
        );
    }
    const createSLE = () => {
        if (!socketCtx || !socketCtx.socket.current || !stateCtx) return;
        setLoading("Creating SLE...");
        
        socketCtx.socket.current.once("sle created", (data: SLE) => {
            console.log(data);
            setLoading(false);
            setJoinedSLE(data);
            setMode("joined");
            
            // Optionally, you can set the newly created SLE as the current one in stateCtx
        });
        socketCtx.socket.current.emit("create sle");

        return <></>
    }
    const inSLE = () => {
        return joinedSLE ? (
            <>
                <h1>{Object.values(joinedSLE!.users)[0].auth.displayName}{"'s"} SLE</h1>
                <p>SLE ID: {joinedSLE?.id}</p>
                <p>Users Connected:</p>
                {Object.values(joinedSLE?.users || {}).map((socket) => (
                    <p key={socket.id}>{socket.auth.displayName}</p>
                ))}
                <p>Your playback is synced with the rest of the SLE.</p>
            </>
        ) : <></>
    }
    return loading ? <Loading message={loading} /> : mode === "list" ? listSLE(): mode === "create" ? createSLE() : inSLE();
}