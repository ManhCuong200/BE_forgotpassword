import User from "../models/userModel.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendEmail } from "../utils/sendEmail.js";

export const generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRE,
  });

  const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE,
  });

  return { accessToken, refreshToken };
};

export const registerUser = async ({ email, password, name, role }) => {
  const userExists = await User.findOne({ email });
  if (userExists) throw new Error("EMAIL_EXIST");

  const newUser = await User.create({ email, password, name, role });

  const tokens = generateTokens(newUser._id);

  await User.findByIdAndUpdate(newUser._id, {
    refreshToken: tokens.refreshToken,
  });

  return {
    tokens,
    user: {
      id: newUser._id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
    },
  };
};

export const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email }).select("+password");

  if (!user) throw new Error("INVALID_CREDENTIALS");

  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw new Error("INVALID_CREDENTIALS");

  const tokens = generateTokens(user._id);

  await User.findByIdAndUpdate(user._id, {
    refreshToken: tokens.refreshToken,
  });

  return {
    tokens,
    user: {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  };
};

export const refreshTokenProcess = async (refreshTokenFromCookie) => {
  if (!refreshTokenFromCookie) throw new Error("NO_REFRESH_TOKEN");

  let decoded;
  try {
    decoded = jwt.verify(refreshTokenFromCookie, process.env.JWT_REFRESH_SECRET);
  } catch (err) {
    throw new Error("REFRESH_TOKEN_INVALID");
  }

  const user = await User.findById(decoded.id).select("+refreshToken");

  if (!user || user.refreshToken !== refreshTokenFromCookie)
    throw new Error("REFRESH_TOKEN_NOT_MATCH");

  const newAccessToken = jwt.sign(
    { id: user._id },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRE }
  );

  return { accessToken: newAccessToken };
};

export const getMe = async (user) => {
  return {
    id: user._id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
};

export const logoutUser = async (userId) => {
  await User.findByIdAndUpdate(userId, { refreshToken: null });
};

export const deleteUser = async (userId) => {
  await User.findByIdAndDelete(userId);
};

// export const updateUser = async (userId, data) => {
//   const user = await User.findById(userId);
// console.log("user SERRVICE: ", user)
//   if (!user) throw new Error("USER_NOT_FOUND");
//   console.log(user._id.toString())
//   console.log("data",data._id.toString())
//   // check this user is Authorization
//   // if(user._id.toString() !== id) throw new Error("NOT_AUTHORIZATION");

//   if (data._id && data._id.toString() !== userId) {
//   throw new Error("NOT_AUTHORIZATION");
// }

//   // if (password) {
//   //   user.password = password;
//   // }
//   user._id = data._id || user._id;
//   user.name = data.name || user.name;
//   user.role = data.role || user.role;

//   await user.save();

//   return {
//     id: user._id,
//     name: user.name,
//     role: user.role,
//   };
// };

export const updateUser = async (targetId, data, actingId, actingRole) => {
  const user = await User.findById(targetId);
  if (!user) throw new Error("USER_NOT_FOUND");
  console.log(targetId)
  // User thường chỉ được sửa chính mình
  if (actingRole !== "admin" && actingId !== targetId) {
    throw new Error("NOT_AUTHORIZATION");
  }

  if (data.name) user.name = data.name;
  if (data.role && actingRole === "admin") user.role = data.role;

  await user.save();

  return {
    id: user._id,
    name: user.name,
    role: user.role,
  };
};

// 1. Logic Quên mật khẩu
export const forgotPassword = async (email) => {
  const user = await User.findOne({ email });
  if (!user) throw new Error('EMAIL_NOT_FOUND');

  // Tạo token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // Tạo Link
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

  // Nội dung HTML
  const message = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>Yêu cầu đặt lại mật khẩu</h2>
      <p>Bạn nhận được email này vì chúng tôi nhận được yêu cầu đổi mật khẩu cho tài khoản của bạn.</p>
      <a href="${resetUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Đặt lại mật khẩu</a>
      <p>Hoặc copy link này: ${resetUrl}</p>
      <p>Link hết hạn sau 10 phút.</p>
    </div>
  `;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Yêu cầu đổi mật khẩu (Password Reset)',
      html: message,
    });
    return { message: 'Email sent' };
  } catch (err) {
    // Nếu gửi email lỗi, vẫn giữ token trong DB để user dùng link log ra console
    console.error("❌ Lỗi gửi email:", err.message);
    console.log("👉 Vẫn trả về thành công để FE chuyển trang (Test mode)");

    // KHÔNG throw error 500, trả về thành công giả
    return { message: 'Email send failed but simulated success for dev' };
  }
};

// 2. Logic Reset Password (Không đổi)
export const resetPassword = async (token, newPassword) => {
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) throw new Error('TOKEN_INVALID_OR_EXPIRED');

  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  return { message: 'Password updated' };
};