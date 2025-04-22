const Cart = require('../../models/Cart');
const Product = require('../../models/Product');

// Helper function to add base URL to product images
const addBaseUrlToProductImages = (product) => {
    const baseUrl = process.env.BASE_URL;
    if (product.images && product.images.length > 0) {
        product.images = product.images.map(image => 
            image.startsWith('http') ? image : `${baseUrl}${image}`
        );
    }
    return product;
};

// @desc    Lấy giỏ hàng của người dùng
// @route   GET /api/v1/cart
// @access  Private
exports.getCart = async (req, res) => {
    try {
        // Tìm giỏ hàng của user hiện tại
        let cart = await Cart.findOne({ user: req.user.id })
            .populate({
                path: 'items.product',
                select: 'name slug price salePrice images',
            })
            .lean();

        // Nếu chưa có giỏ hàng, tạo mới
        if (!cart) {
            cart = await Cart.create({ user: req.user.id, items: [], totalPrice: 0 });
            cart = await Cart.findById(cart._id)
                .populate({
                    path: 'items.product',
                    select: 'name slug price salePrice images',
                })
                .lean();
        }

        // Thêm baseUrl vào images của sản phẩm
        if (cart.items && cart.items.length > 0) {
            cart.items = cart.items.map(item => {
                if (item.product) {
                    item.product = addBaseUrlToProductImages(item.product);
                }
                return item;
            });
        }

        res.json({
            success: true,
            data: cart
        });
    } catch (error) {
        console.error('Lỗi lấy giỏ hàng:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

// @desc    Thêm sản phẩm vào giỏ hàng
// @route   POST /api/v1/cart
// @access  Private
exports.addToCart = async (req, res) => {
    try {
        const { productId, quantity = 1, variant = {} } = req.body;

        // Kiểm tra sản phẩm tồn tại
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy sản phẩm'
            });
        }

        // Kiểm tra số lượng hợp lệ
        if (quantity <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Số lượng phải lớn hơn 0'
            });
        }

        // Kiểm tra còn hàng
        if (product.stock < quantity) {
            return res.status(400).json({
                success: false,
                message: 'Sản phẩm không đủ số lượng'
            });
        }

        // Kiểm tra variant hợp lệ nếu có
        if (variant && Object.keys(variant).length > 0) {
            // Kiểm tra màu sắc nếu có
            if (variant.color && product.colors && product.colors.length > 0) {
                if (!product.colors.includes(variant.color)) {
                    return res.status(400).json({
                        success: false,
                        message: `Màu sắc '${variant.color}' không có sẵn cho sản phẩm này`
                    });
                }
            }
            
            // Kiểm tra kích thước nếu có
            if (variant.size && product.sizes && product.sizes.length > 0) {
                if (!product.sizes.includes(variant.size)) {
                    return res.status(400).json({
                        success: false,
                        message: `Kích thước '${variant.size}' không có sẵn cho sản phẩm này`
                    });
                }
            }
        }

        // Tìm giỏ hàng của user
        let cart = await Cart.findOne({ user: req.user.id });

        // Nếu chưa có giỏ hàng, tạo mới
        if (!cart) {
            cart = new Cart({
                user: req.user.id,
                items: [],
                totalPrice: 0
            });
        }

        // Tính giá sản phẩm
        const price = product.salePrice || product.price;

        // Kiểm tra nếu sản phẩm đã có trong giỏ hàng
        const existingItemIndex = cart.items.findIndex(item => 
            item.product.toString() === productId && 
            JSON.stringify(item.variant) === JSON.stringify(variant)
        );

        if (existingItemIndex > -1) {
            // Cập nhật số lượng
            cart.items[existingItemIndex].quantity += quantity;
        } else {
            // Thêm sản phẩm mới vào giỏ hàng
            cart.items.push({
                product: productId,
                quantity,
                price,
                variant
            });
        }

        // Tính lại tổng giá
        cart.totalPrice = cart.items.reduce((total, item) => {
            return total + (item.price * item.quantity);
        }, 0);

        // Lưu giỏ hàng
        await cart.save();

        // Lấy giỏ hàng đã cập nhật với thông tin sản phẩm đầy đủ
        const updatedCart = await Cart.findById(cart._id)
            .populate({
                path: 'items.product',
                select: 'name slug price salePrice images',
            })
            .lean();

        // Thêm baseUrl vào images của sản phẩm
        if (updatedCart.items && updatedCart.items.length > 0) {
            updatedCart.items = updatedCart.items.map(item => {
                if (item.product) {
                    item.product = addBaseUrlToProductImages(item.product);
                }
                return item;
            });
        }

        res.json({
            success: true,
            data: updatedCart,
            message: 'Đã thêm sản phẩm vào giỏ hàng'
        });
    } catch (error) {
        console.error('Lỗi thêm vào giỏ hàng:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

// @desc    Cập nhật số lượng sản phẩm trong giỏ hàng
// @route   PUT /api/v1/cart/:itemId
// @access  Private
exports.updateCartItem = async (req, res) => {
    try {
        const { quantity } = req.body;
        const { itemId } = req.params;

        // Kiểm tra số lượng hợp lệ
        if (quantity <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Số lượng phải lớn hơn 0'
            });
        }

        // Tìm giỏ hàng của user
        const cart = await Cart.findOne({ user: req.user.id });
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy giỏ hàng'
            });
        }

        // Tìm sản phẩm trong giỏ hàng
        const itemIndex = cart.items.findIndex(item => item._id.toString() === itemId);
        if (itemIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy sản phẩm trong giỏ hàng'
            });
        }

        // Kiểm tra còn hàng
        const product = await Product.findById(cart.items[itemIndex].product);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy sản phẩm'
            });
        }

        if (product.stock < quantity) {
            return res.status(400).json({
                success: false,
                message: 'Sản phẩm không đủ số lượng'
            });
        }

        // Cập nhật số lượng
        cart.items[itemIndex].quantity = quantity;

        // Tính lại tổng giá
        cart.totalPrice = cart.items.reduce((total, item) => {
            return total + (item.price * item.quantity);
        }, 0);

        // Lưu giỏ hàng
        await cart.save();

        // Lấy giỏ hàng đã cập nhật với thông tin sản phẩm đầy đủ
        const updatedCart = await Cart.findById(cart._id)
            .populate({
                path: 'items.product',
                select: 'name slug price salePrice images',
            })
            .lean();

        // Thêm baseUrl vào images của sản phẩm
        if (updatedCart.items && updatedCart.items.length > 0) {
            updatedCart.items = updatedCart.items.map(item => {
                if (item.product) {
                    item.product = addBaseUrlToProductImages(item.product);
                }
                return item;
            });
        }

        res.json({
            success: true,
            data: updatedCart,
            message: 'Đã cập nhật giỏ hàng'
        });
    } catch (error) {
        console.error('Lỗi cập nhật giỏ hàng:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

// @desc    Xóa sản phẩm khỏi giỏ hàng
// @route   DELETE /api/v1/cart/:itemId
// @access  Private
exports.removeCartItem = async (req, res) => {
    try {
        const { itemId } = req.params;

        // Tìm giỏ hàng của user
        const cart = await Cart.findOne({ user: req.user.id });
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy giỏ hàng'
            });
        }

        // Tìm sản phẩm trong giỏ hàng
        const itemIndex = cart.items.findIndex(item => item._id.toString() === itemId);
        if (itemIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy sản phẩm trong giỏ hàng'
            });
        }

        // Xóa sản phẩm khỏi giỏ hàng
        cart.items.splice(itemIndex, 1);

        // Tính lại tổng giá
        cart.totalPrice = cart.items.reduce((total, item) => {
            return total + (item.price * item.quantity);
        }, 0);

        // Lưu giỏ hàng
        await cart.save();

        // Lấy giỏ hàng đã cập nhật với thông tin sản phẩm đầy đủ
        const updatedCart = await Cart.findById(cart._id)
            .populate({
                path: 'items.product',
                select: 'name slug price salePrice images',
            })
            .lean();

        // Thêm baseUrl vào images của sản phẩm
        if (updatedCart.items && updatedCart.items.length > 0) {
            updatedCart.items = updatedCart.items.map(item => {
                if (item.product) {
                    item.product = addBaseUrlToProductImages(item.product);
                }
                return item;
            });
        }

        res.json({
            success: true,
            data: updatedCart,
            message: 'Đã xóa sản phẩm khỏi giỏ hàng'
        });
    } catch (error) {
        console.error('Lỗi xóa sản phẩm khỏi giỏ hàng:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

// @desc    Xóa toàn bộ giỏ hàng
// @route   DELETE /api/v1/cart
// @access  Private
exports.clearCart = async (req, res) => {
    try {
        // Tìm giỏ hàng của user
        const cart = await Cart.findOne({ user: req.user.id });
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy giỏ hàng'
            });
        }

        // Xóa tất cả sản phẩm
        cart.items = [];
        cart.totalPrice = 0;

        // Lưu giỏ hàng
        await cart.save();

        res.json({
            success: true,
            data: cart,
            message: 'Đã xóa toàn bộ giỏ hàng'
        });
    } catch (error) {
        console.error('Lỗi xóa giỏ hàng:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
}; 