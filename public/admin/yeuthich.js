  function toggleFavorites(userId) {
    document.querySelectorAll(`[data-group="${userId}"]`).forEach(row => {
      row.classList.toggle("hidden");
    });
  }
// Hàm khởi tạo sự kiện cho trang yêu thích
function bindFavoriteEventListeners() {
  console.log('Gọi bindFavoriteEventListeners cho /admin/yeu-thich tại', new Date().toISOString());
  // Hiện tại không có form hoặc hành động cần gắn sự kiện
  // Có thể thêm logic sau nếu cần (ví dụ: lọc, tìm kiếm)
}
