
  // Hàm hiển thị thông báo pop-up
  function showNotification(message, type = 'success') {
    const notification = document.getElementById('admin-notification');
    notification.className = `fixed top-5 right-5 z-50 flex items-start gap-3 px-4 py-3 rounded-xl text-white shadow-xl transform transition-all duration-300 ease-in-out opacity-100 ${
      type === 'success' ? 'bg-green-500' : 'bg-red-500'
    }`;
    notification.innerHTML = `<span>${message}</span><button onclick="this.parentElement.classList.add('hidden')">X</button>`;
    notification.classList.remove('hidden');
    setTimeout(() => {
      notification.classList.add('opacity-0');
      setTimeout(() => notification.classList.add('hidden'), 300);
    }, 3000);
  }

  // Cập nhật số lượng thông báo chưa đọc
  async function updateNotificationCount() {
    try {
      const response = await fetch('/api/notifications/unread-count');
      const data = await response.json();
      const countElement = document.getElementById('notification-count');
      countElement.textContent = data.count > 0 ? data.count : '';
      countElement.classList.toggle('hidden', data.count === 0);
    } catch (error) {
      console.error('Lỗi khi cập nhật số lượng thông báo:', error);
    }
  }

  // Tải 5 thông báo mới
  async function loadNotificationPreview() {
    try {
      const response = await fetch('/api/notifications?limit=5');
      const data = await response.json();
      const notifications = data.notifications || [];
      const preview = document.getElementById('notification-preview');
      preview.innerHTML = '';
      if (notifications.length === 0) {
        preview.innerHTML = '<p class="text-gray-500 text-center">Không có thông báo nào.</p>';
      } else {
        notifications.forEach(notification => {
          const item = document.createElement('div');
          item.className = `notification-item flex items-start gap-2 p-2 rounded hover:bg-gray-100 ${notification.read ? 'opacity-75' : ''}`;
          item.innerHTML = `
            <i class="fas fa-bell text-yellow-500 text-sm mt-1"></i>
            <div class="flex-1">
              <p class="text-gray-800 text-sm">${notification.message}</p>
              <p class="text-gray-500 text-xs">${new Date(notification.date).toLocaleString('vi-VN')}</p>
              <div class="mt-1 flex gap-2">
                <button class="mark-read-btn text-blue-500 text-xs underline" data-id="${notification.id}" data-type="${notification.type}">Đã đọc</button>
                <button class="delete-btn text-red-500 text-xs underline" data-id="${notification.id}" data-type="${notification.type}">Xóa</button>
              </div>
            </div>
          `;
          preview.appendChild(item);
        });
      }
    } catch (error) {
      console.error('Lỗi khi tải thông báo preview:', error);
    }
  }

  // Xử lý toggle dropdown
  document.getElementById('notification-toggle')?.addEventListener('click', () => {
    const dropdown = document.getElementById('notification-dropdown');
    dropdown.classList.toggle('hidden');
    if (!dropdown.classList.contains('hidden')) {
      loadNotificationPreview();
    }
  });

  // Đóng dropdown nếu click ra ngoài
  document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('notification-dropdown');
    const toggle = document.getElementById('notification-toggle');
    if (!dropdown.contains(e.target) && !toggle.contains(e.target)) {
      dropdown.classList.add('hidden');
    }
  });

  // Xử lý sự kiện ĐÁNH DẤU và XÓA bằng event delegation
  document.getElementById('notification-preview')?.addEventListener('click', async (e) => {
    const markBtn = e.target.closest('.mark-read-btn');
    const deleteBtn = e.target.closest('.delete-btn');

    if (markBtn) {
      const id = markBtn.getAttribute('data-id');
      const type = markBtn.getAttribute('data-type');
      try {
        await fetch(`/api/notifications/${type}/${id}/mark-read`, { method: 'POST' });
        showNotification('Đã đánh dấu thông báo đã đọc', 'success');
        markBtn.closest('.notification-item').classList.add('opacity-75');
        updateNotificationCount();
      } catch (error) {
        showNotification('Lỗi khi đánh dấu đã đọc', 'error');
      }
    }

    if (deleteBtn) {
      const id = deleteBtn.getAttribute('data-id');
      const type = deleteBtn.getAttribute('data-type');
      try {
        await fetch(`/api/notifications/${type}/${id}/delete`, { method: 'POST' });
        showNotification('Đã xóa thông báo', 'success');
        const item = deleteBtn.closest('.notification-item');
        item?.remove();
        if (!document.querySelector('.notification-item')) {
          document.getElementById('no-notifications')?.classList.remove('hidden');
        }
        updateNotificationCount();
      } catch (error) {
        showNotification('Lỗi khi xóa thông báo', 'error');
      }
    }
  });

  // Tìm kiếm & lọc
  document.getElementById('search-notifications')?.addEventListener('input', (e) => {
    const url = new URL(window.location);
    url.searchParams.set('search', e.target.value);
    loadPage(url.pathname + url.search, null);
  });

  document.getElementById('filter-notifications')?.addEventListener('change', (e) => {
    const url = new URL(window.location);
    url.searchParams.set('filter', e.target.value);
    loadPage(url.pathname + url.search, null);
  });

  // Khởi tạo
  document.addEventListener('DOMContentLoaded', () => {
    updateNotificationCount();
  });

