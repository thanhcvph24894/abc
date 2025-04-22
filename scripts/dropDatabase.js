require('dotenv').config();
const mongoose = require('mongoose');

async function dropDatabase() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        await mongoose.connection.db.dropDatabase();
        console.log('Đã xóa database thành công');
        process.exit(0);
    } catch (error) {
        console.error('Lỗi khi xóa database:', error);
        process.exit(1);
    }
}

dropDatabase(); 