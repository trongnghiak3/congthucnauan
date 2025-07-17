
console.log('✅ js của thông báo đã chạy');

// Hiển thị thông báo popup
function showNotification(message, type = 'success') {
  const notification = document.getElementById('admin-thong-bao');
  notification.classList.add('hidden');
  notification.classList.remove('opacity-0');

  notification.className = `fixed top-5 right-5 z-50 flex items-start gap-3 px-4 py-3 rounded-xl text-white shadow-xl transition-all duration-300 ease-in-out ${
    type === 'success' ? 'bg-green-500' : 'bg-red-500'
  }`;
  notification.innerHTML = `
    <span>${message}</span>
    <button class="font-bold notification-close-btn">X</button>
  `;
  notification.classList.remove('hidden');

  const closeBtn = notification.querySelector('.notification-close-btn');
  if (closeBtn) {
    closeBtn.onclick = () => {
      notification.classList.add('opacity-0');
      setTimeout(() => notification.classList.add('hidden'), 300);
    };
  }

  setTimeout(() => {
    notification.classList.add('opacity-0');
    setTimeout(() => notification.classList.add('hidden'), 300);
  }, 3000);
}

// Đánh dấu đã đọc
async function markReadNotification(id, type) {
  try {
    const response = await fetch(`/api/thong-bao/${type}/${id}/mark-read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const result = await response.json();
    if (result.success) {
      showNotification('Đã đánh dấu thông báo là đã đọc!');
      
      const notificationItem = document.querySelector(`.thong-bao-item[data-id="${id}"][data-type="${type}"]`);
      if (notificationItem) {
        // Kiểm tra nếu đang ở filter=unread thì gỡ phần tử khỏi giao diện
        const urlParams = new URLSearchParams(window.location.search);
        const isUnreadPage = urlParams.get('filter') === 'unread';

        if (isUnreadPage) {
          notificationItem.remove();
        } else {
          notificationItem.classList.add('opacity-75');
          const markReadBtn = notificationItem.querySelector('.mark-read-btn');
          if (markReadBtn) markReadBtn.remove();
        }
      }

      loadNotificationCount(); // Cập nhật lại số lượng ở biểu tượng chuông
    } else {
      showNotification(result.message || 'Không thể đánh dấu.', 'error');
    }
  } catch (error) {
    console.error('Lỗi khi đánh dấu đã đọc:', error);
    showNotification('Đã xảy ra lỗi khi đánh dấu.', 'error');
  }
}


// Xóa thông báo
async function deleteNotification(id, type) {
  try {
    const confirmed = confirm('Bạn có chắc muốn xóa thông báo này?');
    if (!confirmed) return;
    const response = await fetch(`/api/thong-bao/${type}/${id}/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const result = await response.json();
    if (result.success) {
      showNotification('Thông báo đã được xóa!');
      const notificationItem = document.querySelector(`.thong-bao-item[data-id="${id}"][data-type="${type}"]`);
      if (notificationItem) {
        notificationItem.remove();
      }
      loadNotificationCount(); // Cập nhật lại biểu tượng
    } else {
      showNotification(result.message || 'Không thể xóa.', 'error');
    }
  } catch (error) {
    console.error('Lỗi khi xóa thông báo:', error);
    showNotification('Đã xảy ra lỗi khi xóa.', 'error');
  }
}

// Đếm số thông báo chưa đọc
async function loadNotificationCount() {
  try {
    const res = await fetch('/api/thong-bao/dem-chua-doc');
    const data = await res.json();
    const count = data.count;
    const badge = document.getElementById('notification-count');
    if (count > 0) {
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  } catch (err) {
    console.error('Không thể tải số lượng thông báo:', err);
  }
}

// Xử lý toggle dropdown + load preview
function setupNotificationDropdown() {
  const toggle = document.getElementById('notification-toggle');
  const dropdown = document.getElementById('notification-dropdown');
  const preview = document.getElementById('notification-preview');

  if (!toggle || !dropdown) return;

  toggle.addEventListener('click', async () => {
    dropdown.classList.toggle('hidden');

    if (!dropdown.classList.contains('hidden')) {
      try {
        const res = await fetch('/api/thong-bao?limit=5');
        const data = await res.json();
        const list = data.thong_bao || [];

        preview.innerHTML = '';
        if (list.length === 0) {
          preview.innerHTML = '<p class="text-gray-500 text-sm text-center">Không có thông báo.</p>';
        } else {
          list.forEach(tb => {
            const item = document.createElement('div');
            item.className = `rounded p-2 text-sm text-gray-800 ${tb.DA_DOC ? 'opacity-70' : 'bg-yellow-100'}`;
            item.innerHTML = `
              <p>${tb.NOI_DUNG_TB}</p>
              <p class="text-gray-500 text-xs">${new Date(tb.NGAY_TAO_TB).toLocaleString('vi-VN')}</p>
            `;
            preview.appendChild(item);
          });
        }
      } catch (err) {
        console.error('Lỗi khi lấy preview thông báo:', err);
      }
    }
  });
}

// Debounce
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Gắn các sự kiện chính
function bindThongBaoEventListeners() {
  console.log('[bindThongBaoEventListeners] Gắn sự kiện thông báo');

  const thongBaoList = document.getElementById('thong-bao-list');
  if (!thongBaoList) return;

  thongBaoList.querySelectorAll('.mark-read-btn').forEach(btn => {
    btn.replaceWith(btn.cloneNode(true));
  });

  thongBaoList.querySelectorAll('.delete-btn').forEach(btn => {
    btn.replaceWith(btn.cloneNode(true));
  });

  thongBaoList.querySelectorAll('.mark-read-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const parent = btn.closest('.thong-bao-item');
      const id = parent?.dataset.id;
      const type = parent?.dataset.type;
      if (id && type) {
        markReadNotification(id, type);
      }
    });
  });

  thongBaoList.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const parent = btn.closest('.thong-bao-item');
      const id = parent?.dataset.id;
      const type = parent?.dataset.type;
      if (id && type) {
        deleteNotification(id, type);
      }
    });
  });

  const searchInput = document.getElementById('search-thong-bao');
  if (searchInput) {
    searchInput.addEventListener('input', debounce((e) => {
      const search = e.target.value.trim();
      const filter = document.getElementById('filter-thong-bao')?.value || 'all';
      const url = `/admin/thong-bao?page=1${filter !== 'all' ? '&filter=' + filter : ''}${search ? '&search=' + encodeURIComponent(search) : ''}`;
      window.location.href = url;
    }, 300));
  }

  const filterSelect = document.getElementById('filter-thong-bao');
  if (filterSelect) {
    filterSelect.addEventListener('change', (e) => {
      const filter = e.target.value;
      const search = document.getElementById('search-thong-bao')?.value || '';
      const url = `/admin/thong-bao?page=1${filter !== 'all' ? '&filter=' + filter : ''}${search ? '&search=' + encodeURIComponent(search) : ''}`;
      window.location.href = url;
    });
  }
}

// Khi trang đã sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
  console.log('[DOMContentLoaded] Gọi bindThongBaoEventListeners');
  bindThongBaoEventListeners();
  setupNotificationDropdown();
  loadNotificationCount();
});

