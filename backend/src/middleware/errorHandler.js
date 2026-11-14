/**
 * Centralized Error Handling Middleware
 * Catches any error passed via next(err) and formats a consistent JSON response.
 */
export const errorHandler = (err, req, res, _next) => {
  const statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};
