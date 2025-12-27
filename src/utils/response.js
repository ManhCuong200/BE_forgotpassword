export const successResponse = (res, message = "OK", data = null, status = 200) => {
  return res.status(status).json({
    success: true,
    message,
    data,
  });
};

export const errorResponse = (res, message = "Error", status = 400, errorCode = "ERROR") => {
  return res.status(status).json({
    success: false,
    message,
    errorCode,
  });
};
