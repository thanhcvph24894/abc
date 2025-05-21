const Order = require('../models/Order');
const moment = require('moment');
moment.locale('vi'); // Đặt locale thành tiếng Việt

class ReportController {
    async index(req, res) {
        try {
            if (!req.session.user || req.session.user.role !== 'admin') {
                req.flash('error', 'Bạn không có quyền truy cập trang này');
                return res.redirect('/dashboard');
            }

            // Lấy năm hiện tại cho biểu đồ doanh thu theo năm
            const year = new Date().getFullYear();
            
            // Xác định khoảng thời gian báo cáo từ ngày đến ngày
            let startDate = req.query.startDate ? new Date(req.query.startDate) : null;
            let endDate = req.query.endDate ? new Date(req.query.endDate + 'T23:59:59') : null;
            
            // Mặc định là tháng hiện tại nếu không có ngày được chọn
            if (!startDate || !endDate) {
                startDate = moment().startOf('month').toDate();
                endDate = moment().endOf('month').toDate();
            }

            console.log(`Lọc theo ngày: ${startDate} đến ${endDate}`);
            
            // Tính ngày đầu năm và cuối năm cho biểu đồ năm
            const startOfYear = moment(`${year}-01-01`).startOf('year').toDate();
            const endOfYear = moment(`${year}-12-31`).endOf('year').toDate();

            // Kiểm tra số lượng đơn hàng đã hoàn thành trong năm
            const completedOrdersInYear = await Order.countDocuments({
                orderStatus: 'Đã giao hàng',
                paymentStatus: 'Đã thanh toán',
                createdAt: {
                    $gte: startOfYear,
                    $lte: endOfYear
                }
            });
            console.log(`Số đơn hàng đã hoàn thành trong năm ${year}: ${completedOrdersInYear}`);

            // Lấy dữ liệu doanh thu theo tháng trong năm
            const monthlyRevenue = await Order.aggregate([
                {
                    $match: {
                        orderStatus: 'Đã giao hàng',
                        paymentStatus: 'Đã thanh toán',
                        createdAt: {
                            $gte: startOfYear,
                            $lte: endOfYear
                        }
                    }
                },
                {
                    $group: {
                        _id: { $month: '$createdAt' },
                        total: { $sum: '$totalAmount' }
                    }
                },
                {
                    $sort: { _id: 1 }
                }
            ]);
            
            console.log(`Kết quả doanh thu theo tháng:`, JSON.stringify(monthlyRevenue));

            // Kiểm tra số lượng đơn hàng trong khoảng thời gian đã chọn
            const completedOrdersInPeriod = await Order.countDocuments({
                orderStatus: 'Đã giao hàng',
                paymentStatus: 'Đã thanh toán',
                createdAt: {
                    $gte: startDate,
                    $lte: endDate
                }
            });
            console.log(`Số đơn hàng đã hoàn thành trong khoảng thời gian: ${completedOrdersInPeriod}`);

            // Lấy dữ liệu chi tiết của khoảng thời gian được chọn
            const periodDetails = await Order.aggregate([
                {
                    $match: {
                        createdAt: {
                            $gte: startDate,
                            $lte: endDate
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalRevenue: {
                            $sum: {
                                $cond: [
                                    { $and: [
                                        { $eq: ['$orderStatus', 'Đã giao hàng'] },
                                        { $eq: ['$paymentStatus', 'Đã thanh toán'] }
                                    ]},
                                    '$totalAmount',
                                    0
                                ]
                            }
                        },
                        orderCount: { $sum: 1 },
                        completedOrders: {
                            $sum: {
                                $cond: [
                                    { $and: [
                                        { $eq: ['$orderStatus', 'Đã giao hàng'] },
                                        { $eq: ['$paymentStatus', 'Đã thanh toán'] }
                                    ]},
                                    1,
                                    0
                                ]
                            }
                        },
                        totalOrders: { $sum: 1 },
                        totalAmount: { $sum: '$totalAmount' }
                    }
                },
                {
                    $project: {
                        totalRevenue: 1,
                        orderCount: 1,
                        completedOrders: 1,
                        totalOrders: 1,
                        avgOrderValue: { $divide: ['$totalAmount', '$orderCount'] }
                    }
                }
            ]).then(result => {
                console.log(`Chi tiết doanh thu khoảng thời gian:`, JSON.stringify(result));
                return result[0] || {
                    totalRevenue: 0,
                    orderCount: 0,
                    completedOrders: 0,
                    totalOrders: 0,
                    avgOrderValue: 0
                };
            });

            // Thống kê theo phương thức thanh toán
            const paymentMethodStats = await Order.aggregate([
                {
                    $match: {
                        orderStatus: 'Đã giao hàng',
                        paymentStatus: 'Đã thanh toán',
                        createdAt: {
                            $gte: startDate,
                            $lte: endDate
                        }
                    }
                },
                {
                    $group: {
                        _id: '$paymentMethod',
                        count: { $sum: 1 },
                        total: { $sum: '$totalAmount' }
                    }
                }
            ]);
            
            console.log(`Thống kê theo phương thức thanh toán:`, JSON.stringify(paymentMethodStats));

            // Format dữ liệu cho biểu đồ
            const chartData = Array(12).fill(0);
            monthlyRevenue.forEach(item => {
                chartData[item._id - 1] = item.total;
            });
            
            console.log(`Dữ liệu biểu đồ:`, JSON.stringify(chartData));

            // Thống kê top 10 sản phẩm bán chạy
            const topSellingProducts = await Order.aggregate([
                {
                    $match: {
                        orderStatus: 'Đã giao hàng',
                        paymentStatus: 'Đã thanh toán',
                        createdAt: {
                            $gte: startDate,
                            $lte: endDate
                        }
                    }
                },
                { $unwind: '$items' },
                {
                    $group: {
                        _id: '$items.product',
                        totalQuantity: { $sum: '$items.quantity' },
                        totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
                    }
                },
                {
                    $lookup: {
                        from: 'products',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                { $unwind: '$product' },
                {
                    $project: {
                        name: '$product.name',
                        totalQuantity: 1,
                        totalRevenue: 1,
                        averagePrice: { $divide: ['$totalRevenue', '$totalQuantity'] }
                    }
                },
                { $sort: { totalQuantity: -1 } },
                { $limit: 10 }
            ]);

            // Thống kê top 10 sản phẩm bán kém
            const worstSellingProducts = await Order.aggregate([
                {
                    $match: {
                        orderStatus: 'Đã giao hàng',
                        paymentStatus: 'Đã thanh toán',
                        createdAt: {
                            $gte: startDate,
                            $lte: endDate
                        }
                    }
                },
                { $unwind: '$items' },
                {
                    $group: {
                        _id: '$items.product',
                        totalQuantity: { $sum: '$items.quantity' },
                        totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
                    }
                },
                {
                    $lookup: {
                        from: 'products',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                { $unwind: '$product' },
                {
                    $project: {
                        name: '$product.name',
                        totalQuantity: 1,
                        totalRevenue: 1,
                        averagePrice: { $divide: ['$totalRevenue', '$totalQuantity'] }
                    }
                },
                { $sort: { totalQuantity: 1 } },
                { $limit: 10 }
            ]);

            // Định dạng tiêu đề báo cáo
            const formatStartDate = moment(startDate).format('DD/MM/YYYY');
            const formatEndDate = moment(endDate).format('DD/MM/YYYY');
            const reportTitle = `Báo cáo doanh thu ${formatStartDate} - ${formatEndDate}`;

            res.render('pages/reports/index', {
                title: 'Báo cáo doanh thu',
                reportTitle: reportTitle,
                year,
                startDate: moment(startDate).format('YYYY-MM-DD'),
                endDate: moment(endDate).format('YYYY-MM-DD'),
                chartData,
                monthlyDetails: periodDetails, 
                paymentMethodStats,
                topSellingProducts,
                worstSellingProducts,
                moment,
                messages: req.flash()
            });
        } catch (error) {
            console.error('Lỗi báo cáo:', error);
            req.flash('error', 'Có lỗi xảy ra khi tải báo cáo');
            res.redirect('/dashboard');
        }
    }
}

module.exports = new ReportController();