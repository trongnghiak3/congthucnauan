  function toggleReviews(userId) {
    const rows = document.querySelectorAll(`.review-row[data-group='${userId}']`);
    rows.forEach(row => row.classList.toggle('hidden'));
  }
   function confirmDeleteReview(id) {
    if (confirm('Bạn có chắc muốn xóa đánh giá này không?')) {
      fetch(`/admin/danh-gia/${id}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json'
        }
      })
      .then(async response => {
        let result;
        try {
          result = await response.json();
        } catch (err) {
          const text = await response.text();
          console.error('Phản hồi không phải JSON:', text);
          throw new Error(text || 'Phản hồi server không hợp lệ');
        }

        if (response.ok) {
          showAdminNotification('✅ Xóa đánh giá thành công!');
          loadPage('/admin/danh-gia?page=1', document.querySelector('#content'));
        } else {
          showError(result.message || '❌ Lỗi khi xóa đánh giá');
        }
      })
      .catch(error => {
        console.error('Lỗi khi xóa đánh giá:', error);
        showError('Lỗi server: ' + error.message);
      });
    }
  }
  function binddanhgiaEventListeners() {
  console.log('Gọi  cho /admin/danh-gia tại', new Date().toISOString());
  // Hiện tại không có form hoặc hành động cần gắn sự kiện
  // Có thể thêm logic sau nếu cần (ví dụ: lọc, tìm kiếm)
}