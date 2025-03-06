import { Dispatch, SetStateAction, useRef } from "react"
import { Socket, io } from "socket.io-client"


interface ConnectProps {
    
    setSocket: Dispatch<SetStateAction<Socket | undefined>>;

}
export function Connect({setSocket}: ConnectProps ) {
    const input_ref = useRef<HTMLInputElement>(null)
    return (
        <>
            <h2>Enter your Vault's address</h2>
            <input className="text_input" type="text" ref={input_ref}></input><br></br>
            <button onClick={() => {
                setSocket(io(input_ref.current!.value))
            }}>
                Connect
            </button>
        </>
    )
}