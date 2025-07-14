
      // // Hàm chuyển tab
      // function showTab(tabId) {
      //   document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
      //   document.querySelectorAll('.tab-button').forEach(button => {
      //     button.classList.remove('bg-yellow-500', 'text-white');
      //     button.classList.add('bg-gray-200', 'text-gray-600');
      //     button.setAttribute('aria-selected', 'false');
      //   });
      //   document.getElementById(tabId).classList.remove('hidden');
      //   document.getElementById(`tab-${tabId}`).classList.remove('bg-gray-200', 'text-gray-600');
      //   document.getElementById(`tab-${tabId}`).classList.add('bg-yellow-500', 'text-white');
      //   document.getElementById(`tab-${tabId}`).setAttribute('aria-selected', 'true');
      // }

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

      // Hàm mở modal để thêm món ăn
 // Hàm mở modal để thêm món ăn
function openAddDishModal() {
  const modal = document.getElementById('dishModal');
  const form = document.getElementById('dishForm');
  const modalTitle = document.getElementById('modalTitle');
  const submitButton = document.getElementById('submitButton');
  const dishIdInput = document.getElementById('dishId');
  const tenMonAnInput = document.getElementById('tenMonAn');
  const loaiMonInput = document.getElementById('loaiMon');
  const moTaInput = document.getElementById('moTa');
  const imagePreview = document.getElementById('imagePreview');

  if (!modal || !form || !modalTitle || !submitButton || !dishIdInput || !tenMonAnInput || !loaiMonInput || !moTaInput || !imagePreview) {
    console.error('Không tìm thấy modal hoặc các phần tử form');
    showError('Lỗi: Không tìm thấy modal hoặc form!');
    return;
  }

  modalTitle.textContent = 'Thêm Món Ăn';
  submitButton.textContent = 'Thêm';
  form.setAttribute('data-dish-id', '');
  dishIdInput.value = '';
  tenMonAnInput.value = '';
  moTaInput.value = '';
  Array.from(loaiMonInput.options).forEach(option => option.selected = false);
  imagePreview.src = '/default.jpg';
  imagePreview.classList.remove('hidden');

  if (!form.dataset.submitBound) {
    form.dataset.submitBound = 'true';
    bindDishFormSubmit();
    console.log('Đã gắn sự kiện submit cho #dishForm trong openAddDishModal');
  } else {
    console.log('Sự kiện submit đã được gắn trước đó cho #dishForm');
  }

  modal.classList.remove('hidden');
}
      // Hàm mở modal để sửa món ăn
    // Hàm mở modal để sửa món ăn
