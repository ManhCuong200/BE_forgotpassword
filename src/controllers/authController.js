import * as authService from "../services/authService.js";
import { successResponse, errorResponse } from "../utils/response.js";
import admin from "../config/firebase.js";
import User from "../models/userModel.js";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "none",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const register = async (req, res) => {
  try {
    const result = await authService.registerUser(req.body);    
    return successResponse(res, "Đăng ký thành công", result, 201);
  } catch (err) {
    if (err.message === "EMAIL_EXIST") {
      return errorResponse(res, "Email đã tồn tại", 400, "EMAIL_EXIST");
    }

    return errorResponse(res, "Lỗi hệ thống", 500, err.message);
  }
};

export const login = async (req, res) => {
  try {
    const { tokens, user } = await authService.loginUser(req.body);

    res.cookie("refreshToken", tokens.refreshToken, COOKIE_OPTIONS);

    return successResponse(res, "Đăng nhập thành công", {
      accessToken: tokens.accessToken,
      user,
    });
  } catch (err) {
    if (err.message === "INVALID_CREDENTIALS") {
      return errorResponse(
        res,
        "Email hoặc mật khẩu không đúng",
        400,
        "INVALID_CREDENTIALS"
      );
    }

    return errorResponse(res, "Lỗi hệ thống", 500, err.message);
  }
};

export const refresh = async (req, res) => {
  try {
    const refreshTokenFromCookie = req.cookies.refreshToken;

    if (!refreshTokenFromCookie) {
      return errorResponse(
        res,
        "Không có refresh token",
        401,
        "NO_REFRESH_TOKEN"
      );
    }

    const tokens = await authService.refreshTokenProcess(
      refreshTokenFromCookie
    );

    return successResponse(res, "Lấy token mới thành công", {
      accessToken: tokens.accessToken,
    });
  } catch (err) {
    return errorResponse(res, "Refresh token không hợp lệ", 401, err.message);
  }
};

export const getMe = async (req, res) => {
  try {
    const data = await authService.getMe(req.user);
    return successResponse(res, "Lấy thông tin thành công", data);
  } catch (err) {
    return errorResponse(res, "Lỗi hệ thống", 500, err.message);
  }
};

export const logout = async (req, res) => {
  try {
    if (req.user) {
      await authService.logoutUser(req.user.id);
    }

    res.clearCookie("refreshToken");

    return successResponse(res, "Đăng xuất thành công");
  } catch (err) {
    return errorResponse(res, "Lỗi hệ thống", 500, err.message);
  }
};

export const deleteUser = async (req, res) => {
  try {
    await authService.deleteUser(req.user.id);
    if (req.user) {
      await authService.logoutUser(req.user.id);
    }
    res.clearCookie("refreshToken");
    return successResponse(res, "Xóa người dùng thành công");
  } catch (err) {
    return errorResponse(res, "Lỗi hệ thống", 500, err.message);
  }
};

export const updateUser = async (req, res) => {
  try {
    const targetId = req.params.id;   // ID trong URL
    const actingId = req.user.id;     // ID trong token

    const result = await authService.updateUser(
      targetId,
      req.body,
      actingId,
      req.user.role
    );

    return successResponse(res, "Cập nhật thông tin thành công", result);
  } catch (err) {
    if (err.message === "NOT_AUTHORIZATION") {
      return errorResponse(res, "Bạn không có quyền cập nhật thông tin này", 403);
    }
    return errorResponse(res, "Lỗi hệ thống", 500, err.message);
  }
};

export const getUsers = async (req, res) => {
  try {
    const result = await authService.getUsers(req.user.role);
    return successResponse(res, "Lấy danh sách người dùng thành công", result);
  } catch (err) {
    return errorResponse(res, "Lỗi hệ thống", 500, err.message);
  }
};

// Forgot Password
export const forgotPassword = async (req, res) => {
  try {
    await authService.forgotPassword(req.body.email);
    return successResponse(res, 'Vui lòng kiểm tra email để đặt lại mật khẩu');
  } catch (err) {
    console.log("🚀 ~ forgotPassword ~ err:", err)
    if (err.message === 'EMAIL_NOT_FOUND') {
      // Bảo mật: Đôi khi nên trả về 200 dù không tìm thấy email để tránh hacker dò user
      return errorResponse(res, 'Email không tồn tại trong hệ thống', 404);
    }
    return errorResponse(res, 'Lỗi gửi email, vui lòng thử lại sau', 500);
  }
};

// Reset Password
export const resetPassword = async (req, res) => {
  try {
    await authService.resetPassword(req.params.token, req.body.password);
    return successResponse(res, 'Mật khẩu đã được thay đổi thành công');
  } catch (err) {
    return errorResponse(res, 'Token không hợp lệ hoặc đã hết hạn', 400);
  }
};

export const googleLoginController = async (req, res) => {
  try {
    const { token: idToken } = req.body;

    // Token bắt buộc
    if (!idToken) {
      return res.status(400).json({ message: "Token is required" });
    }

    // Kiểm tra format JWT (phải có 3 phần)
    const tokenParts = idToken.split('.');
    if (tokenParts.length !== 3) {
      return res.status(400).json({
        message: "Invalid token format. Firebase ID token must have 3 parts.",
      });
    }

    // Xác thực token Firebase
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid, email, name, picture } = decodedToken;

    // Tìm user theo email
    let user = await User.findOne({ email });

    if (user) {
      // Nếu user có rồi → bổ sung thông tin Google nếu thiếu
      if (!user.googleId) {
        user.googleId = uid;
        user.avatar = picture || user.avatar;
        user.authType = "google";
        await user.save();
      }
    } else {
      // Nếu chưa có → tạo mới
      const randomPassword = Math.random().toString(36).slice(-8);

      user = await User.create({
        googleId: uid,
        email,
        name,
        avatar: picture,
        authType: "google",
        password: randomPassword,
      });
    }

    // Tạo token đăng nhập
    const tokens = authService.generateTokens(user._id);

    // Lưu refresh token vào DB
    await User.findByIdAndUpdate(user._id, {
      refreshToken: tokens.refreshToken,
    });

    // Set cookie httpOnly
    res.cookie("refreshToken", tokens.refreshToken, COOKIE_OPTIONS);

    // Trả về thông tin login thành công
    return res.status(200).json({
      message: "Đăng nhập thành công",
      accessToken: tokens.accessToken,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
      }
    });

  } catch (error) {
    console.log("🚀 ~ googleLoginController ~ error:", error)
    // console.error('Google login error:', error);

    // Lỗi token Không hợp lệ
    if (error.code === 'auth/argument-error') {
      return res.status(400).json({
        message: "Invalid Firebase ID token format",
        error: error.message,
      });
    }

    // Token hết hạn
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({
        message: "Firebase ID token has expired",
      });
    }

    // Lỗi chung
    res.status(401).json({
      message: "Authentication failed",
      error: error.message
    });
  }
};