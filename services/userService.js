const User = require('../models/User');
const bcrypt = require('bcryptjs');

class UserService {
    async getAllUsers() {
        return User.find().sort({ createdAt: -1 });
    }

    async getUserById(id) {
        const user = await User.findById(id);
        if (!user) throw new Error('Không tìm thấy người dùng');
        return user;
    }

    async createUser(userData) {
        // Kiểm tra email tồn tại
        const existingUser = await User.findOne({ email: userData.email });
        if (existingUser) {
            throw new Error('Email đã được sử dụng');
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        userData.password = await bcrypt.hash(userData.password, salt);

        return User.create(userData);
    }

    async updateUser(id, updateData) {
        // Kiểm tra email tồn tại (trừ user hiện tại)
        if (updateData.email) {
            const existingUser = await User.findOne({ 
                email: updateData.email,
                _id: { $ne: id }
            });
            if (existingUser) {
                throw new Error('Email đã được sử dụng');
            }
        }

        // Hash password mới nếu có
        if (updateData.password) {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(updateData.password, salt);
        }

        const user = await User.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!user) throw new Error('Không tìm thấy người dùng');
        return user;
    }

    async deleteUser(id) {
        const user = await User.findByIdAndDelete(id);
        if (!user) throw new Error('Không tìm thấy người dùng');
        return user;
    }

    async updateStatus(id, status) {
        const user = await User.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        );
        if (!user) throw new Error('Không tìm thấy người dùng');
        return user;
    }
}

module.exports = new UserService(); 