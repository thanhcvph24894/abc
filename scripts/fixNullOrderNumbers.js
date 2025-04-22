/**
 * Script để sửa các đơn hàng có orderNumber là null
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
        // Tìm tất cả đơn hàng có orderNumber là null
        const orders = await Order.find({ orderNumber: null });
        console.log(`Tìm thấy ${orders.length} đơn hàng có orderNumber là null`);
        
        // Cập nhật từng đơn hàng
        for (let i = 0; i < orders.length; i++) {
            const order = orders[i];
            const timestamp = Date.now();
            const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
            const orderNumber = `DH${timestamp}${randomNum}_fixed`;
            
            console.log(`Cập nhật đơn hàng ${i+1}/${orders.length}: ${order._id} -> ${orderNumber}`);
            
            // Cập nhật đơn hàng
            await Order.updateOne(
                { _id: order._id },
                { $set: { orderNumber: orderNumber } }
            );
        }
        
        console.log('Hoàn thành cập nhật!');
    } catch (err) {
        console.error('Lỗi:', err);
    } finally {
        mongoose.connection.close();
        console.log('Đã đóng kết nối MongoDB');
    }
}).catch(err => {
    console.log('Lỗi kết nối:', err);
}); 