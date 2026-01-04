import { NextRequest } from "next/server";
import { database } from "@/lib/firebase/admin";
export async function POST(req: NextRequest) {
    const body = await req.json();
    const { shareId } = body;
    if (!shareId) {
        return new Response(
            JSON.stringify({
                status: "failed", 
                error: "shareId is required"
            }), 
            { status: 400 }
        );
    }
    console.log("Searching for share ID:", shareId);
    try {
        const shareRef = database.ref(`/shares/${shareId}`);
        const shareSnapshot = await shareRef.once('value');
        if (!shareSnapshot.exists()) {
            console.log("Share ID not found:", shareId);
            return new Response(
                JSON.stringify({
                    status: "failed", 
                    error: "Share not found"
                }), 
                { status: 404 }
            );
        }
        const shareData = shareSnapshot.val();
        console.log("Share found:", shareData);
        return new Response(
            JSON.stringify({
                status: "success", 
                share: shareData
            })
        );
    } catch (err) {
        console.log("Error retrieving share:", (err instanceof Error) ? err.message : String(err));
        return new Response(
            JSON.stringify({
                status: "failed", 
                error: (err instanceof Error) ? err.message : String(err)
            }), 
            { status: 500 }
        );
    }
}