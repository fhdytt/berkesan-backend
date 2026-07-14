const { verifyToken } = require('../utils/jwt');

const verifyTokenMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false, 
      message: 'Access denied. No token provided.' 
    });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired' 
      });
    }
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid token' 
    });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ 
      success: false, 
      message: 'Access denied. Admin only.' 
    });
  }
};

const isKasir = (req, res, next) => {
  if (req.user && (req.user.role === 'kasir' || req.user.role === 'admin')) {
    next();
  } else {
    res.status(403).json({ 
      success: false, 
      message: 'Access denied. Kasir only.' 
    });
  }
};

module.exports = { 
  verifyToken: verifyTokenMiddleware, 
  isAdmin, 
  isKasir 
};