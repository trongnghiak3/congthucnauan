console.log('✅ js của thông báo đã chạy');

// Hiển thị thông báo popup
function showAdminNotification(message, type = 'success') {
  const notif = document.getElementById('admin-notification');
  if (!notif) {
    console.error('Không tìm thấy #admin-notification');
    return;
  }
  notif.innerHTML = '';
  const icons = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
    warning: '⚠️'
  };
  const bgColors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    warning: 'bg-yellow-500'
  };
  notif.className = `fixed top-5 right-5 z-50 flex items-start gap-3 px-4 py-3 rounded-xl text-white shadow-xl transform transition-all duration-300 ease-in-out opacity-0 ${bgColors[type] || bgColors.success}`;
  notif.innerHTML = `
    <div class="text-2xl">${icons[type] || icons.success}</div>
    <div class="text-sm font-medium">${message}</div>
  `;
  notif.classList.remove('hidden');
  setTimeout(() => notif.classList.add('opacity-100', 'translate-y-0'), 10);
  setTimeout(() => notif.classList.remove('opacity-100', 'translate-y-0'), 3000);
  setTimeout(() => notif.classList.add('hidden'), 3500);
}

// Đánh dấu đã đọc
async function markReadNotification(id, type) {
  try {
    const response = await fetch(`/api/thong-bao/${type}/${id}/mark-read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error ${response.status}: ${errorText}`);
    }
    const result = await response.json();
    if (result.success) {
      showAdminNotification('Đã đánh dấu thông báo là đã đọc!');
      const notificationItem = document.querySelector(`.thong-bao-item[data-id="${id}"][data-type="${type}"]`);
      if (notificationItem) {
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
      loadNotificationCount();
    } else {
      showAdminNotification(result.message || 'Không thể đánh dấu.', 'error');
    }
  } catch (error) {
    console.error('Lỗi khi đánh dấu đã đọc:', error);
    showAdminNotification('Đã xảy ra lỗi khi đánh dấu.', 'error');
  }
}

// Xóa thông báo
async function deleteNotification(id, type) {
  try {
    const confirmed = confirm('Bạn có chắc muốn xóa thông báo này?');
    if (!confirmed) return;
    const response = await fetch(`/api/thong-bao/${type}/${id}/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error ${response.status}: ${errorText}`);
    }
    const result = await response.json();
    if (result.success) {
      showAdminNotification('Thông báo đã được xóa!');
      const notificationItem = document.querySelector(`.thong-bao-item[data-id="${id}"][data-type="${type}"]`);
      if (notificationItem) {
        notificationItem.remove();
      }
      loadNotificationCount();
    } else {
      showAdminNotification(result.message || 'Không thể xóa.', 'error');
    }
  } catch (error) {
    console.error('Lỗi khi xóa thông báo:', error);
    showAdminNotification('Đã xảy ra lỗi khi xóa.', 'error');
  }
}

