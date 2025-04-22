const Product = require('../models/Product');
const Category = require('../models/Category');
const fs = require('fs');
const path = require('path');
const slugify = require('slugify');

class ProductController {
    constructor() {
        // Bind methods to maintain this context
        this.index = this.index.bind(this);
        this.showCreateForm = this.showCreateForm.bind(this);
        this.create = this.create.bind(this);
        this.showEditForm = this.showEditForm.bind(this);
        this.update = this.update.bind(this);
        this.updateStatus = this.updateStatus.bind(this);
        this.handleError = this.handleError.bind(this);
    }

    // Hiển thị danh sách sản phẩm
    async index(req, res, next) {
        try {
            const products = await Product.find()
                .populate('category', 'name')
                .sort({ createdAt: -1 });
            
            res.render('pages/products/index', {
                title: 'Quản lý sản phẩm',
                products,
                messages: req.flash(),
                style: '',
                script: ''
            });
        } catch (error) {
            next(error);
        }
    }

    // Hiển thị form tạo sản phẩm
    async showCreateForm(req, res, next) {
        try {
            const categories = await Category.find({ isActive: true });
            res.render('pages/products/create', {
                title: 'Thêm sản phẩm mới',
                categories,
                messages: req.flash(),
                style: '',
                script: ''
            });
        } catch (error) {
            next(error);
        }
    }

    // Xử lý tạo sản phẩm mới
    async create(req, res, next) {
        try {
            const productData = this.prepareProductData(req.body);
            
            // Xử lý hình ảnh
            if (req.files && req.files.length > 0) {
                productData.images = req.files.map(file => '/uploads/products/' + file.filename);
            }

            await Product.create(productData);
            req.flash('success', 'Thêm sản phẩm thành công');
            res.redirect('/products');
        } catch (error) {
            this.handleError(error, req.files);
            req.flash('error', error.message);
            res.redirect('/products/create');
        }
    }

    // Hiển thị form chỉnh sửa sản phẩm
    async showEditForm(req, res, next) {
        try {
            const [product, categories] = await Promise.all([
                Product.findById(req.params.id).populate('category'),
                Category.find({ isActive: true })
            ]);

            if (!product) {
                req.flash('error', 'Không tìm thấy sản phẩm');
                return res.redirect('/products');
            }

            res.render('pages/products/edit', {
                title: 'Chỉnh sửa sản phẩm',
                product,
                categories,
                messages: req.flash(),
                style: '',
                script: ''
            });
        } catch (error) {
            next(error);
        }
    }

    // Xử lý cập nhật sản phẩm
    async update(req, res, next) {
        try {
            const product = await Product.findById(req.params.id);
            if (!product) {
                throw new Error('Không tìm thấy sản phẩm');
            }

            const updateData = this.prepareProductData(req.body);

            // Xử lý hình ảnh mới
            if (req.files && req.files.length > 0) {
                // Xóa ảnh cũ
                this.deleteProductImages(product.images);
                updateData.images = req.files.map(file => '/uploads/products/' + file.filename);
            }

            await Product.findByIdAndUpdate(req.params.id, updateData);
            req.flash('success', 'Cập nhật sản phẩm thành công');
            res.redirect('/products');
        } catch (error) {
            this.handleError(error, req.files);
            req.flash('error', error.message);
            res.redirect(`/products/edit/${req.params.id}`);
        }
    }

    // Cập nhật trạng thái sản phẩm
    async updateStatus(req, res) {
        try {
            console.log('Cập nhật trạng thái sản phẩm:', req.params.id, req.body.isActive);
            const product = await Product.findByIdAndUpdate(
                req.params.id,
                { isActive: req.body.isActive },
                { new: true }
            );

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy sản phẩm'
                });
            }

            const statusText = product.isActive ? 'kích hoạt' : 'ẩn';
            res.json({
                success: true,
                message: `Đã ${statusText} sản phẩm thành công`,
                isActive: product.isActive
            });
        } catch (error) {
            console.error('Lỗi cập nhật trạng thái:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Có lỗi xảy ra khi cập nhật trạng thái'
            });
        }
    }

    // Helper method to prepare product data
    prepareProductData(body) {
        return {
            name: body.name.trim(),
            slug: slugify(body.name, { lower: true, locale: 'vi', strict: true }),
            description: body.description ? body.description.trim() : '',
            price: parseFloat(body.price.replace(/[^\d]/g, '')),
            stock: parseInt(body.stock),
            category: body.category,
            isActive: body.isActive === 'on',
            colors: body.colors ? (Array.isArray(body.colors) ? body.colors : body.colors.split(',').map(c => c.trim())) : [],
            sizes: body.sizes ? (Array.isArray(body.sizes) ? body.sizes : body.sizes.split(',').map(s => s.trim())) : []
        };
    }

    // Helper method to delete product images
    deleteProductImages(images) {
        if (images && images.length > 0) {
            images.forEach(image => {
                const imagePath = path.join(__dirname, '../public', image);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            });
        }
    }

    // Helper method to handle errors and clean up uploaded files
    handleError(error, files) {
        // Xóa file đã upload nếu có lỗi
        if (files) {
            const uploadedFiles = Array.isArray(files) ? files : [files];
            uploadedFiles.forEach(file => {
                const filePath = path.join(__dirname, '../public/uploads/products', file.filename);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            });
        }
        console.error('Lỗi:', error);
        throw error;
    }
}

module.exports = new ProductController(); 