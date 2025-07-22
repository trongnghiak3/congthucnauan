document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-thong-bao');
    const filterSelect = document.getElementById('filter-thong-bao');
    const thongBaoList = document.getElementById('thong-bao-list');

    // Lấy tiền tố URL từ một thuộc tính dữ liệu hoặc biến toàn cục
    // Quan trọng: Hãy đảm bảo biến `urlPrefix` được truyền từ server vào EJS
    // Ví dụ: res.render("user/thong_bao", { ..., urlPrefix: req.baseUrl });
    const urlPrefix = "<%= urlPrefix %>"; // Đảm bảo biến này được truyền từ server

    // Hàm để cập nhật URL và tải lại trang
    const updateUrlAndReload = () => {
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('page', 1); // Reset về trang 1 khi thay đổi tìm kiếm/lọc
        if (searchInput.value) {
            currentUrl.searchParams.set('search', searchInput.value);
        } else {
            currentUrl.searchParams.delete('search');
        }
        if (filterSelect.value !== 'all') {
            currentUrl.searchParams.set('filter', filterSelect.value);
        } else {
            currentUrl.searchParams.delete('filter');
        }
        window.location.href = currentUrl.toString();
    };

    // Sự kiện tìm kiếm
    let searchTimeout;
    searchInput.addEventListener('keyup', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            updateUrlAndReload();
        }, 500); // Đợi 500ms sau khi gõ xong
    });

    // Sự kiện lọc
    filterSelect.addEventListener('change', updateUrlAndReload);

    // Xử lý nút Đã đọc và Xóa
   thongBaoList.addEventListener('click', async (e) => {
    const button = e.target;
    const item = button.closest('.thong-bao-item');
    if (!item) return;

    const notificationId = item.dataset.id;
    let endpoint = '';

    if (button.classList.contains('mark-read-btn')) {
        endpoint = `/api/thong-bao/admin/${notificationId}/mark-read`;
    } else if (button.classList.contains('delete-btn')) {
        endpoint = `/api/thong-bao/admin/${notificationId}/delete`;
    } else {
        return;
    }

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server trả về lỗi: ${errorText}`);
        }

        const data = await response.json();
        alert("Thành công!");

        if (button.classList.contains('mark-read-btn')) {
            item.classList.add('opacity-60');
            button.remove();
        } else if (button.classList.contains('delete-btn')) {
            item.remove();
        }
    } catch (error) {
        console.error('Lỗi khi gửi yêu cầu:', error);
        alert('Lỗi khi xử lý yêu cầu.');
    }
});

});