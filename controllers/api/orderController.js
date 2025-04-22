const Order = require('../../models/Order');
const Cart = require('../../models/Cart');
const Product = require('../../models/Product');
const crypto = require('crypto');
const axios = require('axios');

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

// Helper function to generate MoMo signature
const generateMoMoSignature = (rawSignature) => {
    return crypto
        .createHmac('sha256', process.env.MOMO_SECRET_KEY)
        .update(rawSignature)
        .digest('hex');
};

// Helper function to create MoMo payment request
const createMoMoPayment = async (order) => {
    try {
        const requestId = `${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
        const orderId = `${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
        
        const rawSignature = `accessKey=${process.env.MOMO_ACCESS_KEY}&amount=${order.totalAmount}&extraData=&ipnUrl=${process.env.MOMO_IPN_URL}&orderId=${orderId}&orderInfo=Thanh toan don hang ${order.orderNumber}&partnerCode=${process.env.MOMO_PARTNER_CODE}&redirectUrl=${process.env.MOMO_REDIRECT_URL}&requestId=${requestId}&requestType=captureWallet`;
        
        const signature = generateMoMoSignature(rawSignature);

        const requestBody = {
            partnerCode: process.env.MOMO_PARTNER_CODE,
            partnerName: "Shop Quần Áo",
            storeId: "Shop Quần Áo Online",
            requestId: requestId,
            amount: order.totalAmount,
            orderId: orderId,
            orderInfo: `Thanh toan don hang ${order.orderNumber}`,
            redirectUrl: process.env.MOMO_REDIRECT_URL,
            ipnUrl: process.env.MOMO_IPN_URL,
            lang: "vi",
            requestType: "captureWallet",
            autoCapture: true,
            extraData: "",
            signature: signature
        };

        const response = await axios.post(process.env.MOMO_ENDPOINT, requestBody);
        
        if (response.data.resultCode === 0) {
            // Cập nhật thông tin thanh toán vào đơn hàng
            await Order.findByIdAndUpdate(order._id, {
                momoPaymentInfo: {
                    requestId,
                    orderId,
                    payUrl: response.data.payUrl,
                    deeplink: response.data.deeplink,
                    qrCodeUrl: response.data.qrCodeUrl
                }
            });
            
            return response.data;
        } else {
            throw new Error(response.data.message);
        }
    } catch (error) {
        console.error('Lỗi tạo thanh toán MoMo:', error);
        throw error;
    }
};

// @desc    Lấy danh sách đơn hàng của người dùng
// @route   GET /api/v1/orders
// @access  Private
exports.getOrders = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        
        // Lấy đơn hàng của user hiện tại
        const orders = await Order.find({ user: req.user.id })
            .sort('-createdAt')
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('items.product', 'name slug images price')
            .lean();

        // Đếm tổng số đơn hàng
        const total = await Order.countDocuments({ user: req.user.id });

        // Thêm base URL vào images của sản phẩm
        const ordersWithFullUrls = orders.map(order => {
            order.items = order.items.map(item => {
                if (item.product) {
                    item.product = addBaseUrlToProductImages(item.product);
                }
                return item;
            });
            return order;
        });

        res.json({
            success: true,
            data: {
                orders: ordersWithFullUrls,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        console.error('Lỗi lấy đơn hàng:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

// @desc    Lấy chi tiết đơn hàng
// @route   GET /api/v1/orders/:id
// @access  Private
exports.getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('items.product', 'name slug images price salePrice')
            .lean();

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng'
            });
        }

        // Kiểm tra quyền truy cập
        if (order.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Không có quyền truy cập đơn hàng này'
            });
        }

        // Thêm base URL vào images của sản phẩm
        order.items = order.items.map(item => {
            if (item.product) {
                item.product = addBaseUrlToProductImages(item.product);
            }
            return item;
        });

        res.json({
            success: true,
            data: order
        });
    } catch (error) {
        console.error('Lỗi lấy chi tiết đơn hàng:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

// @desc    Tạo đơn hàng mới từ giỏ hàng
// @route   POST /api/v1/orders
// @access  Private
exports.createOrder = async (req, res) => {
    try {
        console.log('Nhận request tạo đơn hàng:', JSON.stringify(req.body));
        const { shippingAddress, paymentMethod } = req.body;

        // Validate đầu vào
        if (!shippingAddress || !paymentMethod) {
            console.error('Thiếu thông tin cần thiết:', { 
                hasShippingAddress: Boolean(shippingAddress), 
                hasPaymentMethod: Boolean(paymentMethod) 
            });
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp địa chỉ giao hàng và phương thức thanh toán'
            });
        }

        // Kiểm tra các trường bắt buộc của địa chỉ
        if (!shippingAddress.fullName || !shippingAddress.phone || !shippingAddress.address) {
            console.error('Thiếu thông tin địa chỉ:', { 
                hasFullName: Boolean(shippingAddress.fullName), 
                hasPhone: Boolean(shippingAddress.phone),
                hasAddress: Boolean(shippingAddress.address)
            });
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp đầy đủ thông tin địa chỉ giao hàng'
            });
        }

        // Kiểm tra phương thức thanh toán hợp lệ
        const validPaymentMethods = ['COD', 'VNPAY', 'MOMO'];
        if (!validPaymentMethods.includes(paymentMethod)) {
            console.error('Phương thức thanh toán không hợp lệ:', paymentMethod);
            return res.status(400).json({
                success: false,
                message: `Phương thức thanh toán không hợp lệ. Các phương thức thanh toán hợp lệ: ${validPaymentMethods.join(', ')}`
            });
        }

        // Tìm giỏ hàng của user
        console.log('Tìm giỏ hàng cho user:', req.user.id);
        const cart = await Cart.findOne({ user: req.user.id })
            .populate('items.product');

        if (!cart || !cart.items || cart.items.length === 0) {
            console.error('Giỏ hàng trống:', { hasCart: Boolean(cart), itemsCount: cart?.items?.length || 0 });
            return res.status(400).json({
                success: false,
                message: 'Giỏ hàng trống'
            });
        }

        console.log('Tìm thấy giỏ hàng với số lượng sản phẩm:', cart.items.length);

        // Kiểm tra còn hàng và variant hợp lệ
        for (const item of cart.items) {
            const product = item.product;
            
            // Kiểm tra số lượng
            if (product.stock < item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Sản phẩm ${product.name} chỉ còn ${product.stock} sản phẩm`
                });
            }
            
            // Kiểm tra variant hợp lệ
            if (item.variant && Object.keys(item.variant).length > 0) {
                // Kiểm tra màu sắc
                if (item.variant.color && product.colors && product.colors.length > 0) {
                    if (!product.colors.includes(item.variant.color)) {
                        return res.status(400).json({
                            success: false,
                            message: `Màu ${item.variant.color} không có sẵn cho sản phẩm ${product.name}`
                        });
                    }
                }
                
                // Kiểm tra kích thước
                if (item.variant.size && product.sizes && product.sizes.length > 0) {
                    if (!product.sizes.includes(item.variant.size)) {
                        return res.status(400).json({
                            success: false,
                            message: `Kích thước ${item.variant.size} không có sẵn cho sản phẩm ${product.name}`
                        });
                    }
                }
            }
        }

        // Tạo array items cho đơn hàng
        const orderItems = cart.items.map(item => ({
            product: item.product._id,
            quantity: item.quantity,
            price: item.price,
            variant: item.variant || {}
        }));

        // Tính toán tổng tiền
        const totalAmount = cart.totalPrice;
        
        // Phí vận chuyển mặc định
        const shippingFee = 0; // Có thể tính toán dựa trên địa chỉ và cân nặng

        // Tạo mã đơn hàng duy nhất - đảm bảo không trùng lặp
        const timestamp = Date.now();
        const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        const orderNumber = `DH${timestamp}${randomNum}`;
        
        console.log('Tạo đơn hàng với mã:', orderNumber);

        // Kiểm tra xem mã đơn hàng đã tồn tại chưa
        const existingOrder = await Order.findOne({ orderNumber });
        if (existingOrder) {
            console.error('Trùng mã đơn hàng, tạo mã mới...');
            return res.status(400).json({
                success: false,
                message: 'Lỗi tạo mã đơn hàng, vui lòng thử lại'
            });
        }

        // Tạo đơn hàng mới
        const newOrder = await Order.create({
            user: req.user.id,
            orderNumber,
            items: orderItems,
            totalAmount: totalAmount + shippingFee,
            shippingAddress,
            paymentMethod,
            shippingFee,
            orderStatus: 'Chờ xác nhận',
            paymentStatus: paymentMethod === 'MOMO' ? 'Chờ thanh toán' : (paymentMethod === 'COD' ? 'Chưa thanh toán' : 'Đã thanh toán'),
            paidAt: paymentMethod === 'VNPAY' ? new Date() : undefined,
            note: shippingAddress.note
        });

        // Nếu thanh toán qua MoMo
        if (paymentMethod === 'MOMO') {
            try {
                const momoResponse = await createMoMoPayment(newOrder);
                
                // Lấy thông tin đơn hàng đầy đủ
                const order = await Order.findById(newOrder._id)
                    .populate('items.product', 'name slug images price')
                    .lean();

                // Thêm base URL vào images của sản phẩm
                order.items = order.items.map(item => {
                    if (item.product) {
                        item.product = addBaseUrlToProductImages(item.product);
                    }
                    return item;
                });

                return res.status(201).json({
                    success: true,
                    data: {
                        order,
                        paymentUrl: momoResponse.payUrl,
                        deeplink: momoResponse.deeplink,
                        qrCodeUrl: momoResponse.qrCodeUrl
                    },
                    message: 'Đơn hàng đã được tạo, vui lòng thanh toán qua MoMo'
                });
            } catch (momoError) {
                console.error('Lỗi tạo thanh toán MoMo:', momoError);
                // Không xóa đơn hàng, chỉ cập nhật trạng thái
                await Order.findByIdAndUpdate(newOrder._id, {
                    paymentStatus: 'Chưa thanh toán',
                    orderStatus: 'Đã hủy'
                });
                
                return res.status(400).json({
                    success: false,
                    message: 'Lỗi khi tạo thanh toán MoMo: ' + momoError.message
                });
            }
        }

        // Cập nhật số lượng sản phẩm (giảm stock, tăng sold)
        for (const item of cart.items) {
            if (!item.product || !item.product._id) {
                console.error('Lỗi: Sản phẩm không hợp lệ:', item);
                continue; // Bỏ qua sản phẩm không hợp lệ
            }
            
            try {
                await Product.findByIdAndUpdate(item.product._id, {
                    $inc: { stock: -item.quantity, sold: item.quantity }
                });
            } catch (productError) {
                console.error(`Lỗi cập nhật sản phẩm ${item.product._id}:`, productError);
                // Không throw lỗi ở đây để tiếp tục xử lý các sản phẩm khác
            }
        }

        // Xóa giỏ hàng sau khi đặt hàng
        cart.items = [];
        cart.totalPrice = 0;
        await cart.save();

        // Lấy thông tin đơn hàng đầy đủ
        const order = await Order.findById(newOrder._id)
            .populate('items.product', 'name slug images price')
            .lean();

        // Thêm base URL vào images của sản phẩm
        order.items = order.items.map(item => {
            if (item.product) {
                item.product = addBaseUrlToProductImages(item.product);
            }
            return item;
        });

        res.status(201).json({
            success: true,
            data: order,
            message: 'Đặt hàng thành công'
        });
    } catch (error) {
        console.error('Lỗi tạo đơn hàng:', error);
        
        // Kiểm tra lỗi cụ thể để trả về thông báo rõ ràng hơn
        if (error.name === 'ValidationError') {
            // Lỗi validation từ Mongoose
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({
                success: false,
                message: messages.join(', ')
            });
        } else if (error.code === 11000) {
            // Lỗi trùng lặp dữ liệu unique
            console.error('Lỗi trùng lặp dữ liệu:', error.keyValue);

            // Tạo một mã đơn hàng mới để thử lại
            const timestamp = Date.now();
            const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
            const newOrderNumber = `DH${timestamp}${randomNum}_retry`;

            console.log('Tạo lại đơn hàng với mã mới:', newOrderNumber);

            try {
                // Thử tạo đơn hàng với mã mới
                const newOrder = await Order.create({
                    user: req.user.id,
                    orderNumber: newOrderNumber,
                    items: orderItems,
                    totalAmount: totalAmount + shippingFee,
                    shippingAddress,
                    paymentMethod,
                    shippingFee,
                    orderStatus: 'Chờ xác nhận',
                    paymentStatus: paymentMethod === 'COD' ? 'Chưa thanh toán' : 'Đã thanh toán',
                    paidAt: paymentMethod !== 'COD' ? new Date() : undefined,
                    note: shippingAddress.note
                });

                // Thử tạo thành công, tiếp tục các bước xử lý
                // Cập nhật số lượng sản phẩm (giảm stock, tăng sold)
                for (const item of cart.items) {
                    if (!item.product || !item.product._id) {
                        console.error('Lỗi: Sản phẩm không hợp lệ:', item);
                        continue; // Bỏ qua sản phẩm không hợp lệ
                    }
                    
                    try {
                        await Product.findByIdAndUpdate(item.product._id, {
                            $inc: { stock: -item.quantity, sold: item.quantity }
                        });
                    } catch (productError) {
                        console.error(`Lỗi cập nhật sản phẩm ${item.product._id}:`, productError);
                    }
                }

                // Xóa giỏ hàng sau khi đặt hàng
                cart.items = [];
                cart.totalPrice = 0;
                await cart.save();

                // Lấy thông tin đơn hàng đầy đủ
                const order = await Order.findById(newOrder._id)
                    .populate('items.product', 'name slug images price')
                    .lean();

                // Thêm base URL vào images của sản phẩm
                order.items = order.items.map(item => {
                    if (item.product) {
                        item.product = addBaseUrlToProductImages(item.product);
                    }
                    return item;
                });

                return res.status(201).json({
                    success: true,
                    data: order,
                    message: 'Đặt hàng thành công'
                });
            } catch (retryError) {
                console.error('Lỗi khi thử tạo lại đơn hàng:', retryError);
                return res.status(400).json({
                    success: false,
                    message: 'Không thể tạo đơn hàng, vui lòng thử lại sau'
                });
            }
        } else if (error.kind === 'ObjectId') {
            // Lỗi ObjectId không hợp lệ
            return res.status(400).json({
                success: false,
                message: 'ID không hợp lệ'
            });
        }
        
        res.status(500).json({
            success: false,
            message: `Lỗi server: ${error.message || 'Không xác định'}`
        });
    }
};

// @desc    Hủy đơn hàng
// @route   PUT /api/v1/orders/:id/cancel
// @access  Private
exports.cancelOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng'
            });
        }

        // Kiểm tra quyền truy cập
        if (order.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Không có quyền hủy đơn hàng này'
            });
        }

        // Kiểm tra trạng thái đơn hàng
        if (order.orderStatus !== 'Chờ xác nhận' && order.orderStatus !== 'Đã xác nhận') {
            return res.status(400).json({
                success: false,
                message: 'Không thể hủy đơn hàng ở trạng thái này'
            });
        }

        // Cập nhật trạng thái đơn hàng
        order.orderStatus = 'Đã hủy';
        
        // Nếu đã thanh toán, cập nhật trạng thái thanh toán
        if (order.paymentStatus === 'Đã thanh toán') {
            order.paymentStatus = 'Hoàn tiền';
        }

        await order.save();

        // Cập nhật lại stock sản phẩm (tăng stock, giảm sold)
        for (const item of order.items) {
            await Product.findByIdAndUpdate(item.product._id, {
                $inc: { stock: item.quantity, sold: -item.quantity }
            });
        }

        // Lấy thông tin đơn hàng đầy đủ
        const updatedOrder = await Order.findById(order._id)
            .populate('items.product', 'name slug images price')
            .lean();

        // Thêm base URL vào images của sản phẩm
        updatedOrder.items = updatedOrder.items.map(item => {
            if (item.product) {
                item.product = addBaseUrlToProductImages(item.product);
            }
            return item;
        });

        res.json({
            success: true,
            data: updatedOrder,
            message: 'Hủy đơn hàng thành công'
        });
    } catch (error) {
        console.error('Lỗi hủy đơn hàng:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

// @desc    Cập nhật trạng thái đơn hàng
// @route   PUT /api/v1/orders/:id/update-status
// @access  Private/Admin
exports.updateStatus = async (req, res) => {
    try {
        const { orderStatus } = req.body;
        
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng',
            });
        }

        // Kiểm tra quyền truy cập
        if (req.user.role !== 'admin' && req.user._id.toString() !== order.user.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền cập nhật đơn hàng này',
            });
        }

        // Kiểm tra xem đơn hàng có thể cập nhật trạng thái hay không
        if (order.orderStatus !== 'Chờ xác nhận' && order.orderStatus !== 'Đã xác nhận') {
            return res.status(400).json({
                success: false,
                message: 'Không thể cập nhật trạng thái cho đơn hàng này',
            });
        }

        // Cập nhật trạng thái
        order.orderStatus = orderStatus;

        // Nếu trạng thái là "Đã giao hàng", cập nhật thời gian giao hàng
        if (orderStatus === 'Đã giao hàng') {
            order.deliveredAt = Date.now();
        }

        // Nếu trạng thái là "Đã giao hàng" và phương thức thanh toán là COD
        // và trạng thái thanh toán là "Chưa thanh toán", thì cập nhật thành "Đã thanh toán"
        if (orderStatus === 'Đã giao hàng' && order.paymentMethod === 'COD' && order.paymentStatus === 'Chưa thanh toán') {
            order.paymentStatus = 'Đã thanh toán';
            order.paidAt = Date.now();
        }

        await order.save();

        res.json({
            success: true,
            message: 'Đã cập nhật trạng thái đơn hàng',
            order,
        });
    } catch (error) {
        console.error('Lỗi khi cập nhật trạng thái đơn hàng:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message,
        });
    }
};

// @desc    Thanh toán đơn hàng
// @route   PUT /api/v1/orders/:id/pay
// @access  Private
exports.payOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng'
            });
        }

        // Kiểm tra quyền truy cập
        if (order.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Không có quyền thanh toán đơn hàng này'
            });
        }

        // Kiểm tra trạng thái thanh toán
        if (order.paymentStatus === 'Đã thanh toán') {
            return res.status(400).json({
                success: false,
                message: 'Đơn hàng đã được thanh toán'
            });
        }

        // Cập nhật trạng thái thanh toán
        order.paymentStatus = 'Đã thanh toán';
        order.paidAt = new Date();
        await order.save();

        // Lấy thông tin đơn hàng đầy đủ
        const updatedOrder = await Order.findById(order._id)
            .populate('items.product', 'name slug images price')
            .lean();

        // Thêm base URL vào images của sản phẩm
        updatedOrder.items = updatedOrder.items.map(item => {
            if (item.product) {
                item.product = addBaseUrlToProductImages(item.product);
            }
            return item;
        });

        res.json({
            success: true,
            data: updatedOrder,
            message: 'Thanh toán đơn hàng thành công'
        });
    } catch (error) {
        console.error('Lỗi thanh toán đơn hàng:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

// @desc    Xử lý webhook từ MoMo (IPN)
// @route   POST /api/v1/orders/momo-ipn
// @access  Public
exports.handleMoMoIPN = async (req, res) => {
    try {
        const {
            partnerCode,
            orderId,
            requestId,
            amount,
            orderInfo,
            orderType,
            transId,
            resultCode,
            message,
            payType,
            responseTime,
            extraData,
            signature
        } = req.body;

        // Verify signature
        const rawSignature = `accessKey=${process.env.MOMO_ACCESS_KEY}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;
        const checkSignature = generateMoMoSignature(rawSignature);

        if (signature !== checkSignature) {
            return res.status(400).json({ message: 'Invalid signature' });
        }

        // Tìm đơn hàng theo MoMo orderId
        const order = await Order.findOne({ 'momoPaymentInfo.orderId': orderId });
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Cập nhật trạng thái thanh toán
        if (resultCode === 0) {
            order.paymentStatus = 'Đã thanh toán';
            order.paidAt = new Date();
            order.momoPaymentInfo.transId = transId;
            order.momoPaymentInfo.payType = payType;
            await order.save();
        }

        res.json({ message: 'OK' });
    } catch (error) {
        console.error('Lỗi xử lý IPN MoMo:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// @desc    Xử lý kết quả thanh toán MoMo
// @route   GET /api/v1/orders/momo-return
// @access  Public
exports.handleMoMoReturn = async (req, res) => {
    try {
        const { resultCode, orderId } = req.query;
        
        // Tìm đơn hàng theo MoMo orderId
        const order = await Order.findOne({ 'momoPaymentInfo.orderId': orderId });
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng'
            });
        }

        if (resultCode === '0') {
            // Thanh toán thành công
            res.json({
                success: true,
                message: 'Thanh toán thành công',
                data: { orderNumber: order.orderNumber }
            });
        } else {
            // Thanh toán thất bại
            res.json({
                success: false,
                message: 'Thanh toán thất bại',
                data: { orderNumber: order.orderNumber }
            });
        }
    } catch (error) {
        console.error('Lỗi xử lý kết quả thanh toán MoMo:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
}; 