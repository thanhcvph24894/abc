require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./001_create_users');
const Category = require('./002_create_categories');
const Product = require('./003_create_products');
const Order = require('./004_create_orders');
const Cart = require('./005_create_carts');

const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
};

const runMigrations = async () => {
    try {
        // Kết nối database
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        console.log('Đã kết nối database');

        // Tạo admin mặc định
        const adminUser = await User.findOne({ email: 'admin@gmail.com' });
        if (!adminUser) {
            const hashedPassword = await hashPassword('123456789');
            await User.create({
                name: 'Admin',
                email: 'admin@gmail.com',
                password: hashedPassword,
                role: 'admin'
            });
            console.log('Đã tạo tài khoản admin mặc định');
        }

        // Tạo người dùng mẫu
        const sampleUsers = [
            {
                name: 'Nguyễn Văn A',
                email: 'nguyenvana@example.com',
                password: await hashPassword('123456'),
                role: 'user',
                phone: '0123456789',
                address: {
                    street: '123 Đường ABC',
                    city: 'TP.HCM',
                    district: 'Quận 1',
                    ward: 'Phường Bến Nghé'
                }
            },
            {
                name: 'Trần Thị B',
                email: 'tranthib@example.com',
                password: await hashPassword('123456'),
                role: 'user',
                phone: '0987654321',
                address: {
                    street: '456 Đường XYZ',
                    city: 'TP.HCM',
                    district: 'Quận 3',
                    ward: 'Phường Võ Thị Sáu'
                }
            },
            {
                name: 'Lê Văn C',
                email: 'levanc@example.com',
                password: await hashPassword('123456'),
                role: 'user',
                phone: '0369852147',
                address: {
                    street: '789 Đường DEF',
                    city: 'TP.HCM',
                    district: 'Quận 5',
                    ward: 'Phường 5'
                }
            }
        ];

        for (const user of sampleUsers) {
            const existingUser = await User.findOne({ email: user.email });
            if (!existingUser) {
                await User.create(user);
            }
        }
        console.log('Đã tạo người dùng mẫu');

        // Tạo danh mục mặc định
        const categories = await Category.find();
        if (categories.length === 0) {
            const defaultCategories = [
                {
                    name: 'Thời trang nam',
                    slug: 'thoi-trang-nam',
                    description: 'Tất cả sản phẩm thời trang dành cho nam'
                },
                {
                    name: 'Thời trang nữ',
                    slug: 'thoi-trang-nu',
                    description: 'Tất cả sản phẩm thời trang dành cho nữ'
                },
                {
                    name: 'Phụ kiện',
                    slug: 'phu-kien',
                    description: 'Các phụ kiện thời trang'
                },
                {
                    name: 'Giày dép',
                    slug: 'giay-dep',
                    description: 'Giày dép các loại'
                }
            ];

            for (const category of defaultCategories) {
                await Category.create(category);
            }
            console.log('Đã tạo danh mục mặc định');
        }

        // Tạo sản phẩm mẫu
        const products = await Product.find();
        if (products.length === 0) {
            const categories = await Category.find();
            const sampleProducts = [
                {
                    name: 'Áo thun nam basic',
                    slug: 'ao-thun-nam-basic',
                    description: 'Áo thun nam basic chất liệu cotton 100%',
                    price: 199000,
                    category: categories[0]._id,
                    images: ['/uploads/products/ao-thun-nam-1.jpg'],
                    stock: 100,
                    sold: 0,
                    isActive: true,
                    colors: ['Đen', 'Trắng', 'Xanh nước biển'],
                    sizes: ['S', 'M', 'L', 'XL']
                },
                {
                    name: 'Áo sơ mi nữ',
                    slug: 'ao-so-mi-nu',
                    description: 'Áo sơ mi nữ phong cách công sở',
                    price: 299000,
                    category: categories[1]._id,
                    images: ['/uploads/products/ao-so-mi-nu-1.jpg'],
                    stock: 80,
                    sold: 0,
                    isActive: true,
                    colors: ['Trắng', 'Hồng nhạt', 'Xanh'],
                    sizes: ['S', 'M', 'L']
                },
                {
                    name: 'Dây chuyền bạc',
                    slug: 'day-chuyen-bac',
                    description: 'Dây chuyền bạc 925 thời trang',
                    price: 499000,
                    category: categories[2]._id,
                    images: ['/uploads/products/day-chuyen-1.jpg'],
                    stock: 30,
                    sold: 0,
                    isActive: true,
                    colors: ['Bạc'],
                    sizes: []
                },
                {
                    name: 'Giày thể thao nam',
                    slug: 'giay-the-thao-nam',
                    description: 'Giày thể thao nam đa năng',
                    price: 799000,
                    category: categories[3]._id,
                    images: ['/uploads/products/giay-the-thao-1.jpg'],
                    stock: 50,
                    sold: 0,
                    isActive: true,
                    colors: ['Đen', 'Trắng', 'Xám'],
                    sizes: ['39', '40', '41', '42', '43']
                }
            ];

            for (const product of sampleProducts) {
                await Product.create(product);
            }
            console.log('Đã tạo sản phẩm mẫu');
        }

        // Tạo đơn hàng mẫu
        const existingOrders = await Order.find();
        if (existingOrders.length === 0) {
            const users = await User.find({ role: 'user' });
            const products = await Product.find();
            const orders = [
                {
                    orderNumber: 'DH001',
                    user: users[0]._id,
                    items: [
                        {
                            product: products[0]._id,
                            variant: {
                                size: 'M',
                                color: 'Đen'
                            },
                            quantity: 2,
                            price: products[0].price
                        }
                    ],
                    shippingAddress: {
                        fullName: 'Nguyễn Văn A',
                        phone: '0123456789',
                        address: '123 Đường ABC',
                        city: 'Hà Nội',
                        district: 'Cầu Giấy',
                        ward: 'Dịch Vọng'
                    },
                    paymentMethod: 'COD',
                    paymentStatus: 'Đã thanh toán',
                    orderStatus: 'Đã giao hàng',
                    totalAmount: products[0].price * 2,
                    shippingFee: 30000,
                    discount: 0
                },
                {
                    orderNumber: 'DH002',
                    user: users[1]._id,
                    items: [
                        {
                            product: products[1]._id,
                            variant: {
                                size: '30',
                                color: 'Xanh'
                            },
                            quantity: 1,
                            price: products[1].price
                        }
                    ],
                    shippingAddress: {
                        fullName: 'Trần Thị B',
                        phone: '0987654321',
                        address: '456 Đường XYZ',
                        city: 'Hồ Chí Minh',
                        district: 'Quận 1',
                        ward: 'Phường 1'
                    },
                    paymentMethod: 'VNPAY',
                    paymentStatus: 'Chưa thanh toán',
                    orderStatus: 'Chờ xác nhận',
                    totalAmount: products[1].price,
                    shippingFee: 30000,
                    discount: 0
                }
            ];
            await Order.insertMany(orders);
            console.log('Đã tạo đơn hàng mẫu');
        }

        // Tạo giỏ hàng mẫu
        const carts = await Cart.find();
        if (carts.length === 0) {
            const users = await User.find({ role: 'user' });
            const products = await Product.find();
            const sampleCarts = [
                {
                    user: users[2]._id,
                    items: [
                        {
                            product: products[1]._id,
                            variant: {
                                size: '32',
                                color: 'Xanh'
                            },
                            quantity: 1,
                            price: 499000
                        }
                    ],
                    totalPrice: 499000
                }
            ];

            for (const cart of sampleCarts) {
                await Cart.create(cart);
            }
            console.log('Đã tạo giỏ hàng mẫu');
        }
        console.log('Migration hoàn tất');
        process.exit(0);
    } catch (error) {
        console.error('Lỗi migration:', error);
        process.exit(1);
    }
};

runMigrations(); 