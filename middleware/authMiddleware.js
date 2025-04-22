const jwt = require('jsonwebtoken');
const User = require('../models/User');

class AuthMiddleware {
    requireAuth(req, res, next) {
        // Nếu người dùng chưa đăng nhập, chuyển hướng đến trang đăng nhập
        if (!req.session.user) {
            return res.redirect('/login');
        }
        next();
    }

    // Middleware cho các route không yêu cầu đăng nhập
    guestOnly(req, res, next) {
        // Nếu người dùng đã đăng nhập, chuyển hướng đến trang dashboard
        if (req.session.user) {
            return res.redirect('/dashboard');
        }
        next();
    }

    // Middleware kiểm tra quyền admin
    isAdmin(req, res, next) {
        if (!req.session.user || req.session.user.role !== 'admin') {
            req.flash('error', 'Bạn không có quyền truy cập trang này');
            return res.redirect('/dashboard');
        }
        next();
    }
}

module.exports = new AuthMiddleware();

exports.protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from the token
      req.user = await User.findById(decoded.id).select('-password');

      next();
    } catch (error) {
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

exports.admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(401).json({ message: 'Not authorized as an admin' });
  }
}; 