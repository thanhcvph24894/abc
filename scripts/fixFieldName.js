/**
 * Script để cập nhật tên trường status thành orderStatus trong collection orders
 */
const mongoose = require('mongoose');

// Kết nối MongoDB
mongoose.connect('mongodb://localhost:27017/shopquanao', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('MongoDB Connected');
  
  try {
    console.log('Đang tìm kiếm đơn hàng cần cập nhật...');
    
    // Tìm các đơn hàng có trường status nhưng không có trường orderStatus
    const orders = await mongoose.connection.db.collection('orders').find({ 
      status: { $exists: true },
      orderStatus: { $exists: false }
    }).toArray();
    
    if (orders.length === 0) {
      console.log('Không tìm thấy đơn hàng nào cần cập nhật.');
      return;
    }
    
    console.log(`Tìm thấy ${orders.length} đơn hàng cần cập nhật.`);
    
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      console.log(`Đang cập nhật đơn hàng #${i+1}/${orders.length}: ${order._id}`);
      
      // Cập nhật trường orderStatus và xóa trường status cũ
      const update = {
        $set: { orderStatus: order.status },
        $unset: { status: "" }
      };
      
      await mongoose.connection.db.collection('orders').updateOne({ _id: order._id }, update);
      console.log(`Hoàn thành cập nhật đơn hàng: ${order._id}`);
    }
    
    console.log('Đã hoàn thành việc cập nhật tất cả đơn hàng.');
  } catch (error) {
    console.error(`Lỗi: ${error.message}`);
  } finally {
    mongoose.connection.close();
    console.log('Đã đóng kết nối MongoDB.');
  }
}).catch(err => {
  console.error(`Lỗi kết nối MongoDB: ${err.message}`);
  process.exit(1);
}); 