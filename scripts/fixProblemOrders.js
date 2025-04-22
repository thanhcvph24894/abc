/**
 * Script để sửa các đơn hàng có vấn đề với trạng thái, phương thức thanh toán hoặc trạng thái thanh toán
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
        // Tìm tất cả đơn hàng có vấn đề
        const problematicOrders = await Order.find({
            $or: [
                { status: null },
                { status: { $exists: false } },
                { paymentMethod: null },
                { paymentMethod: { $exists: false } },
                { paymentStatus: null },
                { paymentStatus: { $exists: false } }
            ]
        });
        
        console.log(`Tìm thấy ${problematicOrders.length} đơn hàng có vấn đề`);
        
        // Sửa từng đơn hàng
        for (let i = 0; i < problematicOrders.length; i++) {
            const order = problematicOrders[i];
            console.log(`\nSửa đơn hàng #${i+1}/${problematicOrders.length}: ${order._id}`);
            
            // Chuẩn bị dữ liệu cập nhật
            const updateData = {};
            
            // Kiểm tra và sửa trạng thái đơn hàng
            if (!order.status) {
                console.log('  Thêm trạng thái đơn hàng: Chờ xác nhận');
                updateData.status = 'Chờ xác nhận';
            }
            
            // Kiểm tra và sửa phương thức thanh toán
            if (!order.paymentMethod) {
                console.log('  Thêm phương thức thanh toán: COD');
                updateData.paymentMethod = 'COD';
            }
            
            // Kiểm tra và sửa trạng thái thanh toán
            if (!order.paymentStatus) {
                const paymentStatus = updateData.paymentMethod === 'COD' || order.paymentMethod === 'COD' 
                    ? 'Chưa thanh toán' 
                    : 'Đã thanh toán';
                console.log(`  Thêm trạng thái thanh toán: ${paymentStatus}`);
                updateData.paymentStatus = paymentStatus;
                
                // Nếu đã thanh toán, thêm thời gian thanh toán
                if (paymentStatus === 'Đã thanh toán' && !order.paidAt) {
                    updateData.paidAt = order.createdAt || new Date();
                }
            }
            
            // Cập nhật đơn hàng nếu có dữ liệu cần cập nhật
            if (Object.keys(updateData).length > 0) {
                console.log('  Cập nhật dữ liệu:', updateData);
                await Order.updateOne({ _id: order._id }, { $set: updateData });
                console.log('  Đã cập nhật thành công!');
            } else {
                console.log('  Không cần cập nhật');
            }
        }
        
        console.log('\nHoàn thành việc sửa các đơn hàng có vấn đề!');
    } catch (err) {
        console.error('Lỗi:', err);
    } finally {
        mongoose.connection.close();
        console.log('\nĐã đóng kết nối MongoDB');
    }
}).catch(err => {
    console.log('Lỗi kết nối:', err);
}); 