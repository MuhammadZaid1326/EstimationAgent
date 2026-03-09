/**
 * Global error handler middleware.
 * Must be registered LAST in Express — after all routes.
 * Usage: app.use(errorHandler)
 */
export function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const message = err.message || "Internal Server Error";

  console.error(`❌ [${req.method}] ${req.path} →`, err.message);
  if (process.env.NODE_ENV !== "production") {
    console.error(err.stack);
  }

  res.status(status).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
}