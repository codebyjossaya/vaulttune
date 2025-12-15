'use client';
import { auth } from "@/lib/firebase/main"
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Vaults from "./components/Vaults";
import { AuthContext } from "./components/AuthContext";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function Home() {

    const [user, setUser] = useState<null | User>(null);
    const [currentMenu, setCurrentMenu] = useState<string>("Vaults");
    useEffect(() => {
        onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
            } else {
                setUser(null);
            }

        });
    }, []);
   
    const router = useRouter();
    return (
       <div className="absolute h-screen w-screen top-0 flex justify-center items-center"
        style={{height: window.innerHeight}}
       >
            <div className="relative h-full lg:h-[54%] w-screen lg:w-[30%] flex flex-col bg-black/30 rounded-lg p-5"
                
            >
                
                
                <div className="flex justify-between">
                    <h1 className="text-center">VaultTune</h1>
                    <DropdownMenu>
                        <DropdownMenuTrigger>{currentMenu}  ▾</DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuGroup>
                            <DropdownMenuItem onClick={() => {
                                setCurrentMenu("Vaults")
                            }}>
                                Vaults
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                                setCurrentMenu("Settings")
                            }}>
                                Settings
                            </DropdownMenuItem>
                            
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>

                </div>
                <div className="h-0.5 w-full my-2 bg-white"></div>
                <AuthContext.Provider value={{user: user|| null, setUser}}>
                    <div className="">
                        {currentMenu === "Vaults" && <Vaults /> || currentMenu === "Settings" && <p>Settings page coming soon!</p>} 
                    </div>
                    
                </AuthContext.Provider>
                <div className="absolute w-full bottom-0 left-0 items-center m-0 flex flex-row p-3 justify-between">
                    <p><strong>{user?.displayName}</strong></p>
                    <div className="flex">
                        <button className="danger" onClick={() => {
                            signOut(auth).then(() => {
                                document.cookie = `auth_token=; path=/; max-age=0`;
                                router.push('/app/login');
                            }).catch((error) => {
                                console.error("Error signing out: ", error);
                            });
                        }}>Sign out</button>
                    </div>
                </div>
            </div>
       </div>
    );
}