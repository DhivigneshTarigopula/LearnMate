/**
 * 404 Not Found Middleware
 * Catches requests to routes that are not defined.
 */
export const notFoundHandler = (req, res, _next) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};
