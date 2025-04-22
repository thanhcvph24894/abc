const bcrypt = require('bcryptjs');
const User = require('../models/User');

class AuthService {
    async login(email, password) {
        try {
            const user = await User.findOne({ email });
            if (!user) {
                throw new Error('Không tìm thấy người dùng');
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                throw new Error('Mật khẩu không chính xác');
            }

            return user;
        } catch (error) {
            throw error;
        }
    }

    async register(userData) {
        try {
            const { email, password } = userData;
            const existingUser = await User.findOne({ email });
            
            if (existingUser) {
                throw new Error('Email đã được sử dụng');
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            const user = await User.create({
                ...userData,
                password: hashedPassword
            });

            return user;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new AuthService(); 