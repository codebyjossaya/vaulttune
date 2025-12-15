
import { auth } from '@/lib/firebase/admin'
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
    const token = req.headers.get('authorization');
    console.log(token)
    if (!token) {
        console.log("No token provided");
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    return auth.verifyIdToken(token).then((decodedToken) => {
        return new Response(JSON.stringify({ uid: decodedToken.uid, email: decodedToken.email }), { status: 200 });
    }).catch((error) => {
        console.log(error);
        return new Response(JSON.stringify({ error: 'Failed to verify token' }), { status: 500 });
    })
}
