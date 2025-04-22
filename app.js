require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const viewMiddleware = require('./middleware/viewMiddleware');

const app = express();

// Kết nối database
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Đã kết nối database'))
.catch(err => console.error('Lỗi kết nối database:', err));

// Xử lý lỗi mongoose
mongoose.connection.on('error', err => {
    console.error('Lỗi database:', err);
});

// Cấu hình EJS và Express Layouts
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');
app.set("layout extractScripts", true);
app.set("layout extractStyles", true);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        collectionName: 'sessions',
        ttl: 24 * 60 * 60 // 1 day
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Flash messages
app.use(flash());

// View middleware - phải đặt trước routes
app.use(viewMiddleware);

// API Routes
app.use('/api/v1/auth', require('./routes/api/auth'));
app.use('/api/v1', require('./routes/api/index'));

// Web Routes
app.use('/', require('./routes/index'));

// 404 handler
app.use((req, res) => {
    res.status(404).render('pages/error', {
        title: 'Không tìm thấy trang',
        message: 'Trang bạn yêu cầu không tồn tại',
        error: {
            status: 404,
            stack: process.env.NODE_ENV === 'development' ? 'Page Not Found' : ''
        }
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Lỗi ứng dụng:', err);

    // Xử lý lỗi multer
    if (err.name === 'MulterError') {
        if (err.code === 'LIMIT_FILE_SIZE') {
            req.flash('error', 'File quá lớn. Kích thước tối đa là 5MB');
        } else {
            req.flash('error', 'Lỗi khi upload file: ' + err.message);
        }
        return res.redirect('back');
    }

    // Xử lý lỗi mongoose
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map(e => e.message);
        req.flash('error', messages.join(', '));
        return res.redirect('back');
    }

    if (err.name === 'CastError') {
        req.flash('error', 'ID không hợp lệ');
        return res.redirect('back');
    }

    // Xử lý lỗi chung
    const statusCode = err.status || 500;
    res.status(statusCode).render('pages/error', {
        title: 'Lỗi hệ thống',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Đã xảy ra lỗi khi xử lý yêu cầu',
        error: {
            status: statusCode,
            stack: process.env.NODE_ENV === 'development' ? err.stack : ''
        }
    });
});

// For Passenger
if (typeof(PhusionPassenger) !== 'undefined') {
    app.listen('passenger');
} else {
    const PORT = process.env.PORT || 5001;
    app.listen(PORT, () => {
        console.log(`Server đang chạy tại http://localhost:${PORT}`);
    });
} 