const Category = require("../models/Category");
const Product = require("../models/Product");
const Order = require("../models/Order");
const User = require("../models/User");
const moment = require("moment");

class DashboardController {
  async index(req, res) {
    try {
      // Kiểm tra quyền admin
      if (!req.session.user || req.session.user.role !== "admin") {
        req.flash("error", "Bạn không có quyền truy cập trang này");
        return res.redirect("/");
      }
      
      // Lấy thời gian đầu và cuối tháng hiện tại
      const startOfMonth = moment().startOf("month").toDate();
      const endOfMonth = moment().endOf("month").toDate();
      
      // Thống kê cơ bản
      const stats = {
        categoryCount: await Category.countDocuments({ isActive: true }),
        productCount: await Product.countDocuments(),
        activeProductCount: await Product.countDocuments({ isActive: true }),
        orderCount: await Order.countDocuments(),
        userCount: await User.countDocuments(),
        activeUserCount: await User.countDocuments({ isActive: true }),
        newOrdersCount: await Order.countDocuments({
          orderStatus: "Chờ xác nhận",
        }),
        completedOrdersCount: await Order.countDocuments({
          orderStatus: "Đã giao hàng",
          paymentStatus: "Đã thanh toán",
        }),
      };
      
      // Tính tổng doanh thu từ đơn hàng đã hoàn thành trong tháng hiện tại
      const revenueStats = await Order.aggregate([
        {
          $match: {
            orderStatus: "Đã giao hàng",
            paymentStatus: "Đã thanh toán",
            createdAt: {
              $gte: startOfMonth,
              $lte: endOfMonth,
            },
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$totalAmount" },
          },
        },
      ]);
      stats.totalRevenue = revenueStats.length > 0 ? revenueStats[0].totalRevenue : 0;
      
      // Lấy 5 đơn hàng mới nhất với trạng thái chi tiết hơn
      const recentOrders = await Order.find()
        .populate("user", "name email")
        .sort({ createdAt: -1 })
        .limit(5);
      
      // Các trạng thái đơn hàng đã được cập nhật chi tiết hơn trong template
      
      // Top sản phẩm bán chạy trong tháng hiện tại
      const topProducts = await Order.aggregate([
        {
          $match: {
            orderStatus: "Đã giao hàng",
            paymentStatus: "Đã thanh toán",
            createdAt: {
              $gte: startOfMonth,
              $lte: endOfMonth,
            },
          },
        },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.product",
            totalQuantity: { $sum: "$items.quantity" },
            totalRevenue: {
              $sum: { $multiply: ["$items.price", "$items.quantity"] },
            },
          },
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: "products",
            localField: "_id",
            foreignField: "_id",
            as: "productInfo",
          },
        },
        { $unwind: { path: "$productInfo", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            name: { $ifNull: ["$productInfo.name", "Sản phẩm không xác định"] },
            image: {
              $ifNull: [{ $arrayElemAt: ["$productInfo.images", 0] }, null],
            },
            totalQuantity: 1,
            totalRevenue: 1,
          },
        },
      ]);
      
      res.render("pages/dashboard", {
        title: "Bảng điều khiển",
        stats,
        recentOrders,
        topProducts,
        moment,
        messages: req.flash(),
      });
    } catch (error) {
      console.error("Lỗi dashboard:", error);
      req.flash("error", "Có lỗi xảy ra khi tải trang tổng quan");
      res.redirect("/");
    }
  }
}

module.exports = new DashboardController();