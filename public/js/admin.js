$(document).ready(function () {
    // Toggle Sidebar
    $('#sidebarCollapse').on('click', function () {
        $('#sidebar').toggleClass('active');
    });

    // Auto-hide alerts after 5 seconds
    setTimeout(function () {
        $('.alert').alert('close');
    }, 5000);

    // Initialize DataTable
    const table = $('.datatable').DataTable({
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
        order: [[0, 'asc']],
        responsive: true
    });

    // Handle Delete with SweetAlert2
    $(document).on('click', '.delete-item', function (e) {
        e.preventDefault();
        const deleteUrl = $(this).data('url');
        const itemName = $(this).data('name') || 'mục này';
        const itemType = $(this).data('type') || 'mục';
        const row = $(e.target).closest('tr');

        Swal.fire({
            title: 'Xác nhận thao tác?',
            text: `Bạn có chắc chắn muốn ẩn ${itemName}? ${itemType === 'category' ? 'Nếu danh mục có sản phẩm, nó sẽ bị ẩn.' : ''}`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Xác nhận',
            cancelButtonText: 'Hủy'
        }).then((result) => {
            if (result.isConfirmed) {
                $.ajax({
                    url: deleteUrl,
                    type: 'DELETE',
                    success: function (response) {
                        if (response.success) {
                            // Cập nhật UI
                            const badge = row.find('.status-badge');
                            if (badge.length) {
                                badge.attr('data-active', 'false')
                                    .text('Ẩn');
                            }
                            
                            // Cập nhật toggle nếu có
                            const toggle = row.find('.toggle-status');
                            if (toggle.length) {
                                toggle.prop('checked', false);
                            }

                            Swal.fire({
                                icon: 'success',
                                title: 'Thành công',
                                text: response.message,
                                toast: true,
                                position: 'top-end',
                                showConfirmButton: false,
                                timer: 3000
                            });
                        } else {
                            Swal.fire('Lỗi!', response.message, 'error');
                        }
                    },
                    error: function (xhr) {
                        const message = xhr.responseJSON?.message || 'Đã có lỗi xảy ra';
                        Swal.fire('Lỗi!', message, 'error');
                    }
                });
            }
        });
    });

    // Toggle Status with SweetAlert2
    $(document).on('change', '.toggle-status', function () {
        const url = $(this).data('url');
        const isActive = $(this).prop('checked');
        const badgeId = $(this).data('id');
        const badge = $(`#${badgeId}`);
        const originalState = !isActive;
        const itemType = $(this).data('type') || 'sản phẩm';

        Swal.fire({
            title: 'Xác nhận thay đổi?',
            text: `Bạn có chắc chắn muốn ${isActive ? 'hiển thị' : 'ẩn'} ${itemType} này?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#198754',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Xác nhận',
            cancelButtonText: 'Hủy'
        }).then((result) => {
            if (result.isConfirmed) {
                $.ajax({
                    url: url,
                    type: 'PUT',
                    data: { isActive: isActive },
                    success: function (response) {
                        if (response.success) {
                            // Cập nhật badge
                            badge.removeClass('bg-success bg-danger')
                                .addClass(isActive ? 'bg-success' : 'bg-danger')
                                .text(isActive ? 'Đang bán' : 'Đã ẩn');

                            Swal.fire({
                                icon: 'success',
                                title: 'Thành công',
                                text: response.message,
                                toast: true,
                                position: 'top-end',
                                showConfirmButton: false,
                                timer: 3000
                            });
                        } else {
                            // Reset về trạng thái cũ nếu có lỗi
                            $(this).prop('checked', originalState);
                            badge.removeClass('bg-success bg-danger')
                                .addClass(originalState ? 'bg-success' : 'bg-danger')
                                .text(originalState ? 'Đang bán' : 'Đã ẩn');

                            Swal.fire('Lỗi!', response.message, 'error');
                        }
                    },
                    error: function (xhr) {
                        // Reset về trạng thái cũ nếu có lỗi
                        $(this).prop('checked', originalState);
                        badge.removeClass('bg-success bg-danger')
                            .addClass(originalState ? 'bg-success' : 'bg-danger')
                            .text(originalState ? 'Đang bán' : 'Đã ẩn');

                        const message = xhr.responseJSON?.message || 'Đã có lỗi xảy ra';
                        Swal.fire('Lỗi!', message, 'error');
                    }
                });
            } else {
                // Reset về trạng thái cũ nếu người dùng hủy
                $(this).prop('checked', originalState);
                badge.removeClass('bg-success bg-danger')
                    .addClass(originalState ? 'bg-success' : 'bg-danger')
                    .text(originalState ? 'Đang bán' : 'Đã ẩn');
            }
        });
    });

    // Image Preview
    $('.image-input').on('change', function () {
        const file = this.files[0];
        const preview = $(this).data('preview');
        if (file && preview) {
            const reader = new FileReader();
            reader.onload = function (e) {
                $(preview).attr('src', e.target.result).show();
            }
            reader.readAsDataURL(file);
        }
    });

    // Price Format
    $('.price-input').on('input', function () {
        let value = $(this).val().replace(/\D/g, '');
        value = new Intl.NumberFormat('vi-VN').format(value);
        $(this).val(value);
    });

    // Form Validation
    $('form').on('submit', function (e) {
        const requiredFields = $(this).find('[required]');
        let isValid = true;

        requiredFields.each(function () {
            if (!$(this).val()) {
                isValid = false;
                $(this).addClass('is-invalid');
            } else {
                $(this).removeClass('is-invalid');
            }
        });

        if (!isValid) {
            e.preventDefault();
            Swal.fire({
                icon: 'error',
                title: 'Lỗi!',
                text: 'Vui lòng điền đầy đủ thông tin bắt buộc',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000
            });
        }
    });

    // Reset Form
    $('.btn-reset').on('click', function () {
        const form = $(this).closest('form');
        form[0].reset();
        form.find('.is-invalid').removeClass('is-invalid');
        form.find('img[id^="imagePreview"]').attr('src', '').hide();
    });
}); 