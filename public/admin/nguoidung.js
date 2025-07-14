
// Hàm gắn sự kiện cho form
function bindUserEventListeners() {
    console.log('Gọi bindUserEventListeners cho /admin/nguoi-dung');
    const form = document.getElementById('userForm');
    if (form && !form.dataset.submitBound) {
      form.dataset.submitBound = 'true';
      bindFormSubmitUser();
      console.log('Đã gắn sự kiện submit cho #userForm trong bindUserEventListeners');
    } else if (!form) {
      console.log('Không tìm thấy #userForm trong bindUserEventListeners, sẽ gắn sự kiện khi modal mở');
    } else {
      console.log('Sự kiện submit đã được gắn trước đó cho #userForm');
    }
  }

// Hàm hiển thị lỗi
function showError(message) {
  const errorEl = document.createElement('div');
  errorEl.className = 'fixed top-5 right-5 z-50 px-4 py-2 rounded text-white bg-red-500 shadow-lg';
  errorEl.textContent = message;
  document.body.appendChild(errorEl);
  setTimeout(() => errorEl.remove(), 3000);
}

// Hàm hiển thị thông báo
function showAdminNotification(message, type = 'success') {
  const notif = document.createElement('div');
  notif.className = `fixed top-5 right-5 z-50 px-4 py-2 rounded text-white shadow-lg ${type === 'error' ? 'bg-red-500' : 'bg-green-500'}`;
  notif.textContent = message;
  document.body.appendChild(notif);
  setTimeout(() => notif.remove(), 3000);
}

// Hàm xem trước hình ảnh
function previewImage(input, previewElementId) {
  console.log(`[${new Date().toISOString()}] Đang xem trước hình ảnh cho ${previewElementId}`);
  const preview = document.getElementById(previewElementId);
  if (!preview) {
    console.error(`Không tìm thấy phần tử xem trước với ID ${previewElementId}`);
    showError('Lỗi: Không tìm thấy phần tử xem trước hình ảnh!');
    return;
  }
  if (input.files && input.files[0]) {
    console.log('Đã chọn file:', input.files[0].name);
    const reader = new FileReader();
    reader.onload = function (e) {
      console.log('Kết quả FileReader:', e.target.result);
      preview.src = e.target.result;
      preview.classList.remove('hidden');
    };
    reader.readAsDataURL(input.files[0]);
  } else {
    console.log('Không có file được chọn, đặt lại hình mặc định');
    preview.src = '/default.jpg';
    preview.classList.remove('hidden');
  }
}

// Hàm mở modal để thêm người dùng
  function openAddUserModal() {
    const modal = document.getElementById('userModal');
    const form = document.getElementById('userForm');
    const modalTitle = document.getElementById('modalTitle');
    const submitButton = document.getElementById('submitButton');
    const userIdInput = document.getElementById('userId');
    const tenNguoiDungInput = document.getElementById('tenNguoiDung');
    const emailInput = document.getElementById('email');
    const soDienThoaiInput = document.getElementById('soDienThoai');
    const matKhauInput = document.getElementById('matKhau');
    const vaiTroInput = document.getElementById('vaiTro');
    const trangThaiInput = document.getElementById('trangThai');
    const imagePreview = document.getElementById('imagePreview');
    const ngayTaoInput = document.getElementById('ngayTao');
    const ngayCapNhatInput = document.getElementById('ngayCapNhat');
    const trangThaiField = document.getElementById('trangThaiField');

    if (!modal || !form || !modalTitle || !submitButton || !userIdInput || !tenNguoiDungInput || !emailInput || !soDienThoaiInput || !matKhauInput || !vaiTroInput || !trangThaiInput || !imagePreview || !ngayTaoInput || !ngayCapNhatInput || !trangThaiField) {
      console.error('Không tìm thấy modal hoặc các phần tử form');
      showError('Lỗi: Không tìm thấy modal hoặc form!');
      return;
    }

    modalTitle.textContent = 'Thêm Người Dùng';
    submitButton.textContent = 'Thêm';
    form.setAttribute('data-user-id', '');
    userIdInput.value = '';
    tenNguoiDungInput.value = '';
    emailInput.value = '';
    soDienThoaiInput.value = '';
    matKhauInput.value = '';
    vaiTroInput.value = 'nguoidung';
    trangThaiInput.value = 'hoatdong';
    ngayTaoInput.value = '';
    ngayCapNhatInput.value = '';
    trangThaiField.style.display = 'none';
    imagePreview.src = '/default.jpg';
    imagePreview.classList.remove('hidden');

    if (!form.dataset.submitBound) {
      form.dataset.submitBound = 'true';
      bindFormSubmitUser();
      console.log('Đã gắn sự kiện submit cho #userForm trong openAddUserModal');
    }

    modal.classList.remove('hidden');
  }

