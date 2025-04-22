/**
 * Script để phân tích tất cả các đơn hàng trong database
 */
const mongoose = require('mongoose');
const Order = require('../models/Order');

// Kết nối MongoDB
mongoose.connect('mongodb://localhost:27017/shopquanao', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(async () => {
    console.log('MongoDB Connected');
    
    try {
        // Đếm tổng số đơn hàng
        const totalOrders = await Order.countDocuments();
        console.log(`Tổng số đơn hàng: ${totalOrders}`);
        
        // Đếm số đơn hàng không có orderNumber
        const nullOrderNumbers = await Order.countDocuments({ 
            $or: [
                { orderNumber: null },
                { orderNumber: { $exists: false } }
            ]
        });
        console.log(`Số đơn hàng không có orderNumber: ${nullOrderNumbers}`);
        
        // Kiểm tra số đơn hàng theo trạng thái
        const statusCounts = await Order.aggregate([
            { $group: { _id: "$status", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        console.log('Số đơn hàng theo trạng thái:');
        statusCounts.forEach(item => {
            console.log(`  ${item._id || 'Không có trạng thái'}: ${item.count}`);
        });
        
        // Kiểm tra số đơn hàng theo phương thức thanh toán
        const paymentMethodCounts = await Order.aggregate([
            { $group: { _id: "$paymentMethod", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        console.log('Số đơn hàng theo phương thức thanh toán:');
        paymentMethodCounts.forEach(item => {
            console.log(`  ${item._id || 'Không có phương thức thanh toán'}: ${item.count}`);
        });
        
        // Kiểm tra số đơn hàng theo trạng thái thanh toán
        const paymentStatusCounts = await Order.aggregate([
            { $group: { _id: "$paymentStatus", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        console.log('Số đơn hàng theo trạng thái thanh toán:');
        paymentStatusCounts.forEach(item => {
            console.log(`  ${item._id || 'Không có trạng thái thanh toán'}: ${item.count}`);
        });
        
        // Tìm đơn hàng mới nhất
        const latestOrder = await Order.findOne().sort({ createdAt: -1 });
        if (latestOrder) {
            console.log('Đơn hàng mới nhất:');
            console.log(`  ID: ${latestOrder._id}`);
            console.log(`  OrderNumber: ${latestOrder.orderNumber}`);
            console.log(`  Created: ${latestOrder.createdAt}`);
            console.log(`  Status: ${latestOrder.status}`);
            console.log(`  Payment Method: ${latestOrder.paymentMethod}`);
            console.log(`  Payment Status: ${latestOrder.paymentStatus}`);
        }
        
        // Tìm kiếm các đơn hàng có vấn đề
        const problematicOrders = await Order.find({
            $or: [
                { orderNumber: null },
                { orderNumber: { $exists: false } },
                { status: null },
                { status: { $exists: false } },
                { paymentMethod: null },
                { paymentMethod: { $exists: false } },
                { paymentStatus: null },
                { paymentStatus: { $exists: false } }
            ]
        });
        
        if (problematicOrders.length > 0) {
            console.log(`\nTìm thấy ${problematicOrders.length} đơn hàng có vấn đề:`);
            problematicOrders.forEach((order, index) => {
                console.log(`\nĐơn hàng có vấn đề #${index + 1}:`);
                console.log(`  ID: ${order._id}`);
                console.log(`  OrderNumber: ${order.orderNumber || 'MISSING'}`);
                console.log(`  Created: ${order.createdAt}`);
                console.log(`  Status: ${order.status || 'MISSING'}`);
                console.log(`  Payment Method: ${order.paymentMethod || 'MISSING'}`);
                console.log(`  Payment Status: ${order.paymentStatus || 'MISSING'}`);
            });
        } else {
            console.log('\nKhông tìm thấy đơn hàng nào có vấn đề');
        }
    } catch (err) {
        console.error('Lỗi:', err);
    } finally {
        mongoose.connection.close();
        console.log('\nĐã đóng kết nối MongoDB');
    }
}).catch(err => {
    console.log('Lỗi kết nối:', err);
}); 