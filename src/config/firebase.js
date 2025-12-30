import admin from "firebase-admin";
import fs from "fs";
import path from "path";

// Lấy path tuyệt đối tới file service account
const serviceAccountPath = path.join(import.meta.dirname, "../../forgotpassword-83562-firebase-adminsdk.json");

// Đọc + parse file JSON chứa private key
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

// Khởi tạo Firebase Admin bằng service account
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

export default admin;