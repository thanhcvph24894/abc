const categoryService = require('../services/categoryService');
const slugify = require('slugify');
const path = require('path');
const fs = require('fs');

class CategoryController {
    constructor() {
        // Bind methods to preserve 'this' context
        this.index = this.index.bind(this);
        this.showCreateForm = this.showCreateForm.bind(this);
        this.create = this.create.bind(this);
        this.showEditForm = this.showEditForm.bind(this);
        this.update = this.update.bind(this);
        this.updateStatus = this.updateStatus.bind(this);
        this.delete = this.delete.bind(this);
    }

    // Xử lý upload ảnh
    handleImage(file, oldImage = null) {
        if (!file) return null;

        // Xóa ảnh cũ nếu có
        if (oldImage) {
            const oldImagePath = path.join(__dirname, '../public', oldImage);
            if (fs.existsSync(oldImagePath)) {
                fs.unlinkSync(oldImagePath);
            }
        }

        return '/uploads/categories/' + file.filename;
    }

    // Chuẩn bị dữ liệu danh mục
    prepareCategoryData(body, file = null, oldImage = null) {
        const data = {
            name: body.name.trim(),
            description: body.description ? body.description.trim() : '',
            isActive: body.isActive === 'on',
            slug: slugify(body.name, { lower: true, locale: 'vi', strict: true })
        };

        const image = this.handleImage(file, oldImage);
        if (image) data.image = image;

        return data;
    }

    // Xử lý lỗi và xóa file đã upload nếu có
    handleError(error, file) {
        if (file) {
            const filePath = path.join(__dirname, '../public/uploads/categories', file.filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        return error;
    }

    // API Controllers
    async index(req, res, next) {
        try {
            const categories = await categoryService.getAllCategories();
            res.render('pages/categories/index', { 
                title: 'Quản lý danh mục',
                categories,
                messages: req.flash()
            });
        } catch (error) {
            req.flash('error', 'Có lỗi xảy ra: ' + error.message);
            res.redirect('/admin/dashboard');
        }
    }

    async showCreateForm(req, res, next) {
        try {
            res.render('pages/categories/create', { 
                title: 'Thêm danh mục mới',
                messages: req.flash()
            });
        } catch (error) {
            next(error);
        }
    }

    async create(req, res, next) {
        try {
            if (!req.body.name) throw new Error('Tên danh mục là bắt buộc');

            const categoryData = this.prepareCategoryData(req.body, req.file);
            
            // Kiểm tra tên danh mục đã tồn tại
            const existingCategory = await categoryService.findByName(categoryData.name);
            if (existingCategory) throw new Error('Tên danh mục đã tồn tại');

            await categoryService.createCategory(categoryData);
            req.flash('success', 'Tạo danh mục thành công');
            res.redirect('/categories');
        } catch (error) {
            next(this.handleError(error, req.file));
        }
    }

    async showEditForm(req, res, next) {
        try {
            const category = await categoryService.getCategoryById(req.params.id);

            res.render('pages/categories/edit', {
                title: 'Chỉnh sửa danh mục',
                category,
                messages: req.flash()
            });
        } catch (error) {
            next(error);
        }
    }

    async update(req, res, next) {
        try {
            if (!req.body.name) throw new Error('Tên danh mục là bắt buộc');

            const categoryId = req.params.id;
            const existingCategory = await categoryService.getCategoryById(categoryId);
            
            const updateData = this.prepareCategoryData(req.body, req.file, existingCategory.image);

            // Kiểm tra tên mới có bị trùng
            const duplicateName = await categoryService.findByName(updateData.name, categoryId);
            if (duplicateName) throw new Error('Tên danh mục đã tồn tại');

            await categoryService.updateCategory(categoryId, updateData);
            req.flash('success', 'Cập nhật danh mục thành công');
            res.redirect('/categories');
        } catch (error) {
            next(this.handleError(error, req.file));
        }
    }

    async updateStatus(req, res) {
        try {
            const category = await categoryService.updateCategory(req.params.id, { isActive: req.body.isActive });
            res.json({ success: true, message: 'Cập nhật trạng thái thành công' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async delete(req, res) {
        try {
            console.log('Bắt đầu xử lý xóa danh mục:', req.params.id);
            
            const categoryId = req.params.id;
            const category = await categoryService.getCategoryById(categoryId);

            if (!category) {
                console.log('Không tìm thấy danh mục:', categoryId);
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy danh mục'
                });
            }

            console.log('Tìm thấy danh mục:', category.name);

            // Kiểm tra ràng buộc xóa
            const hasProducts = await categoryService.hasProducts(categoryId);
            console.log('Danh mục có sản phẩm:', hasProducts);

            if (hasProducts) {
                console.log('Danh mục có sản phẩm, không thể xóa');
                return res.status(400).json({
                    success: false,
                    message: 'Không thể xóa danh mục này vì đang chứa sản phẩm'
                });
            }

            console.log('Danh mục không có sản phẩm, tiến hành xóa');
            // Xóa ảnh nếu có
            if (category.image) {
                console.log('Xóa ảnh danh mục:', category.image);
                this.handleImage(null, category.image);
            }

            // Xóa danh mục
            await categoryService.deleteCategory(categoryId);
            console.log('Đã xóa danh mục thành công');
            
            res.json({
                success: true,
                message: 'Xóa danh mục thành công'
            });
        } catch (error) {
            console.error('Lỗi khi xóa danh mục:', error);
            res.status(500).json({ 
                success: false, 
                message: error.message || 'Có lỗi xảy ra khi xóa danh mục' 
            });
        }
    }
}

module.exports = new CategoryController(); 