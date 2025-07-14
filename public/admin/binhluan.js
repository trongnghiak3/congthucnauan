 function toggleComments(groupId) {
    document.querySelectorAll(`.comment-row[data-group="${groupId}"]`)
      .forEach(row => row.classList.toggle('hidden'));
  }

function confirmDeleteComment(id) {
  if (confirm('Bạn có chắc muốn xóa bình luận này?')) {
    fetch(`/admin/binh-luan/${id}`, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
      },
    })
    .then(async response => {
      let result;
      try {
        result = await response.json();
      } catch (err) {
        const text = await response.text();
        throw new Error(text || 'Lỗi phản hồi server không hợp lệ');
      }

      if (response.ok) {
        showAdminNotification('Xóa bình luận thành công!');
        loadPage('/admin/binh-luan?page=1', document.querySelector('#content'));
      } else {
        // Thông báo lỗi custom từ server (ví dụ: có phản hồi không thể xóa)
        showAdminNotification(result.message || 'Lỗi khi xóa bình luận', 'error');
      }
    })
    .catch(error => {
      console.error('Lỗi khi xóa bình luận:', error);
      showAdminNotification('Lỗi server: ' + error.message, 'error');
    });
  }
}

    function bindbinhluanEventListeners() {
  console.log('Gọi  cho /admin/binh-luan tại', new Date().toISOString());
  // Hiện tại không có form hoặc hành động cần gắn sự kiện
  // Có thể thêm logic sau nếu cần (ví dụ: lọc, tìm kiếm)
}