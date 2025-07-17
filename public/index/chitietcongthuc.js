
  console.log("JS hồ sơ đã hoạt động");

  // Mở modal
  function openModalProfile() {
    const modal = document.getElementById('updateProfileModal');
    if (!modal) return console.error('Modal không tìm thấy!');
    modal.classList.remove('hidden');
    setTimeout(() => modal.querySelector('.modal')?.classList.add('show'), 10);
  }

  // Đóng modal
  function closeModalProfile() {
    const modal = document.getElementById('updateProfileModal');
    if (!modal) return console.error('Modal không tìm thấy khi đóng!');
    modal.querySelector('.modal')?.classList.remove('show');
    setTimeout(() => modal.classList.add('hidden'), 400);
  }

  // Xử lý preview ảnh đại diện
  document.getElementById('avatarInput')?.addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (evt) {
        const preview = document.getElementById('avatarPreview');
        const avatarImg = document.getElementById('avatar-img');
        if (preview) preview.src = evt.target.result;
        if (avatarImg) avatarImg.src = evt.target.result;
      };
      reader.readAsDataURL(file);
    }
  });

  // Đổi tab
  function switchTab(tabName, el) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    document.getElementById(`${tabName}-tab`)?.classList.remove('hidden');

    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active-tab', 'border-yellow-500', 'text-yellow-600'));
    el.classList.add('active-tab', 'border-yellow-500', 'text-yellow-600');
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Đánh dấu tab hiện tại
    document.querySelector('.tab-btn.active-tab')?.classList.add('border-yellow-500', 'text-yellow-600');

    // Submit form cập nhật hồ sơ
    const form = document.getElementById('updateProfileForm');
    if (form) {
      form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const saveBtn = document.getElementById('saveButton');
        const loadingIcon = document.getElementById('loadingIcon');
        if (!saveBtn || !loadingIcon) return alert('Không tìm thấy nút Lưu hoặc icon loading');

        saveBtn.disabled = true;
        loadingIcon.classList.remove('hidden');

        const formData = new FormData(this);

        try {
          const res = await fetch('/api/profile', {
            method: 'PUT',
            body: formData
          });

          const data = await res.json();
          console.log('Phản hồi:', data);

          if (data.error) {
            alert(data.error);
          } else {
            alert(data.message || 'Cập nhật thành công!');
            closeModalProfile();

            // Cập nhật lại giao diện
            if (data.user) {
              document.getElementById('avatar-img')?.setAttribute('src', data.user.AVARTAR_URL || 'https://i.imgur.com/2Nv5jVb.png');
              const nameEl = document.querySelector('h2.text-xl, h2.text-2xl.font-bold');
              const emailEl = document.querySelector('p.text-gray-600.mt-2');
              if (nameEl) nameEl.textContent = data.user.TEN_NGUOI_DUNG || 'Chưa có tên';
              if (emailEl) emailEl.textContent = `📧 ${data.user.EMAIL_ || 'Chưa có email'}`;

              const errorMsg = document.querySelector('.error-message');
              if (errorMsg && data.user.TEN_NGUOI_DUNG && data.user.EMAIL_) errorMsg.remove();
            }
          }
        } catch (err) {
          console.error(err);
          alert('Có lỗi khi cập nhật hồ sơ!');
        } finally {
          saveBtn.disabled = false;
          loadingIcon.classList.add('hidden');
        }
      });
    }
  });