// Hàm mở modal để sửa người dùng
async function openEditUserModal(id) {
    console.log('Gọi openEditUserModal với ID:', id);
    try {
      const response = await fetch(`/admin/nguoi-dung/edit/${id}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      const result = await response.json();
      console.log('Phản hồi từ server:', result);

      if (!response.ok) {
        showError(result.message || `Lỗi khi lấy dữ liệu người dùng (Mã lỗi: ${response.status})`);
        return;
      }

      const modal = document.getElementById('userModal');
      const form = document.getElementById('userForm');
      const modalTitle = document.getElementById('modalTitle');
      const submitButton = document.getElementById('submitButton');
      const userIdInput = document.getElementById('userId');
      const tenNguoiDungInput = document.getElementById('tenNguoiDung');
      const emailInput = document.getElementById('email');
      const soDienThoaiInput = document.getElementById('soDienThoai');
      const matKhauInput = document.getElementById('matKhau');
      const vaiTroInput = document.getElementById('vaiTro');
      const trangThaiInput = document.getElementById('trangThai');
      const imagePreview = document.getElementById('imagePreview');
      const ngayTaoInput = document.getElementById('ngayTao');
      const ngayCapNhatInput = document.getElementById('ngayCapNhat');
      const trangThaiField = document.getElementById('trangThaiField');

      if (!modal || !form || !modalTitle || !submitButton || !userIdInput || !tenNguoiDungInput || !emailInput || !soDienThoaiInput || !matKhauInput || !vaiTroInput || !trangThaiInput || !imagePreview || !ngayTaoInput || !ngayCapNhatInput || !trangThaiField) {
        console.error('Không tìm thấy modal hoặc các phần tử form');
        showError('Lỗi: Không tìm thấy modal hoặc form!');
        return;
      }

      modalTitle.textContent = 'Sửa Người Dùng';
      submitButton.textContent = 'Lưu';
      form.setAttribute('data-user-id', result.ID_CHINH_ND || '');
      userIdInput.value = result.ID_CHINH_ND || '';
      tenNguoiDungInput.value = result.TEN_NGUOI_DUNG || '';
      emailInput.value = result.EMAIL_ || '';
      soDienThoaiInput.value = result.SO_DIEN_THOAI_ || '';
      matKhauInput.value = ''; // Không hiển thị mật khẩu để bảo mật
      vaiTroInput.value = result.VAI_TRO || 'nguoidung';
      trangThaiInput.value = result.TRANG_THAI || 'hoatdong';
      ngayTaoInput.value = result.NGAY_TAO_ND ? new Date(result.NGAY_TAO_ND).toLocaleString('vi-VN') : '';
      ngayCapNhatInput.value = result.NGAY_CAP_NHAT_ND ? new Date(result.NGAY_CAP_NHAT_ND).toLocaleString('vi-VN') : '';
      trangThaiField.style.display = 'block';
      imagePreview.src = result.AVARTAR_URL && result.AVARTAR_URL.trim() ? result.AVARTAR_URL : '/default.jpg';
      imagePreview.classList.remove('hidden');

      modal.classList.remove('hidden');
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu người dùng:', error);
      showError('Lỗi server: ' + (error.message || 'Không thể kết nối tới server'));
    }
  }


// Hàm đóng modal
function closeUserModal() {
    const modal = document.getElementById('userModal');
    const form = document.getElementById('userForm');
    const imagePreview = document.getElementById('imagePreview');
    if (modal && form && imagePreview) {
      modal.classList.add('hidden');
      form.reset();
      form.setAttribute('data-user-id', '');
      imagePreview.src = '/default.jpg';
      imagePreview.classList.remove('hidden');
    }
  }

// Hàm xử lý submit form
function bindFormSubmitUser() {
    const form = document.getElementById('userForm');
    if (!form) {
      console.error('Không tìm thấy form với ID userForm khi gọi bindFormSubmitUser');
      return;
    }

    form.removeEventListener('submit', handleUserFormSubmit);
    form.addEventListener('submit', handleUserFormSubmit);
    console.log('Đã gắn sự kiện submit cho #userForm tại', new Date().toISOString());

    async function handleUserFormSubmit(e) {
      e.preventDefault();
      console.log('Form #userForm submitted tại', new Date().toISOString());
      console.log('Dataset khi submit:', form.dataset);

      const userId = form.dataset.userId;
      const isEdit = !!userId;

      if (isEdit && !userId) {
        console.error('ID người dùng không hợp lệ:', userId);
        showError('Lỗi: ID người dùng không hợp lệ!');
        return;
      }

      const formData = new FormData(form);
      const url = isEdit ? `/admin/nguoi-dung/${userId}` : `/admin/nguoi-dung`;
      const method = isEdit ? 'PUT' : 'POST';
      console.log('Gửi yêu cầu:', { url, method, formData: [...formData] });

      try {
        const res = await fetch(url, {
          method: method,
          body: formData,
        });

        let data;
        try {
          data = await res.json();
        } catch (err) {
          if (err instanceof SyntaxError) {
            const text = await res.text();
            console.error('Phản hồi không phải JSON:', text);
            showError(text || 'Lỗi server: Phản hồi không hợp lệ');
            return;
          }
          throw err;
        }

        console.log('Phản hồi từ server:', data);

        if (!res.ok) {
          showError(data.message || `Lỗi: ${res.statusText}`);
          return;
        }

        showAdminNotification(isEdit ? 'Cập nhật người dùng thành công!' : 'Thêm người dùng thành công!');
        closeUserModal();
        loadPage('/admin/nguoi-dung?page=1', document.querySelector('#content'));
      } catch (err) {
        console.error('Lỗi khi gửi yêu cầu:', err);
        showError('Lỗi: ' + err.message);
      }
    }
  }

// Hàm xóa người dùng
 function confirmDeleteUser(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa người dùng này?')) return;

    fetch(`/admin/nguoi-dung/${id}`, {
      method: 'DELETE',
      headers: { 'Accept': 'application/json' },
    })
      .then(async (response) => {
        const contentType = response.headers.get('content-type');
        let result;

        if (contentType && contentType.includes('application/json')) {
          result = await response.json();
        } else {
          const text = await response.text();
          throw new Error(text || 'Phản hồi không hợp lệ');
        }

        if (response.ok) {
          showAdminNotification('🗑️ Đã xóa người dùng thành công');
          loadPage('/admin/nguoi-dung?page=1', document.querySelector('#content'));
        } else {
          showError(result.message || 'Xóa thất bại');
        }
      })
      .catch((err) => {
        console.error('Lỗi khi xóa người dùng:', err);
        showError('Lỗi: ' + err.message);
      });
  }

  document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded triggered at', new Date().toISOString());
    bindUserEventListeners();
  });

// Gắn sự kiện khi DOM được tải
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded triggered at', new Date().toISOString());
  bindUserEventListeners();
});
