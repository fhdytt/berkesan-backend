const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${new Date().toISOString()}:`, err.message);
  
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS not allowed for this origin',
    });
  }
  
  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 ? 'Internal server error' : err.message;
  
  res.status(statusCode).json({
    success: false,
    message: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};

module.exports = { errorHandler };