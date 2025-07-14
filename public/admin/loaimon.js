function bindEventListeners() {
  console.log('Gọi bindEventListeners cho /admin/loai-mon');
  const form = document.getElementById('categoryForm');
  if (form && !form.dataset.submitBound) {
    form.dataset.submitBound = 'true';
    bindFormSubmit();
    console.log('Đã gắn sự kiện submit cho #categoryForm trong bindEventListeners');
  } else if (!form) {
    console.log('Không tìm thấy #categoryForm trong bindEventListeners, sẽ gắn sự kiện khi modal mở');
  } else {
    console.log('Sự kiện submit đã được gắn trước đó cho #categoryForm');
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

    // // Hàm hiển thị thông báo
    // function showAdminNotification(message, type = 'success') {
    //   const notif = document.createElement('div');
    //   notif.className = `fixed top-5 right-5 z-50 px-4 py-2 rounded text-white shadow-lg ${type === 'error' ? 'bg-red-500' : 'bg-green-500'}`;
    //   notif.textContent = message;
    //   document.body.appendChild(notif);
    //   setTimeout(() => notif.remove(), 3000);
    // }

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

    // Hàm mở modal để thêm loại món
function openAddCategoryModal() {
  const modal = document.getElementById('categoryModal');
  const form = document.getElementById('categoryForm');
  const modalTitle = document.getElementById('modalTitle');
  const submitButton = document.getElementById('submitButton');
  const categoryIdInput = document.getElementById('categoryId');
  const tenLoaiInput = document.getElementById('tenLoai');
  const slugInput = document.getElementById('slug');
  const imagePreview = document.getElementById('imagePreview');

  if (!modal || !form || !modalTitle || !submitButton || !categoryIdInput || !tenLoaiInput || !slugInput || !imagePreview) {
    console.error('Không tìm thấy modal hoặc các phần tử form');
    showError('Lỗi: Không tìm thấy modal hoặc form!');
    return;
  }

  modalTitle.textContent = 'Thêm Loại Món';
  submitButton.textContent = 'Thêm';
  form.setAttribute('data-category-id', '');
  categoryIdInput.value = '';
  tenLoaiInput.value = '';
  slugInput.value = '';
  imagePreview.src = '/default.jpg';
  imagePreview.classList.remove('hidden');

  // Gắn sự kiện submit cho form
  if (!form.dataset.submitBound) {
    form.dataset.submitBound = 'true';
    bindFormSubmit();
    console.log('Đã gắn sự kiện submit cho #categoryForm trong openAddCategoryModal');
  } else {
    console.log('Sự kiện submit đã được gắn trước đó cho #categoryForm');
  }

  modal.classList.remove('hidden');
}
    // Hàm mở modal để sửa loại món
    async function openEditCategoryModal(id) {
      console.log('Gọi openEditCategoryModal với ID:', id);
      try {
        const response = await fetch(`/admin/loai-mon/edit/${id}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });

        const result = await response.json();
        console.log('Phản hồi từ server:', result);

        if (!response.ok) {
          showError(result.message || `Lỗi khi lấy dữ liệu loại món (Mã lỗi: ${response.status})`);
          return;
        }

        const modal = document.getElementById('categoryModal');
        const form = document.getElementById('categoryForm');
        const modalTitle = document.getElementById('modalTitle');
        const submitButton = document.getElementById('submitButton');
        const categoryIdInput = document.getElementById('categoryId');
        const tenLoaiInput = document.getElementById('tenLoai');
        const slugInput = document.getElementById('slug');
        const imagePreview = document.getElementById('imagePreview');

        if (!modal || !form || !modalTitle || !submitButton || !categoryIdInput || !tenLoaiInput || !slugInput || !imagePreview) {
          console.error('Không tìm thấy modal hoặc các phần tử form');
          showError('Lỗi: Không tìm thấy modal hoặc form!');
          return;
        }

        modalTitle.textContent = 'Sửa Loại Món';
        submitButton.textContent = 'Lưu';
        form.setAttribute('data-category-id', result.ID_CHINH_LM || '');
        console.log('Gán ID thành công:', form.dataset.categoryId);
        categoryIdInput.value = result.ID_CHINH_LM || '';
        tenLoaiInput.value = result.TEN_LM || '';
        slugInput.value = result.SLUG_LM || '';
        imagePreview.src = result.HINH_ANH_LM_URL && result.HINH_ANH_LM_URL.trim() ? result.HINH_ANH_LM_URL : '/default.jpg';
        imagePreview.classList.remove('hidden');

        console.log('Đã đặt giá trị form:', {
          id: categoryIdInput.value,
          TEN_LM: tenLoaiInput.value,
          SLUG_LM: slugInput.value,
          hinh_anh: imagePreview.src,
        });






        modal.classList.remove('hidden');
      } catch (error) {
        console.error('Lỗi khi tải dữ liệu loại món:', error);
        showError('Lỗi server: ' + (error.message || 'Không thể kết nối tới server'));
      }
    }

    // Hàm đóng modal
    function closeCategoryModal() {
      const modal = document.getElementById('categoryModal');
      const form = document.getElementById('categoryForm');
      const imagePreview = document.getElementById('imagePreview');
      if (modal && form && imagePreview) {
        modal.classList.add('hidden');
        form.reset();
        form.setAttribute('data-category-id', '');
        imagePreview.src = '/default.jpg';
        imagePreview.classList.remove('hidden');
      }
    }

    // Hàm xử lý submit form
function bindFormSubmit() {
  const form = document.getElementById('categoryForm');
  if (!form) {
    console.error('Không tìm thấy form với ID categoryForm khi gọi bindFormSubmit');
    return;
  }

  form.removeEventListener('submit', handleCategoryFormSubmit);
  form.addEventListener('submit', handleCategoryFormSubmit);
  console.log('Đã gắn sự kiện submit cho #categoryForm tại', new Date().toISOString());

 async function handleCategoryFormSubmit(e) {
  e.preventDefault();
  console.log('Form #categoryForm submitted tại', new Date().toISOString());
  console.log('Dataset khi submit:', form.dataset);

  const categoryId = form.dataset.categoryId;
  console.log('categoryId:', categoryId);
  const isEdit = !!categoryId;
  console.log('isEdit:', isEdit);

  if (isEdit && !categoryId) {
    console.error('ID loại món không hợp lệ:', categoryId);
    showError('Lỗi: ID loại món không hợp lệ!');
    return;
  }

  const formData = new FormData(form);
  const url = isEdit ? `/admin/loai-mon/${categoryId}` : `/admin/loai-mon`;
  const method = isEdit ? 'PUT' : 'POST';
  console.log('Gửi yêu cầu:', { url, method, formData: [...formData] });

  try {
    const res = await fetch(url, {
      method: method,
      body: formData,
    });

    let data;
    try {
      data = await res.json(); // Thử phân tích JSON
    } catch (err) {
      if (err instanceof SyntaxError) {
        // Phản hồi không phải JSON
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

    showAdminNotification(isEdit ? 'Cập nhật thành công!' : 'Thêm thành công!');
    closeCategoryModal();
    loadPage('/admin/loai-mon?page=1', document.querySelector('#content'));
  } catch (err) {
    console.error('Lỗi khi gửi yêu cầu:', err);
    showError('Lỗi: ' + err.message);
  }
}
}

// Gắn sự kiện chỉ một lần
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded triggered at', new Date().toISOString());
  const form = document.getElementById('categoryForm');
  console.log('Form #categoryForm:', form);
  if (form) {
    console.log('Form #categoryForm tồn tại, dataset:', form.dataset);
    if (!form.dataset.submitBound) {
      form.dataset.submitBound = 'true';
      bindFormSubmit();
      console.log('Đã gắn sự kiện submit cho #categoryForm');
    } else {
      console.log('Sự kiện submit đã được gắn trước đó, dataset:', form.dataset);
    }
  } else {
    console.error('Không tìm thấy form #categoryForm trong DOM');
    // Thử gắn sự kiện sau một khoảng thời gian (nếu form được thêm động)
    setTimeout(() => {
      const retryForm = document.getElementById('categoryForm');
      console.log('Thử lại form #categoryForm:', retryForm);
      if (retryForm && !retryForm.dataset.submitBound) {
        retryForm.dataset.submitBound = 'true';
        bindFormSubmit();
        console.log('Đã gắn sự kiện submit cho #categoryForm sau khi thử lại');
      }
    }, 1000); // Chờ 1 giây
  }
});




    // Hàm xóa loại món
function confirmDeleteCategory(id) {
  if (confirm('Bạn có chắc muốn xóa loại món này?')) {
    fetch(`/admin/loai-mon/${id}`, {
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
        if (err instanceof SyntaxError) {
          const text = await response.text();
          console.error('Phản hồi không phải JSON:', text);
          throw new Error(text || 'Phản hồi server không hợp lệ');
        }
        throw err;
      }

      if (response.ok) {
        showAdminNotification('Xóa loại món thành công!');
        loadPage('/admin/loai-mon?page=1', document.querySelector('#content'));
      } else {
        showError(result.message || 'Lỗi khi xóa loại món');
      }
    })
    .catch(error => {
      console.error('Lỗi khi xóa loại món:', error);
      showError('Lỗi server: ' + error.message);
    });
  }
}


