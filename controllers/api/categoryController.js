const Category = require('../../models/Category');
const Product = require('../../models/Product');

// Helper function to add base URL to images
const addBaseUrlToImages = (category) => {
    const baseUrl = process.env.BASE_URL;
    if (category.image && !category.image.startsWith('http')) {
        category.image = `${baseUrl}${category.image}`;
    }
    return category;
};

/**
 * Lấy danh sách tất cả danh mục
 */
exports.getCategories = async (req, res) => {
    try {
        let query = { isActive: true };
        
        const categories = await Category.find(query)
            .select('name slug description image')
            .sort({ name: 1 });
        
        // Thêm base URL vào images
        const categoriesWithFullUrls = categories.map(cat => addBaseUrlToImages(cat));
        
        res.json({
            success: true,
            data: categoriesWithFullUrls
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Lấy danh sách các danh mục có sản phẩm
 */
exports.getCategoriesWithProducts = async (req, res) => {
    try {
        console.log('API getCategoriesWithProducts đã được gọi');
        
        // Lấy tất cả danh mục
        const categories = await Category.find({ isActive: true })
            .select('name slug description image')
            .sort('name')
            .lean();

        // Lọc danh mục có sản phẩm
        const categoriesWithProducts = [];
        
        for (const category of categories) {
            const productCount = await Product.countDocuments({ 
                category: category._id,
                isActive: true 
            });
            
            if (productCount > 0) {
                // Thêm base URL vào image
                const categoryWithFullUrl = addBaseUrlToImages(category);
                // Thêm số lượng sản phẩm
                categoryWithFullUrl.productCount = productCount;
                categoriesWithProducts.push(categoryWithFullUrl);
            }
        }

        res.json({
            success: true,
            data: categoriesWithProducts
        });
    } catch (error) {
        console.error('Lỗi lấy danh mục có sản phẩm:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

/**
 * Lấy chi tiết danh mục kèm sản phẩm
 */
exports.getCategoryWithProducts = async (req, res) => {
    try {
        // Lấy thông tin danh mục
        const category = await Category.findOne({ 
            slug: req.params.slug,
            isActive: true 
        })
        .lean();

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy danh mục'
            });
        }

        // Lấy sản phẩm theo danh mục
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        
        const products = await Product.find({ 
            category: category._id,
            isActive: true 
        })
        .select('name slug description price salePrice images category averageRating')
        .sort('-createdAt')
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

        // Đếm tổng sản phẩm
        const total = await Product.countDocuments({ 
            category: category._id,
            isActive: true 
        });

        // Thêm base URL vào images
        const categoryWithFullUrl = addBaseUrlToImages(category);

        res.json({
            success: true,
            data: {
                category: categoryWithFullUrl,
                products: products.map(product => {
                    const baseUrl = process.env.BASE_URL;
                    if (product.images && product.images.length > 0) {
                        product.images = product.images.map(image => 
                            image.startsWith('http') ? image : `${baseUrl}${image}`
                        );
                    }
                    return product;
                }),
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        console.error('Lỗi lấy chi tiết danh mục:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
}; 