async function openEditDishModal(id) {
  console.log('Gọi openEditDishModal với ID:', id);
  try {
    const response = await fetch(`/admin/mon-an/edit/${id}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    const result = await response.json();
    console.log('Phản hồi từ server:', result);

    if (!response.ok) {
      showError(result.message || `Lỗi khi lấy dữ liệu món ăn (Mã lỗi: ${response.status})`);
      return;
    }

    const modal = document.getElementById('dishModal');
    const form = document.getElementById('dishForm');
    const modalTitle = document.getElementById('modalTitle');
    const submitButton = document.getElementById('submitButton');
    const dishIdInput = document.getElementById('dishId');
    const tenMonAnInput = document.getElementById('tenMonAn');
    const loaiMonInput = document.getElementById('loaiMon');
    const moTaInput = document.getElementById('moTa');
    const imagePreview = document.getElementById('imagePreview');

    if (!modal || !form || !modalTitle || !submitButton || !dishIdInput || !tenMonAnInput || !loaiMonInput || !moTaInput || !imagePreview) {
      console.error('Không tìm thấy modal hoặc các phần tử form');
      showError('Lỗi: Không tìm thấy modal hoặc form!');
      return;
    }

    modalTitle.textContent = 'Sửa Món Ăn';
    submitButton.textContent = 'Lưu';
    form.setAttribute('data-dish-id', result.ID_CHINH_MA || '');
    console.log('Gán ID thành công:', form.dataset.dishId);
    dishIdInput.value = result.ID_CHINH_MA || '';
    tenMonAnInput.value = result.TEN_MON_AN || '';
    moTaInput.value = result.MO_TA_MA || '';
    imagePreview.src = result.HINH_ANH_MA && result.HINH_ANH_MA.trim() ? result.HINH_ANH_MA : '/default.jpg';
    imagePreview.classList.remove('hidden');

    // Chuyển đổi loaiMonIds thành mảng chuỗi để đảm bảo khớp kiểu dữ liệu
    const loaiMonIds = (result.ID_CHINH_LM || []).map(id => String(id));
    console.log('loaiMonIds:', loaiMonIds);

    // Lấy tất cả tùy chọn trong select và log để debug
    const options = Array.from(loaiMonInput.options);
    console.log('Tùy chọn trong loaiMonInput:', options.map(opt => ({ value: opt.value, text: opt.textContent })));

    // Chọn các tùy chọn khớp với loaiMonIds
    options.forEach(option => {
      option.selected = loaiMonIds.includes(String(option.value));
    });

    console.log('Đã đặt giá trị form:', {
      id: dishIdInput.value,
      TEN_MON_AN: tenMonAnInput.value,
      MO_TA_MA: moTaInput.value,
      ID_CHINH_LM: loaiMonIds,
      LOAI_MON: result.LOAI_MON,
      hinh_anh: imagePreview.src,
    });

    if (!form.dataset.submitBound) {
      form.dataset.submitBound = 'true';
      bindDishFormSubmit();
      console.log('Đã gắn sự kiện submit cho #dishForm trong openEditDishModal');
    } else {
      console.log('Sự kiện submit đã được gắn trước đó cho #dishForm');
    }

    modal.classList.remove('hidden');
  } catch (error) {
    console.error('Lỗi khi tải dữ liệu món ăn:', error);
    showError('Lỗi server: ' + (error.message || 'Không thể kết nối tới server'));
  }
}

      // Hàm đóng modal
      function closeDishModal() {
        const modal = document.getElementById('dishModal');
        const form = document.getElementById('dishForm');
        const imagePreview = document.getElementById('imagePreview');
        if (modal && form && imagePreview) {
          modal.classList.add('hidden');
          form.reset();
          form.setAttribute('data-dish-id', '');
          imagePreview.src = '/default.jpg';
          imagePreview.classList.remove('hidden');
        }
      }

   // Hàm xử lý submit form món ăn
function bindDishFormSubmit() {
  const form = document.getElementById('dishForm');
  if (!form) {
    console.error('Không tìm thấy form với ID dishForm khi gọi bindDishFormSubmit');
    return;
  }

  form.removeEventListener('submit', handleDishFormSubmit);
  form.addEventListener('submit', handleDishFormSubmit);
  console.log('Đã gắn sự kiện submit cho #dishForm tại', new Date().toISOString());

  async function handleDishFormSubmit(e) {
    e.preventDefault();
    console.log('Form #dishForm submitted tại', new Date().toISOString());
    console.log('Dataset khi submit:', form.dataset);

    const dishId = form.dataset.dishId;
    console.log('dishId:', dishId);
    const isEdit = !!dishId;
    console.log('isEdit:', isEdit);

    if (isEdit && !dishId) {
      console.error('ID món ăn không hợp lệ:', dishId);
      showError('Lỗi: ID món ăn không hợp lệ!');
      return;
    }

    const formData = new FormData(form);
    const url = isEdit ? `/admin/mon-an/${dishId}` : `/admin/mon-an`;
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

      showAdminNotification(isEdit ? 'Cập nhật món ăn thành công!' : 'Thêm món ăn thành công!');
      closeDishModal();
      loadPage('/admin/mon-an?page=1', document.querySelector('#content'));
    } catch (err) {
      console.error('Lỗi khi gửi yêu cầu:', err);
      showError('Lỗi: ' + err.message);
    }
  }
}


    // Gắn sự kiện khi DOM tải xong
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded triggered at', new Date().toISOString());
  const form = document.getElementById('dishForm');
  console.log('Form #dishForm:', form);
  if (form) {
    console.log('Form #dishForm tồn tại, dataset:', form.dataset);
    if (!form.dataset.submitBound) {
      form.dataset.submitBound = 'true';
      bindDishFormSubmit();
      console.log('Đã gắn sự kiện submit cho #dishForm');
    } else {
      console.log('Sự kiện submit đã được gắn trước đó, dataset:', form.dataset);
    }
  } else {
    console.error('Không tìm thấy form #dishForm trong DOM');
    setTimeout(() => {
      const retryForm = document.getElementById('dishForm');
      console.log('Thử lại form #dishForm:', retryForm);
      if (retryForm && !retryForm.dataset.submitBound) {
        retryForm.dataset.submitBound = 'true';
        bindDishFormSubmit();
        console.log('Đã gắn sự kiện submit cho #dishForm sau khi thử lại');
      }
    }, 1000);
  }
});

      // Hàm xóa món ăn
      function confirmDeleteDish(id) {
        if (confirm('Bạn có chắc muốn xóa món ăn này?')) {
          fetch(`/admin/mon-an/${id}`, {
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
              showAdminNotification('Xóa món ăn thành công!');
              loadPage('/admin/mon-an?page=1', document.querySelector('#content'));
            } else {
              showError(result.message || 'Lỗi khi xóa món ăn');
            }
          })
          .catch(error => {
            console.error('Lỗi khi xóa món ăn:', error);
            showError('Lỗi server: ' + error.message);
          });
        }
      }

   // Hàm lọc món ăn ở Tab 2
function filterDishes() {
  const input = document.getElementById('searchDish').value.toLowerCase().trim();
  const totalDishesEl = document.getElementById('totalDishes');
  const rows = document.querySelectorAll('#dishes-by-category tbody tr');

  if (!totalDishesEl) {
    console.error('Không tìm thấy #totalDishes');
    return;
  }

  let visibleCount = 0;

  // Lấy tất cả các hàng chi tiết để tính tổng số món ăn ban đầu
  const dishRows = document.querySelectorAll('.dish-row');

  if (!input) {
    // Khi input rỗng, hiển thị lại tất cả hàng và tiêu đề nhóm
    rows.forEach(row => {
      row.style.display = '';
      if (row.classList.contains('dish-row')) {
        visibleCount++;
      }
    });
    totalDishesEl.textContent = visibleCount;
    console.log('Input rỗng, hiển thị lại tất cả món ăn, tổng số:', visibleCount);
    return;
  }

  // Khi có input, lọc như bình thường
  rows.forEach(row => {
    // Nếu là dòng tiêu đề nhóm (có colspan="3")
    if (row.querySelector('td[colspan="3"]')) {
      const groupId = row.getAttribute('data-group-id');
      const dishRows = document.querySelectorAll(`.dish-row[data-group="${groupId}"]`);
      let groupVisible = false;

      // Kiểm tra các dòng chi tiết của nhóm
      dishRows.forEach(dishRow => {
        const dishNameCell = dishRow.querySelector('td:nth-child(2)').textContent.toLowerCase().trim();
        const categoryNameCell = dishRow.querySelector('td:nth-child(3)').textContent.toLowerCase().trim();

        // Hiển thị nếu tên món ăn hoặc loại món khớp với từ khóa tìm kiếm
        if (dishNameCell.includes(input) || categoryNameCell.includes(input)) {
          dishRow.style.display = '';
          groupVisible = true;
          visibleCount++;
        } else {
          dishRow.style.display = 'none';
        }
      });

      // Hiển thị/ẩn tiêu đề nhóm dựa trên kết quả tìm kiếm
      row.style.display = groupVisible ? '' : 'none';
    }
  });

  // Cập nhật tổng số món ăn
  totalDishesEl.textContent = visibleCount;
  console.log('Cập nhật tổng số món ăn:', visibleCount);
}

// Hàm chuyển đổi hiển thị món ăn theo nhóm
function toggleDishes(groupId) {
  const rows = document.querySelectorAll(`.dish-row[data-group="${groupId}"]`);
  rows.forEach(row => row.classList.toggle('hidden'));
  console.log(`Chuyển đổi hiển thị nhóm món ăn ID: ${groupId}`);
}
// Hàm gắn sự kiện cho món ăn
function bindDishEventListeners() {
  console.log('Gọi bindDishEventListeners cho /admin/mon-an');
  const form = document.getElementById('dishForm');
  if (form && !form.dataset.submitBound) {
    form.dataset.submitBound = 'true';
    bindDishFormSubmit();
    console.log('Đã gắn sự kiện submit cho #dishForm trong bindDishEventListeners');
  } else if (!form) {
    console.log('Không tìm thấy #dishForm trong bindDishEventListeners, sẽ gắn sự kiện khi modal mở');
  } else {
    console.log('Sự kiện submit đã được gắn trước đó cho #dishForm');
  }
}