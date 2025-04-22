const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');

// Helper function to add base URL to avatar
const addBaseUrlToAvatar = (user) => {
    const baseUrl = process.env.BASE_URL;
    if (user.avatar) {
        user.avatar = user.avatar.startsWith('http') ? user.avatar : `${baseUrl}${user.avatar}`;
    }
    return user;
};

// @desc    Đăng ký tài khoản mới
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;

        // Kiểm tra email đã tồn tại
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Email đã được sử dụng'
            });
        }

        // Tạo user mới - password sẽ được tự động hash bởi mongoose middleware
        const user = await User.create({
            name,
            email,
            password, // Không hash ở đây - để middleware xử lý
            phone
        });

        console.log('User created with password hash:', user.password);

        // Tạo token
        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.status(201).json({
            success: true,
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                token
            }
        });
    } catch (error) {
        console.error('Lỗi đăng ký:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

// @desc    Đăng nhập
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Login attempt:', { email }); // Log thông tin đăng nhập

        // Kiểm tra user tồn tại
        const user = await User.findOne({ email });
        if (!user) {
            console.log('User not found:', email); // Log khi không tìm thấy user
            return res.status(401).json({
                success: false,
                message: 'Email hoặc mật khẩu không đúng'
            });
        }

        // Log mật khẩu đã mã hóa để debug
        console.log('Stored hashed password:', user.password);
        console.log('Input password:', password);

        // Kiểm tra mật khẩu sử dụng phương thức comparePassword từ model
        const isMatch = await user.comparePassword(password);
        console.log('Password match:', isMatch); // Log kết quả so sánh mật khẩu

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Email hoặc mật khẩu không đúng'
            });
        }

        // Tạo token
        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({
            success: true,
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                token
            }
        });
    } catch (error) {
        console.error('Chi tiết lỗi đăng nhập:', error); // Log chi tiết lỗi
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Lấy thông tin user hiện tại
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .select('-password')
            .lean();

        // Thêm base URL vào avatar
        const userWithFullUrl = addBaseUrlToAvatar(user);

        res.json({
            success: true,
            data: userWithFullUrl
        });
    } catch (error) {
        console.error('Lỗi lấy thông tin user:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

// @desc    Cập nhật thông tin user
// @route   PUT /api/v1/auth/me
// @access  Private
exports.updateMe = async (req, res) => {
    try {
        const { name, phone, address } = req.body;
        
        // Tìm và cập nhật user
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng'
            });
        }

        // Cập nhật thông tin
        if (name) user.name = name;
        if (phone) user.phone = phone;
        if (address) user.address = address;

        await user.save();

        // Lấy user đã cập nhật (không bao gồm password)
        const updatedUser = await User.findById(user._id)
            .select('-password')
            .lean();

        // Thêm base URL vào avatar
        const userWithFullUrl = addBaseUrlToAvatar(updatedUser);

        res.json({
            success: true,
            data: userWithFullUrl,
            message: 'Cập nhật thông tin thành công'
        });
    } catch (error) {
        console.error('Lỗi cập nhật user:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

// @desc    Đổi mật khẩu
// @route   PUT /api/v1/auth/change-password
// @access  Private
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // Kiểm tra mật khẩu hiện tại
        const user = await User.findById(req.user.id);
        const isMatch = await user.comparePassword(currentPassword);

        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Mật khẩu hiện tại không đúng'
            });
        }

        // Cập nhật mật khẩu mới
        user.password = newPassword;
        await user.save();

        res.json({
            success: true,
            message: 'Đổi mật khẩu thành công'
        });
    } catch (error) {
        console.error('Lỗi đổi mật khẩu:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
}; 