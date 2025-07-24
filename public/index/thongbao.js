document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-thong-bao');
    const filterSelect = document.getElementById('filter-thong-bao');
    const thongBaoList = document.getElementById('thong-bao-list');

    const urlPrefix = typeof window.urlPrefix !== "undefined" ? window.urlPrefix : "";

    const updateUrlAndReload = () => {
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('page', 1);

        if (searchInput && searchInput.value) {
            currentUrl.searchParams.set('search', searchInput.value);
        } else {
            currentUrl.searchParams.delete('search');
        }

        if (filterSelect && filterSelect.value !== 'all') {
            currentUrl.searchParams.set('filter', filterSelect.value);
        } else {
            currentUrl.searchParams.delete('filter');
        }

        window.location.href = currentUrl.toString();
    };

    // --- Bắt đầu phần thay đổi cho biểu tượng chuông ---
    const notificationToggle = document.getElementById('notification-toggle');
    const notificationDropdown = document.getElementById('notification-dropdown');

    if (notificationToggle && notificationDropdown) {
        notificationToggle.addEventListener('click', (event) => {
            event.stopPropagation(); // Ngăn chặn sự kiện click lan truyền ra ngoài (giúp đóng dropdown khi click ra ngoài)
            notificationDropdown.classList.toggle('hidden');

            // Nếu dropdown hiện ra (không có class 'hidden'), tải thông báo mới nhất
            if (!notificationDropdown.classList.contains('hidden')) {
                loadNotificationsPreview();
            }
        });

        // Thêm sự kiện click cho toàn bộ document để đóng dropdown khi click ra ngoài
        document.addEventListener('click', (event) => {
            if (!notificationDropdown.contains(event.target) && !notificationToggle.contains(event.target)) {
                notificationDropdown.classList.add('hidden');
            }
        });
    }
    // --- Kết thúc phần thay đổi cho biểu tượng chuông ---

    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('keyup', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(updateUrlAndReload, 500);
        });
    }

    if (filterSelect) {
        filterSelect.addEventListener('change', updateUrlAndReload);
    }

    if (thongBaoList) {
        thongBaoList.addEventListener('click', async (e) => {
            const button = e.target.closest('button');
            const item = button?.closest('.thong-bao-item');
            if (!item) return;

            const notificationId = item.dataset.id;
            let endpoint = '';

            if (button.classList.contains('mark-read-btn')) {
                endpoint = `${urlPrefix}/api/thong-bao/${notificationId}/mark-read`;
            } else if (button.classList.contains('delete-btn')) {
                endpoint = `${urlPrefix}/api/thong-bao/${notificationId}/delete`;
            } else {
                return;
            }

            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    if (response.status === 401) {
                        alert(errorData.error || 'Vui lòng đăng nhập để tiếp tục.');
                        window.location.href = '/login';
                        return;
                    }
                    throw new Error(errorData.error || 'Đã xảy ra lỗi trên máy chủ.');
                }

                if (button.classList.contains('mark-read-btn')) {
                    item.classList.add('opacity-60');
                    button.remove();
                } else if (button.classList.contains('delete-btn')) {
                    item.remove();
                }

                alert('Thao tác thành công!');
                // Sau khi thao tác, cập nhật lại preview (nếu người dùng đang ở trang khác)
                // hoặc đơn giản là để người dùng refresh nếu họ muốn xem thay đổi ngay lập tức
                // loadNotificationsPreview(); // Bạn có thể thêm dòng này nếu muốn preview cập nhật ngay
            } catch (error) {
                console.error('Lỗi khi gửi yêu cầu:', error);
                alert(`Lỗi: ${error.message}`);
            }
        });
    }

    // Hàm để cập nhật số thông báo chưa đọc (nếu bạn có API riêng cho nó)
    async function updateUnreadCount() {
        try {
            const res = await fetch(`${urlPrefix}/api/thong-bao/unread-count`); // Giả sử có API này
            const data = await res.json();
            const countSpan = document.getElementById('unread-notification-count');
            if (countSpan) {
                if (data.count > 0) {
                    countSpan.textContent = data.count;
                    countSpan.classList.remove('hidden');
                } else {
                    countSpan.classList.add('hidden');
                }
            }
        } catch (err) {
            console.error('Lỗi khi tải số thông báo chưa đọc:', err);
        }
    }

    // Gọi hàm cập nhật số đếm khi DOM tải xong
    updateUnreadCount();
    // Có thể thiết lập cập nhật định kỳ (ví dụ mỗi 60 giây)
    // setInterval(updateUnreadCount, 60000);
});

