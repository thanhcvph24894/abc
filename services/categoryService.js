const Category = require('../models/Category');
const Product = require('../models/Product');

class CategoryService {
    async getAllCategories() {
        return Category.find()
            .sort({ name: 1 });
    }

    async getCategoryById(id) {
        const category = await Category.findById(id);
        if (!category) throw new Error('Không tìm thấy danh mục');
        return category;
    }

    async findByName(name, excludeId = null) {
        const query = { 
            name: { $regex: new RegExp(`^${name}$`, 'i') }
        };
        if (excludeId) query._id = { $ne: excludeId };
        return Category.findOne(query);
    }

    async createCategory(categoryData) {
        try {
            return await Category.create(categoryData);
        } catch (error) {
            if (error.code === 11000) throw new Error('Tên danh mục đã tồn tại');
            throw error;
        }
    }

    async updateCategory(id, updateData) {
        try {
            const category = await Category.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
            if (!category) throw new Error('Không tìm thấy danh mục');
            return category;
        } catch (error) {
            if (error.code === 11000) throw new Error('Tên danh mục đã tồn tại');
            throw error;
        }
    }

    async deleteCategory(id) {
        const category = await Category.findByIdAndDelete(id);
        if (!category) throw new Error('Không tìm thấy danh mục');
        return category;
    }

    /**
     * Kiểm tra danh mục có chứa sản phẩm không
     */
    async hasProducts(categoryId) {
        const productCount = await Product.countDocuments({ category: categoryId });
        return productCount > 0;
    }
}

module.exports = new CategoryService(); 