import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    avatar: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    refreshToken: {
      type: String,
      select: false,
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    googleId: {
      type: String,
      default: null,
    },
    avatar: {
      type: String,
      default: "default.jpg",
    },
    authType: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
  },
  { timestamps: true }
);

// 🔒 Middleware: Tự động mã hóa password trước khi lưu
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  // next();  
});

// 🔑 Method: Tự so sánh password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method: Tạo Reset Token
userSchema.methods.createPasswordResetToken = function () {
  // 1. Tạo token ngẫu nhiên (gửi cho user)
  const resetToken = crypto.randomBytes(32).toString("hex");

  // 2. Mã hóa token để lưu vào DB
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // 3. Hết hạn sau 10 phút
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

  return resetToken;
};
export default mongoose.model("User", userSchema);
