const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    orderNumber: {
        type: String,
        required: true,
        unique: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Vui lòng đăng nhập để đặt hàng']
    },
    items: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        variant: {
            size: String,
            color: String
        },
        quantity: {
            type: Number,
            required: true,
            min: [1, 'Số lượng phải lớn hơn 0']
        },
        price: {
            type: Number,
            required: true
        }
    }],
    shippingAddress: {
        fullName: {
            type: String,
            required: [true, 'Vui lòng nhập họ tên']
        },
        phone: {
            type: String,
            required: [true, 'Vui lòng nhập số điện thoại']
        },
        address: {
            type: String,
            required: [true, 'Vui lòng nhập địa chỉ']
        },
        city: {
            type: String,
            required: [true, 'Vui lòng nhập thành phố']
        },
        district: {
            type: String,
            required: [true, 'Vui lòng nhập quận/huyện']
        },
        ward: {
            type: String,
            required: [true, 'Vui lòng nhập phường/xã']
        }
    },
    paymentMethod: {
        type: String,
        enum: ['COD', 'VNPAY', 'MOMO'],
        required: [true, 'Vui lòng chọn phương thức thanh toán']
    },
    paymentStatus: {
        type: String,
        enum: ['Chưa thanh toán', 'Đã thanh toán', 'Hoàn tiền'],
        default: 'Chưa thanh toán'
    },
    orderStatus: {
        type: String,
        enum: ['Chờ xác nhận', 'Đã xác nhận', 'Đang giao hàng', 'Đã giao hàng', 'Đã hủy'],
        default: 'Chờ xác nhận'
    },
    totalAmount: {
        type: Number,
        required: true
    },
    shippingFee: {
        type: Number,
        default: 0
    },
    discount: {
        type: Number,
        default: 0
    },
    coupon: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Coupon'
    },
    note: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Order', orderSchema);