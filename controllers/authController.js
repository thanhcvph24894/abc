const User = require('../models/User');
const bcrypt = require('bcryptjs');

class AuthController {
    // Hiển thị form đăng nhập
    async showLoginForm(req, res) {
        console.log('Showing login form');
        console.log('Flash messages:', req.flash());
        res.render('pages/login', {
            title: 'Đăng nhập',
            messages: req.flash()
        });
    }

    // Xử lý đăng nhập
    async login(req, res) {
        try {
            console.log('Login attempt with:', req.body);
            const { email, password } = req.body;

            // Validate đầu vào
            if (!email || !password) {
                console.log('Missing email or password');
                req.flash('error', 'Vui lòng nhập đầy đủ thông tin');
                return res.redirect('/login');
            }

            // Kiểm tra user tồn tại
            const user = await User.findOne({ email });
            console.log('Found user:', user);
            
            if (!user) {
                console.log('User not found');
                req.flash('error', 'Email hoặc mật khẩu không đúng');
                return res.redirect('/login');
            }

            // Kiểm tra password
            const isMatch = await bcrypt.compare(password, user.password);
            console.log('Password match:', isMatch);
            
            if (!isMatch) {
                console.log('Password incorrect');
                req.flash('error', 'Email hoặc mật khẩu không đúng');
                return res.redirect('/login');
            }

            // Kiểm tra role
            if (user.role !== 'admin') {
                console.log('User is not admin');
                req.flash('error', 'Bạn không có quyền truy cập trang quản trị');
                return res.redirect('/login');
            }

            // Lưu thông tin user vào session
            req.session.user = {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            };
            console.log('Session saved:', req.session);

            // Redirect tới trang dashboard
            res.redirect('/dashboard');
        } catch (error) {
            console.error('Login error:', error);
            req.flash('error', 'Có lỗi xảy ra khi đăng nhập');
            res.redirect('/login');
        }
    }

    // Xử lý đăng xuất
    async logout(req, res) {
        req.session.destroy((err) => {
            if (err) {
                console.error('Lỗi đăng xuất:', err);
                req.flash('error', 'Có lỗi xảy ra khi đăng xuất');
                return res.redirect('/dashboard');
            }
            res.redirect('/login');
        });
    }
}

module.exports = new AuthController(); 