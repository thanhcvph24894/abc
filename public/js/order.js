$(document).ready(function() {
    // Khởi tạo DataTable
    $('#ordersTable').DataTable({
        language: {
            "emptyTable": "Không có dữ liệu",
            "info": "Hiển thị _START_ đến _END_ của _TOTAL_ mục",
            "infoEmpty": "Hiển thị 0 đến 0 của 0 mục",
            "infoFiltered": "(được lọc từ _MAX_ mục)",
            "lengthMenu": "Hiển thị _MENU_ mục",
            "loadingRecords": "Đang tải...",
            "processing": "Đang xử lý...",
            "search": "Tìm kiếm:",
            "zeroRecords": "Không tìm thấy kết quả phù hợp",
            "paginate": {
                "first": "Đầu",
                "last": "Cuối",
                "next": "Tiếp",
                "previous": "Trước"
            }
        },
        pageLength: 10,
        lengthMenu: [[5, 10, 25, 50, -1], [5, 10, 25, 50, "Tất cả"]],
        order: [[6, 'desc']], // Sắp xếp theo ngày tạo mới nhất
        responsive: true
    });

    // Xử lý cập nhật trạng thái đơn hàng
    $('.order-status').change(function() {
        const $select = $(this);
        const orderId = $select.data('id');
        const orderStatus = $select.val();
        const originalStatus = $select.find('option:selected').text();
        const originalValue = $select.data('original-value');

        Swal.fire({
            title: 'Xác nhận thay đổi?',
            text: `Bạn có chắc chắn muốn chuyển trạng thái đơn hàng sang "${originalStatus}"?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#198754',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Xác nhận',
            cancelButtonText: 'Hủy'
        }).then((result) => {
            if (result.isConfirmed) {
                $.ajax({
                    url: `/orders/status/${orderId}`,
                    method: 'PATCH',
                    data: { orderStatus },
                    success: function(response) {
                        if (response.success) {
                            Swal.fire({
                                icon: 'success',
                                title: 'Thành công',
                                text: response.message,
                                toast: true,
                                position: 'top-end',
                                showConfirmButton: false,
                                timer: 3000
                            });

                            // Nếu trạng thái thanh toán thay đổi, cập nhật select
                            if (response.paymentStatus) {
                                $(`.payment-status[data-id="${orderId}"]`).val(response.paymentStatus);
                            }

                            // Lưu giá trị mới
                            $select.data('original-value', orderStatus);
                        } else {
                            // Reset về trạng thái cũ
                            $select.val(originalValue);
                            Swal.fire('Lỗi!', response.message, 'error');
                        }
                    },
                    error: function(xhr) {
                        // Reset về trạng thái cũ
                        $select.val(originalValue);
                        Swal.fire('Lỗi!', xhr.responseJSON?.message || 'Có lỗi xảy ra khi cập nhật trạng thái', 'error');
                    }
                });
            } else {
                // Reset về trạng thái cũ nếu người dùng hủy
                $select.val(originalValue);
            }
        });

        // Lưu trạng thái hiện tại để có thể reset nếu cần
        $select.data('original-value', orderStatus);
    });

    // Xử lý cập nhật trạng thái thanh toán
    $('.payment-status').change(function() {
        const $select = $(this);
        const orderId = $select.data('id');
        const paymentStatus = $select.val();
        const originalStatus = $select.find('option:selected').text();
        const originalValue = $select.data('original-value');

        Swal.fire({
            title: 'Xác nhận thay đổi?',
            text: `Bạn có chắc chắn muốn chuyển trạng thái thanh toán sang "${originalStatus}"?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#198754',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Xác nhận',
            cancelButtonText: 'Hủy'
        }).then((result) => {
            if (result.isConfirmed) {
                $.ajax({
                    url: `/orders/payment-status/${orderId}`,
                    method: 'PATCH',
                    data: { paymentStatus },
                    success: function(response) {
                        if (response.success) {
                            Swal.fire({
                                icon: 'success',
                                title: 'Thành công',
                                text: response.message,
                                toast: true,
                                position: 'top-end',
                                showConfirmButton: false,
                                timer: 3000
                            });
                            // Lưu giá trị mới
                            $select.data('original-value', paymentStatus);
                        } else {
                            // Reset về trạng thái cũ
                            $select.val(originalValue);
                            Swal.fire('Lỗi!', response.message, 'error');
                        }
                    },
                    error: function(xhr) {
                        // Reset về trạng thái cũ
                        $select.val(originalValue);
                        Swal.fire('Lỗi!', xhr.responseJSON?.message || 'Có lỗi xảy ra khi cập nhật trạng thái thanh toán', 'error');
                    }
                });
            } else {
                // Reset về trạng thái cũ nếu người dùng hủy
                $select.val(originalValue);
            }
        });

        // Lưu trạng thái hiện tại để có thể reset nếu cần
        $select.data('original-value', paymentStatus);
    });

    // Lưu trạng thái ban đầu cho tất cả các select
    $('.order-status, .payment-status').each(function() {
        $(this).data('original-value', $(this).val());
    });
}); 