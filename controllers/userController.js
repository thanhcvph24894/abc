const userService = require('../services/userService');
const path = require('path');
const fs = require('fs');

class UserController {
    // Hiển thị danh sách người dùng
    async index(req, res, next) {
        try {
            const users = await userService.getAllUsers();
            res.render('pages/users/index', {
                title: 'Quản lý người dùng',
                users,
                messages: req.flash()
            });
        } catch (error) {
            next(error);
        }
    }

    // Hiển thị form tạo người dùng
    async showCreateForm(req, res) {
        res.render('pages/users/create', {
            title: 'Thêm người dùng mới',
            messages: req.flash()
        });
    }

    // Xử lý tạo người dùng mới
    async create(req, res, next) {
        try {
            const userData = {
                name: req.body.name,
                email: req.body.email,
                password: req.body.password,
                phone: req.body.phone,
                address: req.body.address,
                role: req.body.role,
                status: 'active'
            };

            if (req.file) {
                userData.avatar = '/uploads/avatars/' + req.file.filename;
            }

            await userService.createUser(userData);
            req.flash('success', 'Thêm người dùng thành công');
            res.redirect('/users');
        } catch (error) {
            if (req.file) {
                const filePath = path.join(__dirname, '../public/uploads/avatars', req.file.filename);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
            req.flash('error', error.message);
            res.redirect('/users/create');
        }
    }

    // Hiển thị form chỉnh sửa
    async showEditForm(req, res, next) {
        try {
            const user = await userService.getUserById(req.params.id);
            res.render('pages/users/edit', {
                title: 'Chỉnh sửa người dùng',
                user,
                messages: req.flash()
            });
        } catch (error) {
            next(error);
        }
    }

    // Xử lý cập nhật người dùng
    async update(req, res, next) {
        try {
            const updateData = {
                name: req.body.name,
                email: req.body.email,
                phone: req.body.phone,
                address: req.body.address,
                role: req.body.role
            };

            // Chỉ cập nhật password nếu có nhập mới
            if (req.body.password) {
                updateData.password = req.body.password;
            }

            // Xử lý upload avatar mới
            if (req.file) {
                const user = await userService.getUserById(req.params.id);
                if (user.avatar) {
                    const oldAvatarPath = path.join(__dirname, '../public', user.avatar);
                    if (fs.existsSync(oldAvatarPath)) {
                        fs.unlinkSync(oldAvatarPath);
                    }
                }
                updateData.avatar = '/uploads/avatars/' + req.file.filename;
            }

            await userService.updateUser(req.params.id, updateData);
            req.flash('success', 'Cập nhật người dùng thành công');
            res.redirect('/users');
        } catch (error) {
            if (req.file) {
                const filePath = path.join(__dirname, '../public/uploads/avatars', req.file.filename);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
            req.flash('error', error.message);
            res.redirect(`/users/edit/${req.params.id}`);
        }
    }

    // Xử lý xóa người dùng
    async delete(req, res) {
        try {
            const user = await userService.deleteUser(req.params.id);
            
            // Xóa avatar nếu có
            if (user.avatar) {
                const avatarPath = path.join(__dirname, '../public', user.avatar);
                if (fs.existsSync(avatarPath)) {
                    fs.unlinkSync(avatarPath);
                }
            }

            res.json({
                success: true,
                message: 'Xóa người dùng thành công'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // Cập nhật trạng thái người dùng
    async updateStatus(req, res) {
        try {
            await userService.updateStatus(req.params.id, req.body.status);
            res.json({
                success: true,
                message: 'Cập nhật trạng thái thành công'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
}

module.exports = new UserController(); 