export const notFound = (req, res, next) => {
  res.status(404).json({ success: false, message: `Route not found - ${req.originalUrl}` });
};

export const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err.message);
  res.status(statusCode).json({
    success: false,
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
};
