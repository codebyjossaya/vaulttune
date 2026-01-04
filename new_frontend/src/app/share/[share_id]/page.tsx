import { Song } from "@/app/types";
import Player from "./Player";
import { database } from "@/lib/firebase/admin";

async function getShareData(share_id: string) {
    const shareRef = database.ref(`/shares/${share_id}`);
    const shareSnapshot = await shareRef.once('value');
    const share = shareSnapshot.val();
    share.share_id = share_id;
    return share;
}
export async function generateMetadata({
    params
}: {
    params: Promise<{ share_id: string }>
}) {
    const { share_id } = await params;
    const share = await getShareData(share_id);
    const songRes = await fetch(`${share.vaultURL}/share/${share_id}/data`, {
            headers: {
                'Content-Type': 'application/json'
            }
    });
    const song = await songRes.json();
    return {
        title: `${song.title} by ${song.artists.join(", ")}`,
        description: `Shared from vault: ${share.vaultName} via VaultTune.`,
        openGraph: {
            title: `Listening to ${song.title} by ${song.artists.join(", ")}`,
            description: `Shared from vault: ${share.vaultName} via VaultTune.`,
        }
    };
}
export default async function Page({
    params
}: {
    params: Promise<{ share_id: string }>
}) {
    const { share_id } = await params;
    const share = await getShareData(share_id);
    const songRes = await fetch(`${share.vaultURL}/share/${share_id}/data`, {
            headers: {
                'Content-Type': 'application/json'
            }
    });

    
    const song = await songRes.json();

    return (
        <div className="flex absolute w-screen h-screen items-center justify-center">
            <div className="flex flex-col w-full h-full lg:w-[40%] lg:h-fit bg-black/30 p-10 justify-center rounded-md">
               {song && (
                <>
                    <Player song={song as unknown as Song} share={share} />
                    <div className="flex h-0.5 w-full bg-amber-50/30 my-4"></div>
                    <div className="flex flex-row justify-between w-full">
                        <p className="text-white max-w-[50%]">Shared from vault: <strong>{share.vaultName}</strong></p>
                        <a href={"https://jcamille.dev"} className="link" target="_blank" rel="noopener noreferrer"> <p className="text-white"><strong>VaultTune</strong></p></a>
                    </div>
                    
                    <p className="mt-4 text-gray-600">Want access to more songs and faster playback? Ask the owner of <strong>{share.vaultName}</strong> for access or host your own vault.</p>
                </>     
                )}
            </div>
        </div>
    )

}