// Đếm số thông báo chưa đọc
async function loadNotificationCount() {
  try {
    const res = await fetch('/api/thong-bao/dem-chua-doc', {
      headers: { 'X-Requested-With': 'XMLHttpRequest' }
    });
    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}`);
    }
    const data = await res.json();
    const count = data.count;
    const badge = document.getElementById('unread-notification-count');
    if (badge) {
      if (count > 0) {
        badge.textContent = count > 9 ? '9+' : count;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }
  } catch (err) {
    console.error('Không thể tải số lượng thông báo:', err);
    showAdminNotification('Lỗi khi tải số lượng thông báo.', 'error');
  }
}

// Xử lý toggle dropdown + load preview
function setupNotificationDropdown() {
  const toggle = document.getElementById('notification-toggle');
  const dropdown = document.getElementById('notification-dropdown');
  const preview = document.getElementById('notification-preview');
  if (!toggle || !dropdown || !preview) {
    console.error('Không tìm thấy các phần tử notification-toggle, notification-dropdown hoặc notification-preview');
    return;
  }
  toggle.addEventListener('click', async () => {
    dropdown.classList.toggle('hidden');
    if (!dropdown.classList.contains('hidden')) {
      try {
        const res = await fetch('/api/thong-bao?limit=5', {
          headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
        if (!res.ok) {
          throw new Error(`HTTP error ${res.status}`);
        }
        const data = await res.json();
        const list = data.thong_bao || [];
        preview.innerHTML = '';
        if (list.length === 0) {
          preview.innerHTML = '<p class="text-gray-500 text-sm text-center">Không có thông báo.</p>';
          return;
        }
        list.forEach(tb => {
          let iconClass = 'fas fa-bell';
          let iconColor = 'text-yellow-500';
          const type = tb.LOAI_TB;
          if (type === 'cong_thuc') {
            iconClass = 'fas fa-utensils';
            iconColor = 'text-blue-500';
          } else if (type === 'binh_luan') {
            iconClass = 'fas fa-comments';
            iconColor = 'text-green-500';
          } else if (type === 'phan_hoi_binh_luan') {
            iconClass = 'fas fa-reply';
            iconColor = 'text-purple-500';
          } else if (type === 'danh_gia') {
            iconClass = 'fas fa-star';
            iconColor = 'text-yellow-500';
          } else if (type === 'yeu_thich') {
            iconClass = 'fas fa-heart';
            iconColor = 'text-red-500';
          } else if (type === 'binh_luan_cam_xuc' || type === 'phan_hoi_cam_xuc') {
            iconClass = 'fas fa-smile';
            iconColor = 'text-pink-500';
          }
          let emotionIcon = '';
          if (type === 'binh_luan_cam_xuc' || type === 'phan_hoi_cam_xuc') {
            const match = tb.NOI_DUNG_TB.match(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}]/u);
            if (match) emotionIcon = match[0];
          }
          const item = document.createElement('div');
          item.className = `flex items-start gap-2 p-3 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 ${tb.DA_DOC ? 'opacity-75' : ''}`;
          item.innerHTML = `
            <i class="${iconClass} ${iconColor} text-sm mt-1"></i>
            <div class="flex-1">
              <p class="text-sm text-gray-800">${tb.NOI_DUNG_TB}</p>
              ${emotionIcon ? `<p class="text-xs text-gray-600 italic">Cảm xúc: ${emotionIcon}</p>` : ''}
              <p class="text-xs text-gray-500 mt-0.5">${timeAgo(new Date(tb.NGAY_TAO_TB))}</p>
            </div>
          `;
          preview.appendChild(item);
        });
      } catch (err) {
        console.error('Lỗi khi lấy preview thông báo:', err);
        preview.innerHTML = '<p class="text-gray-500 text-sm text-center">Lỗi khi tải thông báo.</p>';
      }
    }
  });
}

function timeAgo(date) {
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return `${diff} giây trước`;
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
}

// Debounce
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      console.log('[debounce] Thực thi hàm sau', wait, 'ms');
      func.apply(this, args);
    }, wait);
  };
}

// Khởi tạo sự kiện cho danh sách thông báo
function initializeThongBao() {
  console.log('[initializeThongBao] Gắn sự kiện thông báo');
  const thongBaoList = document.getElementById('thong-bao-list');
  if (!thongBaoList) {
    // console.error('Không tìm thấy phần tử thong-bao-list');
    // showAdminNotification('Không tìm thấy danh sách thông báo.', 'error');
    return;
  }
  // Xóa các sự kiện cũ để tránh trùng lặp
  thongBaoList.querySelectorAll('.mark-read-btn').forEach(btn => {
    btn.replaceWith(btn.cloneNode(true));
  });
  thongBaoList.querySelectorAll('.delete-btn').forEach(btn => {
    btn.replaceWith(btn.cloneNode(true));
  });
  // Gắn sự kiện đánh dấu đã đọc
  thongBaoList.querySelectorAll('.mark-read-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const parent = btn.closest('.thong-bao-item');
      const id = parent?.dataset.id;
      const type = parent?.dataset.type;
      if (id && type) {
        console.log('Đánh dấu đã đọc:', { id, type });
        markReadNotification(id, type);
      } else {
        console.error('ID hoặc type không hợp lệ cho mark-read');
        showAdminNotification('ID hoặc type không hợp lệ.', 'error');
      }
    });
  });
  // Gắn sự kiện xóa thông báo
  thongBaoList.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const parent = btn.closest('.thong-bao-item');
      const id = parent?.dataset.id;
      const type = parent?.dataset.type;
      if (id && type) {
        console.log('Xóa thông báo:', { id, type });
        deleteNotification(id, type);
      } else {
        console.error('ID hoặc type không hợp lệ cho delete');
        showAdminNotification('ID hoặc type không hợp lệ.', 'error');
      }
    });
  });
  // Gắn sự kiện tìm kiếm
  const searchInput = document.getElementById('search-thong-bao');
  if (searchInput) {
    searchInput.addEventListener('input', debounce((e) => {
      const search = e.target.value.trim();
      const filter = document.getElementById('filter-thong-bao')?.value || 'all';
      const urlPrefix = window.location.pathname.includes('/admin') ? '/admin' : '/nguoi-dung';
      const url = `${urlPrefix}/thong-bao?page=1${filter !== 'all' ? '&filter=' + filter : ''}${search ? '&search=' + encodeURIComponent(search) : ''}`;
      console.log('Tải trang tìm kiếm:', url);
      loadPage(url, null);
    }, 500));
  } else {
    console.error('Không tìm thấy search-thong-bao');
    showAdminNotification('Không tìm thấy ô tìm kiếm.', 'error');
  }
  // Gắn sự kiện lọc
  const filterSelect = document.getElementById('filter-thong-bao');
  if (filterSelect) {
    filterSelect.addEventListener('change', (e) => {
      const filter = e.target.value;
      const search = document.getElementById('search-thong-bao')?.value || '';
      const urlPrefix = window.location.pathname.includes('/admin') ? '/admin' : '/nguoi-dung';
      const url = `${urlPrefix}/thong-bao?page=1${filter !== 'all' ? '&filter=' + filter : ''}${search ? '&search=' + encodeURIComponent(search) : ''}`;
      console.log('Tải trang lọc:', url);
      loadPage(url, null);
    });
  } else {
    console.error('Không tìm thấy filter-thong-bao');
    showAdminNotification('Không tìm thấy bộ lọc.', 'error');
  }
  // Gắn sự kiện phân trang
  document.querySelectorAll('.pagination-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const url = link.getAttribute('href');
      console.log('Tải trang phân trang:', url);
      loadPage(url, null);
    });
  });
}

// Gắn các sự kiện chính
function bindThongBaoEventListeners() {
  console.log('[bindThongBaoEventListeners] Gắn sự kiện thông báo');
  initializeThongBao();
}

// Khi trang đã sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
  console.log('[DOMContentLoaded] Gọi bindThongBaoEventListeners');
  bindThongBaoEventListeners();
  setupNotificationDropdown();
  loadNotificationCount();
});