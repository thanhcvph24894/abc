const Product = require('../models/Product');

class ProductService {
    async getAllProducts(query = {}) {
        try {
            const products = await Product.find(query)
                .populate('category')
                .sort({ createdAt: -1 });
            return products;
        } catch (error) {
            throw error;
        }
    }

    async getProductById(id) {
        try {
            const product = await Product.findById(id).populate('category');
            if (!product) {
                throw new Error('Không tìm thấy sản phẩm');
            }
            return product;
        } catch (error) {
            throw error;
        }
    }

    async createProduct(productData) {
        try {
            const product = await Product.create(productData);
            return product;
        } catch (error) {
            throw error;
        }
    }

    async updateProduct(id, updateData) {
        try {
            const product = await Product.findByIdAndUpdate(
                id,
                updateData,
                { new: true, runValidators: true }
            );
            if (!product) {
                throw new Error('Không tìm thấy sản phẩm');
            }
            return product;
        } catch (error) {
            throw error;
        }
    }

    async deleteProduct(id) {
        try {
            const product = await Product.findByIdAndDelete(id);
            if (!product) {
                throw new Error('Không tìm thấy sản phẩm');
            }
            return product;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new ProductService(); 