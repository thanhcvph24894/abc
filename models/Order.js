const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    orderNumber: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        price: {
            type: Number,
            required: true
        },
        variant: {
            size: String,
            color: String
        }
    }],
    totalAmount: {
        type: Number,
        required: true
    },
    shippingAddress: {
        fullName: {
            type: String,
            required: true
        },
        phone: {
            type: String,
            required: true
        },
        address: {
            type: String,
            required: true
        },
        city: {
            type: String,
            required: false
        },
        district: {
            type: String,
            required: false
        },
        ward: {
            type: String,
            required: false
        }
    },
    orderStatus: {
        type: String,
        enum: ['Chờ xác nhận', 'Đã xác nhận', 'Đang giao hàng', 'Đã giao hàng', 'Đã hủy'],
        default: 'Chờ xác nhận'
    },
    paymentMethod: {
        type: String,
        enum: ['COD', 'VNPAY', 'MOMO'],
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ['Chưa thanh toán', 'Chờ thanh toán', 'Đã thanh toán', 'Hoàn tiền'],
        default: 'Chưa thanh toán'
    },
    momoPaymentInfo: {
        requestId: String,
        orderId: String,
        payUrl: String,
        deeplink: String,
        qrCodeUrl: String,
        transId: String,
        payType: String
    },
    paidAt: {
        type: Date
    },
    deliveredAt: {
        type: Date
    },
    shippingFee: {
        type: Number,
        default: 0
    },
    discount: {
        type: Number,
        default: 0
    },
    note: String,
    coupon: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Coupon'
    }
}, {
    timestamps: true
});

// Tự động tạo orderNumber nếu không được thiết lập
orderSchema.pre('save', function(next) {
    if (!this.orderNumber) {
        this.orderNumber = 'DH' + Date.now() + Math.floor(Math.random() * 1000);
    }
    // Để tương thích với dữ liệu cũ, chuyển từ status sang orderStatus nếu cần
    if (this.status && !this.orderStatus) {
        this.orderStatus = this.status;
    }
    next();
});

module.exports = mongoose.model('Order', orderSchema); 