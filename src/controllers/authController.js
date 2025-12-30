import * as authService from "../services/authService.js";
import { successResponse, errorResponse } from "../utils/response.js";


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
