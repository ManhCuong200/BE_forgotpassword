import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes.js";
import connectDB from "./config/db.js";
import cors from "cors";
import { swaggerDocs } from "./swagger.js";

dotenv.config();

const app = express();
app.set("trust proxy", 1);

app.use(
  cors({
    origin: true, // CHO PHÉP TẤT CẢ ORIGIN (DEV)
    credentials: true,
  })
);
app.options("*", cors());

connectDB();

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);

swaggerDocs(app);

const PORT = process.env.PORT || 3001;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
