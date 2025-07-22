document.addEventListener('DOMContentLoaded', () => {
  const comments = document.querySelectorAll('.comment');
  comments.forEach((comment) => {
    const contextMenuBtn = comment.querySelector('.context-menu-btn');
    const contextMenu = comment.querySelector('.context-menu');
    const replyForm = comment.querySelector('.reply-form');
    const editForm = comment.querySelector('.edit-form');
    const commentId = comment.getAttribute('data-comment-id');
    const commentType = comment.getAttribute('data-type');

    if (contextMenuBtn) {
      contextMenuBtn.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.context-menu').forEach((menu) => menu.classList.add('hidden'));
        contextMenu.classList.toggle('hidden');
        const rect = comment.getBoundingClientRect();
        const menuWidth = 120;
        const menuHeight = contextMenu.offsetHeight;
        let top = e.clientY - rect.top + 20;
        let left = e.clientX - rect.left - 10;
        if (e.clientX + menuWidth > window.innerWidth) left = rect.width - menuWidth - 10;
        if (e.clientY + menuHeight > window.innerHeight) top = rect.height - menuHeight - 10;
        contextMenu.style.top = `${top}px`;
        contextMenu.style.left = `${left}px`;
      });
    }

    const replyBtn = comment.querySelector('.reply-btn');
    if (replyBtn) {
      replyBtn.addEventListener('click', () => {
        if (editForm) editForm.classList.add('hidden');
        replyForm.classList.toggle('hidden');
        contextMenu.classList.add('hidden');
        console.log(`Toggled reply form for ${commentType} ID: ${commentId}`);
      });
    }

    const editBtn = comment.querySelector('.edit-btn');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        document.querySelectorAll('.edit-form').forEach((form) => form.classList.add('hidden'));
        document.querySelectorAll('.reply-form').forEach((form) => form.classList.add('hidden'));
        if (editForm) editForm.classList.toggle('hidden');
        if (contextMenu) contextMenu.classList.add('hidden');
      });
    }


    if (editForm) {
      editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const noiDung = editForm.querySelector('textarea[name="noi_dung"]').value;
        if (!noiDung) {
          showError('Nội dung không được để trống');
          return;
        }
        const actionUrl = editForm.getAttribute('action');
        if (!actionUrl) {
          showError('Không tìm thấy URL để gửi yêu cầu');
          return;
        }
        const formData = new URLSearchParams();
        formData.append('noi_dung', noiDung);
        try {
          const response = await fetch(actionUrl, {
            method: 'PUT',
            body: formData,
            headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
          });
          if (!response.ok) {
            const text = await response.text();
            console.error('Phản hồi không thành công:', response.status, text);
            showError(`Cập nhật không thành công: ${text}`);
            return;
          }
          const data = await response.json();
          if (data.success) {
            const contentElement = comment.querySelector('.comment-content');
            if (contentElement) contentElement.textContent = data.updatedContent;
            editForm.classList.add('hidden');
            showAdminNotification('Cập nhật thành công', 'success');
          } else {
            showError(data.message || 'Cập nhật không thành công');
          }
        } catch (err) {
          console.error('Lỗi khi gửi yêu cầu:', err.message, err.stack);
          showError(`Lỗi khi gửi yêu cầu: ${err.message}`);
        }
      });
    }

    // Logic xóa tương tự như PUT
   const deleteForm = comment.querySelector('.delete-form');
if (deleteForm) {
  deleteForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!confirm('Bạn có chắc chắn muốn xóa?')) return;
    const actionUrl = deleteForm.action; // Lấy action từ form
    try {
      const response = await fetch(actionUrl, {
        method: 'DELETE', // Sử dụng DELETE trực tiếp
        headers: { 'Accept': 'application/json' },
      });
      const data = await response.json();
      if (data.success) {
        comment.remove(); // Xóa phần tử HTML
        showAdminNotification(`${commentType === 'reply' ? 'Xóa phản hồi' : 'Xóa bình luận'} thành công`, 'success');
      } else {
        showError(data.message || 'Xóa không thành công');
      }
    } catch (err) {
      console.error('Lỗi khi xóa:', err);
      showError('Lỗi khi gửi yêu cầu xóa');
    }
  });
}
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.context-menu') && !e.target.closest('.context-menu-btn')) {
      document.querySelectorAll('.context-menu').forEach((menu) => menu.classList.add('hidden'));
    }
  });

  const scrollTopBtn = document.getElementById('scrollTopBtn');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
      scrollTopBtn.classList.remove('opacity-0', 'invisible');
      scrollTopBtn.classList.add('opacity-100', 'visible');
    } else {
      scrollTopBtn.classList.remove('opacity-100', 'visible');
      scrollTopBtn.classList.add('opacity-0', 'invisible');
    }
  });
  scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  document.querySelectorAll('.toggle-replies-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const targetEl = document.getElementById(targetId);
      if (targetEl) targetEl.classList.toggle('hidden');
    });
  });

  // Hàm thông báo lỗi
  function showError(message) {
    showAdminNotification(message, 'error');
  }

  // Hàm hiển thị thông báo
  function showAdminNotification(message, type = 'success') {
    const notif = document.getElementById('admin-notification');
    if (!notif) {
      console.error('Phần tử admin-notification không tồn tại!');
      alert(message); // Fallback nếu không có admin-notification
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
    setTimeout(() => {
      notif.classList.add('opacity-100', 'translate-y-0');
    }, 10);

    setTimeout(() => {
      notif.classList.remove('opacity-100');
      notif.classList.add('opacity-0');
    }, 3000);

    setTimeout(() => {
      notif.classList.add('hidden');
    }, 3500);
  }
});