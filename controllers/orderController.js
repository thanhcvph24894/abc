const Order = require('../models/Order');

// Hàm helper để lấy danh sách enum từ schema
const getOrderStatusEnums = () => {
    try {
        return Order.schema.path('orderStatus').enumValues || ['Chờ xác nhận', 'Đã xác nhận', 'Đang giao hàng', 'Đã giao hàng', 'Đã hủy'];
    } catch (error) {
        console.error('Lỗi khi lấy enum orderStatus:', error);
        return ['Chờ xác nhận', 'Đã xác nhận', 'Đang giao hàng', 'Đã giao hàng', 'Đã hủy'];
    }
};

const getPaymentStatusEnums = () => {
    try {
        return Order.schema.path('paymentStatus').enumValues || ['Chưa thanh toán', 'Đã thanh toán', 'Hoàn tiền'];
    } catch (error) {
        console.error('Lỗi khi lấy enum paymentStatus:', error);
        return ['Chưa thanh toán', 'Đã thanh toán', 'Hoàn tiền'];
    }
};

class OrderController {
    // Hiển thị danh sách đơn hàng
    async index(req, res, next) {
        try {
            const query = {};
            
            // Xử lý tìm kiếm đơn giản
            if (req.query.search) {
                query.$or = [
                    { orderNumber: { $regex: req.query.search, $options: 'i' } },
                    { 'shippingAddress.fullName': { $regex: req.query.search, $options: 'i' } },
                    { 'shippingAddress.phone': { $regex: req.query.search, $options: 'i' } }
                ];
            }

            // Xử lý filter theo trạng thái đơn hàng
            if (req.query.orderStatus) {
                query.orderStatus = req.query.orderStatus;
            }

            const orders = await Order.find(query)
                .populate('user', 'name email phone')
                .populate('items.product', 'name images')
                .sort({ createdAt: -1 });

            res.render('pages/orders/index', {
                title: 'Quản lý đơn hàng',
                orders,
                orderStatuses: getOrderStatusEnums(),
                paymentStatuses: getPaymentStatusEnums(),
                messages: req.flash(),
                searchQuery: req.query.search || '',
                selectedStatus: req.query.orderStatus || ''
            });
        } catch (error) {
            next(error);
        }
    }

    // Hiển thị chi tiết đơn hàng
    async show(req, res, next) {
        try {
            const order = await Order.findById(req.params.id)
                .populate('user', 'name email phone address')
                .populate('items.product', 'name images price');

            if (!order) {
                req.flash('error', 'Không tìm thấy đơn hàng');
                return res.redirect('/orders');
            }

            res.render('pages/orders/show', {
                title: 'Chi tiết đơn hàng',
                order,
                orderStatuses: getOrderStatusEnums(),
                paymentStatuses: getPaymentStatusEnums(),
                messages: req.flash()
            });
        } catch (error) {
            next(error);
        }
    }

    // Cập nhật trạng thái đơn hàng
    async updateStatus(req, res) {
        try {
            console.log('Cập nhật trạng thái đơn hàng:', req.params.id, req.body.orderStatus);
            const order = await Order.findById(req.params.id);

            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy đơn hàng'
                });
            }

            // Kiểm tra trạng thái hiện tại
            if (order.orderStatus === 'Đã hủy') {
                return res.status(400).json({
                    success: false,
                    message: 'Không thể thay đổi trạng thái đơn hàng đã hủy'
                });
            }

            if (order.orderStatus === 'Đã giao hàng') {
                return res.status(400).json({
                    success: false,
                    message: 'Không thể thay đổi trạng thái đơn hàng đã giao'
                });
            }

            const { orderStatus } = req.body;

            // Kiểm tra luồng trạng thái hợp lệ
            const validStatusFlow = {
                'Chờ xác nhận': ['Đã xác nhận', 'Đã hủy'],
                'Đã xác nhận': ['Đang giao hàng', 'Đã hủy'],
                'Đang giao hàng': ['Đã giao hàng']
            };

            if (!validStatusFlow[order.orderStatus]?.includes(orderStatus)) {
                return res.status(400).json({
                    success: false,
                    message: `Không thể chuyển trạng thái từ "${order.orderStatus}" sang "${orderStatus}"`
                });
            }

            // Cập nhật trạng thái
            order.orderStatus = orderStatus;

            // Xử lý các logic phụ thuộc
            if (orderStatus === 'Đã giao hàng') {
                // Nếu là COD và giao hàng thành công, tự động cập nhật thanh toán
                if (order.paymentStatus === 'Chưa thanh toán') {
                    order.paymentStatus = 'Đã thanh toán';
                }
            } else if (orderStatus === 'Đã hủy') {
                // Nếu hủy đơn và đã thanh toán, chuyển sang hoàn tiền
                if (order.paymentStatus === 'Đã thanh toán') {
                    order.paymentStatus = 'Hoàn tiền';
                }
            }

            await order.save();
            console.log('Đã cập nhật trạng thái đơn hàng:', order.orderStatus);

            res.json({
                success: true,
                message: `Đã cập nhật trạng thái đơn hàng thành "${orderStatus}"`,
                paymentStatus: order.paymentStatus
            });
        } catch (error) {
            console.error('Lỗi cập nhật trạng thái đơn hàng:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // Cập nhật trạng thái thanh toán
    async updatePaymentStatus(req, res) {
        try {
            console.log('Cập nhật trạng thái thanh toán:', req.params.id, req.body.paymentStatus);
            const order = await Order.findById(req.params.id);

            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy đơn hàng'
                });
            }

            if (['Đã xác nhận', 'Đang giao hàng', 'Chờ xác nhận', 'Đã xác nhận', 'Đã huỷ','Đang giao hàng'].includes(order.orderStatus)) {
                return res.status(400).json({
                    success: false,
                    message: 'Không thể thay đổi trạng thái thanh toán cho đơn hàng đã xác nhận hoặc đang giao hàng'
                });
            }
    

            // Kiểm tra trạng thái đơn hàng
            if (order.orderStatus === 'Đã hủy' && req.body.paymentStatus !== 'Hoàn tiền') {
                return res.status(400).json({
                    success: false,
                    message: 'Đơn hàng đã hủy chỉ có thể chuyển sang trạng thái hoàn tiền'
                });
            }

            // Kiểm tra luồng trạng thái thanh toán hợp lệ
            const validPaymentFlow = {
                'Chưa thanh toán': ['Đã thanh toán'],
                'Đã thanh toán': ['Hoàn tiền'],
                'Hoàn tiền': [] // Không thể thay đổi sau khi đã hoàn tiền
            };

            if (!validPaymentFlow[order.paymentStatus]?.includes(req.body.paymentStatus)) {
                return res.status(400).json({
                    success: false,
                    message: `Không thể chuyển trạng thái thanh toán từ "${order.paymentStatus}" sang "${req.body.paymentStatus}"`
                });
            }

            order.paymentStatus = req.body.paymentStatus;
            await order.save();
            console.log('Đã cập nhật trạng thái thanh toán:', order.paymentStatus);

            res.json({
                success: true,
                message: `Đã cập nhật trạng thái thanh toán thành "${req.body.paymentStatus}"`
            });
        } catch (error) {
            console.error('Lỗi cập nhật trạng thái thanh toán:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
}

module.exports = new OrderController(); 