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
      
      // Xử lý tham số từ query để lọc theo tháng và năm
      const currentMonth = moment().month() + 1; // moment tháng bắt đầu từ 0
      const currentYear = moment().year();
      
      const month = parseInt(req.query.month) || currentMonth;
      const year = parseInt(req.query.year) || currentYear;
      
      // Lọc theo danh mục nếu có
      const categoryFilter = req.query.category || null;
      
      // Số lượng sản phẩm hiển thị
      const limit = parseInt(req.query.limit) || 5;
      
      // Sắp xếp theo
      const sortBy = req.query.sortBy || 'quantity'; // quantity hoặc revenue
      
      // Lấy thời gian đầu và cuối tháng được chọn
      const startOfMonth = moment().year(year).month(month - 1).startOf("month").toDate();
      const endOfMonth = moment().year(year).month(month - 1).endOf("month").toDate();
      
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
      
      // Tính tổng doanh thu từ đơn hàng đã hoàn thành trong tháng được chọn
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
      
      // Lấy danh sách danh mục để phục vụ cho bộ lọc 
      const categories = await Category.find({ isActive: true })
        .sort({ name: 1 })
        .select('_id name');
      
      // Xây dựng pipeline cho top sản phẩm
      const matchPipeline = {
        orderStatus: "Đã giao hàng",
        paymentStatus: "Đã thanh toán",
        createdAt: {
          $gte: startOfMonth,
          $lte: endOfMonth,
        }
      };

      // Bắt đầu pipeline cho top sản phẩm
      let topProductsPipeline = [
        { $match: matchPipeline },
        { $unwind: "$items" },
        {
          $lookup: {
            from: "products",
            localField: "items.product",
            foreignField: "_id",
            as: "productInfo",
          },
        },
        { $unwind: { path: "$productInfo", preserveNullAndEmptyArrays: true } }
      ];

      // Thêm điều kiện lọc theo danh mục nếu có
      if (categoryFilter) {
        // Chuyển đổi ID danh mục thành ObjectId
        const mongoose = require('mongoose');
        const categoryId = mongoose.Types.ObjectId(categoryFilter);
        
        topProductsPipeline.push({
          $match: { "productInfo.category": categoryId }
        });
      }

      // Tiếp tục pipeline - nhóm sản phẩm và tính tổng
      topProductsPipeline.push(
        {
          $group: {
            _id: "$items.product",
            name: { $first: { $ifNull: ["$productInfo.name", "Sản phẩm không xác định"] } },
            image: { $first: { $ifNull: [{ $arrayElemAt: ["$productInfo.images", 0] }, null] } },
            totalQuantity: { $sum: "$items.quantity" },
            totalRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
            category: { $first: "$productInfo.category" }
          }
        }
      );

      // Sắp xếp theo tiêu chí đã chọn
      if (sortBy === 'revenue') {
        topProductsPipeline.push({ $sort: { totalRevenue: -1 } });
      } else {
        topProductsPipeline.push({ $sort: { totalQuantity: -1 } });
      }

      // Giới hạn số lượng kết quả
      topProductsPipeline.push({ $limit: limit });

      // Thực hiện truy vấn
      const topProducts = await Order.aggregate(topProductsPipeline);
      
      // Lấy thông tin chi tiết danh mục cho các sản phẩm top
      if (topProducts.length > 0) {
        // Lọc ra các ID danh mục không null
        const categoryIds = topProducts
          .map(p => p.category)
          .filter(id => id != null);
        
        // Truy vấn chỉ khi có danh mục
        if (categoryIds.length > 0) {
          const productCategories = await Category.find({
            _id: { $in: categoryIds }
          }).select('_id name');
          
          const categoriesMap = {};
          productCategories.forEach(cat => {
            categoriesMap[cat._id.toString()] = cat.name;
          });
          
          // Thêm tên danh mục vào dữ liệu sản phẩm
          topProducts.forEach(product => {
            if (product.category) {
              product.categoryName = categoriesMap[product.category.toString()] || "Không có danh mục";
            } else {
              product.categoryName = "Không có danh mục";
            }
          });
        } else {
          // Nếu không có danh mục nào, gán mặc định
          topProducts.forEach(product => {
            product.categoryName = "Không có danh mục";
          });
        }
      }
      
      res.render("pages/dashboard", {
        title: "Bảng điều khiển",
        stats,
        recentOrders,
        topProducts,
        moment,
        messages: req.flash(),
        // Thêm dữ liệu cho bộ lọc
        filterData: {
          categories,
          selectedMonth: month,
          selectedYear: year,
          selectedCategory: categoryFilter,
          selectedLimit: limit,
          selectedSortBy: sortBy,
          monthName: moment().month(month - 1).format('MMMM')
        }
      });
    } catch (error) {
      console.error("Lỗi dashboard:", error);
      req.flash("error", "Có lỗi xảy ra khi tải trang tổng quan: " + error.message);
      res.redirect("/");
    }
  }
}

module.exports = new DashboardController();