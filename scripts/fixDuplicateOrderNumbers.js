/**
 * Script để xử lý các đơn hàng bị trùng lặp orderNumber
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
        // Tìm tất cả các giá trị orderNumber
        const allOrderNumbers = await Order.aggregate([
            { $group: { _id: "$orderNumber", count: { $sum: 1 } } },
            { $match: { count: { $gt: 1 } } }, // Chỉ lấy những giá trị có nhiều hơn 1 đơn hàng
            { $sort: { count: -1 } }
        ]);
        
        console.log(`Tìm thấy ${allOrderNumbers.length} giá trị orderNumber bị trùng lặp`);
        
        // Xử lý từng trường hợp trùng lặp
        for (const duplicate of allOrderNumbers) {
            const orderNumber = duplicate._id;
            const count = duplicate.count;
            
            console.log(`Xử lý orderNumber: ${orderNumber} (${count} đơn hàng)`);
            
            // Lấy tất cả đơn hàng có cùng orderNumber
            const orders = await Order.find({ orderNumber }).sort({ createdAt: 1 });
            
            // Giữ nguyên đơn hàng đầu tiên, cập nhật các đơn hàng còn lại
            for (let i = 1; i < orders.length; i++) {
                const order = orders[i];
                const timestamp = Date.now();
                const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
                const newOrderNumber = `DH${timestamp}${randomNum}_fixed_dup${i}`;
                
                console.log(`  Cập nhật đơn hàng ${i}/${orders.length-1}: ${order._id} -> ${newOrderNumber}`);
                
                // Cập nhật đơn hàng
                await Order.updateOne(
                    { _id: order._id },
                    { $set: { orderNumber: newOrderNumber } }
                );
            }
        }
        
        console.log('Hoàn thành xử lý đơn hàng trùng lặp!');
        
        // Kiểm tra nếu có đơn hàng nào không có orderNumber
        const nullOrders = await Order.find({ $or: [
            { orderNumber: null },
            { orderNumber: { $exists: false } }
        ]});
        
        if (nullOrders.length > 0) {
            console.log(`Tìm thấy ${nullOrders.length} đơn hàng không có orderNumber`);
            
            // Cập nhật từng đơn hàng
            for (let i = 0; i < nullOrders.length; i++) {
                const order = nullOrders[i];
                const timestamp = Date.now();
                const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
                const orderNumber = `DH${timestamp}${randomNum}_null_fixed`;
                
                console.log(`Cập nhật đơn hàng null ${i+1}/${nullOrders.length}: ${order._id} -> ${orderNumber}`);
                
                // Cập nhật đơn hàng
                await Order.updateOne(
                    { _id: order._id },
                    { $set: { orderNumber: orderNumber } }
                );
            }
        } else {
            console.log('Không có đơn hàng nào thiếu orderNumber');
        }
    } catch (err) {
        console.error('Lỗi:', err);
    } finally {
        mongoose.connection.close();
        console.log('Đã đóng kết nối MongoDB');
    }
}).catch(err => {
    console.log('Lỗi kết nối:', err);
}); 