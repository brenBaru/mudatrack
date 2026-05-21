import { initializeApp } from "firebase/app"
import { getAuth, GoogleAuthProvider } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyB4dihX2ENRE9-5u23uhOqdBI4IURoJQhE",
  authDomain: "mudatrack.firebaseapp.com",
  projectId: "mudatrack",
  storageBucket: "mudatrack.firebasestorage.app",
  messagingSenderId: "915714714439",
  appId: "1:915714714439:web:c3eed0aec68fd4be57ba62"
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
export const db = getFirestore(app)