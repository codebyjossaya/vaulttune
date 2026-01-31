import { auth } from "@/lib/firebase/admin";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
    const { query } = await req.json();
    const user_token = req.headers.get('authorization');
    if (!user_token) {
        return new Response(JSON.stringify({status: "failed", error: "User token is required"}), { status: 401 });
    }
    try {
        await auth.verifyIdToken(user_token);
        return await auth.getUserByEmail(query).then((userRecord) => {
            return new Response(JSON.stringify({
            uid: userRecord.uid,
            email: userRecord.email,
        }));
        }).catch((error) => {
            console.error("Error fetching user data:", error);
            return new Response(JSON.stringify({status: "failed", error: "User not found"}), { status: 404 });
        });
    } catch (error) {
        console.log(error);
        return new Response(JSON.stringify({status: "failed", error: "Invalid user token"}), { status: 401 });
    }

    
}