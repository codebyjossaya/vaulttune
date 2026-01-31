import { userVault } from "@/app/types";
import DisplayMode from "@/components/DisplayMode";
import Loading from "@/components/Loading";
import { useEffect, useRef, useState } from "react";

export default function ShareVaultView({ vault, onClose }: { vault: userVault; onClose: () => void }) {
    const [ searchTerm, setSearchTerm ] =  useState<string>("");
    const [ sharedUsers, setSharedUsers ] = useState<{uid: string, email: string}[]>([]);
    const [ findUserErr, setFindUserErr ] = useState<string | null>(null);  
    const [ loading, setLoading ] = useState<boolean>(false);
    const emailRef = useRef<HTMLInputElement>(null);
    const search = () => {
        fetch(`/api/user/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `${document.cookie.split('auth_token=')[1]?.split(';')[0]}`
            },
            body: JSON.stringify({ query: searchTerm })
        }).then(async (res) => {
            if (res.ok) {
                const data = await res.json();
                emailRef.current!.value = "";
                if (sharedUsers.findIndex(u => u.uid === data.uid) !== -1) {
                    return;
                }
                setSharedUsers([...sharedUsers, { uid: data.uid, email: data.email }]);
            } else {
                if (res.status === 401) {
                    window.location.reload();
                } else if (res.status === 404) {
                    setFindUserErr("User not found");
                }
            }
        }).catch((error) => {
            console.error("Error searching for user: ", error);
        });
    }

    useEffect(() => {
        fetch(`/api/user/vault/members`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `${document.cookie.split('auth_token=')[1]?.split(';')[0]}`
            },
            body: JSON.stringify({ vault_id: vault.id })
        }).then(async (res) => {
            if (res.ok) {
                const data = await res.json();
                const members = data.members;
                console.log(members);
               
                members.shift(); // Remove owner from list
                 // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setSharedUsers(members.map((member: any) => ({ uid: member.uid, email: member.email })));
            } else {
                console.error("Error fetching vault members: ", await res.text());
            }
        }).catch((error) => {
            console.error("Error fetching vault members: ", error);
        });       
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
    return (
        <DisplayMode className="max-w-[40%]" title={`Share Vault: ${vault.vault_name}`} setOpen={onClose}>
            { !loading ? <div className="flex flex-col gap-4">
                <h2>Add users</h2>
                <div className="flex flex-wrap text-center justify-center w-full min-w-0 p-2 bg-gray-800 text-white rounded-lg h-fit">
                    
                    {[...new Set(sharedUsers)].map((user) => (
                        <div key={user.uid} className="mr-2 p-2 bg-gray-700 rounded-lg transition hover:bg-gray-50 hover:text-black duration-100" onClick={() => {
                            setSharedUsers([...sharedUsers].filter(s => s.uid !== user.uid));
                        }}>
                            {user.email}
                        </div>
                    ))}
                    <input type="text" ref={emailRef} placeholder="Enter user email to share vault" className="flex flex-1 bg-transparent outline-none"  onInput={(e) => {
                        console.log(e.currentTarget.value);
                        setSearchTerm(e.currentTarget.value || "");
                        setFindUserErr(null);
                    }} onKeyUp={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();

                            search();
                        }

                    }} />
                    {findUserErr && <p className="text-red-500">{findUserErr}</p>}
                </div>
                {sharedUsers.length > 0 && <button className="auth w-full" onClick={() => {
                    setLoading(true);
                    fetch('/api/user/vault/share', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `${document.cookie.split('auth_token=')[1]?.split(';')[0]}`
                        },
                        body: JSON.stringify({
                            vaultId: vault.id,
                            userIds: sharedUsers.map(u => u.uid)
                        })
                    }).then(async (res) => {
                        if (res.ok) {
                            setLoading(false);
                            onClose();
                        } else {
                            console.error("Error sharing vault: ", await res.text());
                            setLoading(false);
                        }
                    }).catch((error) => {
                        console.error("Error sharing vault: ", error);
                        setLoading(false);
                    });
                }}>Share Vault</button>}
                <p>Vault URL: <a href={`${window.location.origin}/app/player/${vault.id}`} className="w-full p-2 bg-gray-800 text-white rounded-lg">{`${window.location.origin}/app/player/${vault.id}`}</a></p>
                <p className="text-sm text-gray-400">Note: Only users with access to this vault will be able to view its contents.</p>
            </div>
            : <Loading message="Sharing with users..." />}
        </DisplayMode>
        
    )
    
}