import admin from "firebase-admin";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

// Lấy path tuyệt đối tới file service account
// const serviceAccountPath = path.join(import.meta.dirname, "../../forgotpassword-83562-firebase-adminsdk.json");



// Đọc + parse file JSON chứa private key
// const serviceAccount = JSON.parse(fs.readFileSync(serviceAccount, "utf8"));

// Khởi tạo Firebase Admin bằng service account
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
});

export default admin;