// Hàm tải thông báo để hiển thị trong preview dropdown
async function loadNotificationsPreview() {
    try {
        // Lấy 5 thông báo chưa đọc mới nhất
        const res = await fetch(`/api/thong-bao?limit=5&status=unread`); // Thêm status=unread để chỉ lấy thông báo chưa đọc
        const data = await res.json();
        const container = document.getElementById('notification-preview');

        if (!container) {
            console.error('Không tìm thấy phần tử #notification-preview');
            return;
        }

        container.innerHTML = ''; // Xóa nội dung cũ

        if (!data.thong_bao || data.thong_bao.length === 0) {
            container.innerHTML = '<p class="text-sm text-gray-500 text-center p-3">Không có thông báo mới.</p>';
            return;
        }

        data.thong_bao.forEach(tb => {
            const item = document.createElement('div');
            // Thêm class 'bg-blue-50' nếu chưa đọc để dễ nhận biết
            // Thêm data-id để sau này có thể đánh dấu đọc/xóa ngay từ preview
            item.className = `thong-bao-item text-sm text-gray-700 p-2 rounded hover:bg-gray-200 ${tb.DA_DOC ? '' : 'bg-blue-50 font-medium'}`;
            item.dataset.id = tb.ID_CHINH_TB; // Giả sử ID thông báo là ID_CHINH_TB

            // Nội dung thông báo, bạn có thể thêm nút "đánh dấu đã đọc" hoặc các hành động khác nếu muốn
            item.innerHTML = `
                <div>${tb.NOI_DUNG_TB}</div>
                <div class="text-xs text-gray-500">${new Date(tb.NGAY_TAO_TB).toLocaleString('vi-VN')}</div>
                ${!tb.DA_DOC ? `<button class="mark-read-btn text-xs text-blue-500 hover:text-blue-700 mt-1">Đánh dấu đã đọc</button>` : ''}
            `;
            container.appendChild(item);
        });

        // Nếu bạn muốn xử lý sự kiện click cho các nút trong preview (ví dụ: đánh dấu đã đọc)
        container.querySelectorAll('.mark-read-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                e.stopPropagation(); // Ngăn chặn sự kiện click lan truyền đến item cha
                const item = e.target.closest('.thong-bao-item');
                if (!item) return;

                const notificationId = item.dataset.id;
                const endpoint = `/api/thong-bao/${notificationId}/mark-read`;

                try {
                    const response = await fetch(endpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                    });

                    if (response.ok) {
                        item.classList.add('opacity-60', 'font-normal'); // Làm mờ và bỏ đậm
                        e.target.remove(); // Xóa nút đánh dấu đã đọc
                        updateUnreadCount(); // Cập nhật lại số đếm
                    } else {
                        const errorData = await response.json();
                        alert(`Lỗi: ${errorData.error || 'Không thể đánh dấu đã đọc.'}`);
                    }
                } catch (error) {
                    console.error('Lỗi khi đánh dấu đã đọc từ preview:', error);
                    alert('Lỗi kết nối khi đánh dấu đã đọc.');
                }
            });
        });

    } catch (err) {
        console.error('Lỗi khi tải preview thông báo:', err);
        const container = document.getElementById('notification-preview');
        if (container) {
             container.innerHTML = '<p class="text-sm text-red-500 text-center p-3">Không thể tải thông báo.</p>';
        }
    }
}