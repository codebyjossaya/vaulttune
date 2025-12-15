// Import the functions you need from the SDKs you need

import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// TODO: Add SDKs for Firebase products that you want to use

// https://firebase.google.com/docs/web/setup#available-libraries


// Your web app's Firebase configuration

// For Firebase JS SDK v7.20.0 and later, measurementId is optional

const firebaseConfig = {

  apiKey: process.env.NEXT_PUBLIC_FIREBASE_PUB_APIKEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_PUB_AUTHDOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASEURL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PUB_PROJECTID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_PUB_STORAGEBUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_PUB_MESSAGINGSENDERID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_PUB_APPID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_PUB_MEASUREMENTID

};


// Initialize Firebase

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const provider = new GoogleAuthProvider();

export { app, auth, provider };