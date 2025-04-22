const Product = require('../../models/Product');

// Helper function to add base URL to images
const addBaseUrlToImages = (product) => {
    const baseUrl = process.env.BASE_URL;
    if (product.images && product.images.length > 0) {
        product.images = product.images.map(image => 
            image.startsWith('http') ? image : `${baseUrl}${image}`
        );
    }
    return product;
};

// @desc    Lấy danh sách sản phẩm đang active
// @route   GET /api/v1/products
// @access  Public
exports.getProducts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const category = req.query.category;
        
        // Query conditions
        const conditions = { isActive: true };
        if (category) {
            conditions.category = category;
        }

        // Get products
        const products = await Product.find(conditions)
            .select('name slug description price salePrice images category averageRating colors sizes')
            .populate('category', 'name slug')
            .sort('-createdAt')
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(); // Convert to plain JavaScript objects

        // Add base URL to images
        const productsWithFullUrls = products.map(product => addBaseUrlToImages(product));

        // Get total
        const total = await Product.countDocuments(conditions);

        res.json({
            success: true,
            data: {
                products: productsWithFullUrls,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        console.error('Lỗi lấy sản phẩm:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

// @desc    Lấy chi tiết sản phẩm
// @route   GET /api/v1/products/:slug
// @access  Public
exports.getProduct = async (req, res) => {
    try {
        const product = await Product.findOne({ 
            slug: req.params.slug,
            isActive: true 
        })
        .populate('category', 'name slug')
        .select('-ratings')
        .lean(); // Convert to plain JavaScript object

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy sản phẩm'
            });
        }

        // Add base URL to images
        const productWithFullUrls = addBaseUrlToImages(product);

        res.json({
            success: true,
            data: productWithFullUrls
        });
    } catch (error) {
        console.error('Lỗi lấy chi tiết sản phẩm:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};