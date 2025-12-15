
import { serverToken } from "@/app/types";
import { verify } from "jsonwebtoken";
const verifyServer = (token: string): serverToken => {
    const publicKey = process.env.PUBLIC_SERVER_KEY!.replace(/\\n/g, '\n');
    const verified = verify(token, publicKey, { algorithms: ["RS256"] });
    if (typeof verified === 'string') {
        return JSON.parse(verified) as serverToken;
    } else if (typeof verified === 'object') {
        return verified as serverToken;
    }
    throw new Error('Invalid token');
}
export default verifyServer;