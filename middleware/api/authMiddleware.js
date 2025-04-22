const jwt = require('jsonwebtoken');
const User = require('../../models/User');

exports.protect = async (req, res, next) => {
    try {
        let token;

        // Kiểm tra token trong header
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        // Kiểm tra token tồn tại
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Không có quyền truy cập'
            });
        }

        try {
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Lấy thông tin user từ token
            req.user = await User.findById(decoded.id).select('-password');
            next();
        } catch (error) {
            return res.status(401).json({
                success: false,
                message: 'Token không hợp lệ'
            });
        }
    } catch (error) {
        console.error('Lỗi xác thực:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
}; 