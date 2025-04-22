const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`kết nối database thành công: ${conn.connection.host}`);
  } catch (error) {
    console.error(`lỗi kết nối database: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB; 