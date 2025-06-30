document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM fully loaded, binding event listeners');
  bindEventListeners();
  prefillFormFromQueryParams();
});

// Function to prefill form with query parameters
function prefillFormFromQueryParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const tenMonAn = urlParams.get('TEN_MON_AN');
  const moTaMa = urlParams.get('MO_TA_MA');
  const idChinhLm = urlParams.getAll('ID_CHINH_LM');
  const hinhAnh = urlParams.get('hinh_anh');

  if (tenMonAn || moTaMa || idChinhLm.length > 0 || hinhAnh) {
    console.log('Prefilling form with query params:', { tenMonAn, moTaMa, idChinhLm, hinhAnh });
    openAddModal();
    if (tenMonAn) {
      document.getElementById('addTenMonAn').value = tenMonAn;
    }
    if (moTaMa) {
      document.getElementById('addMota').value = moTaMa;
    }
    if (idChinhLm.length > 0) {
      const loaiMonSelect = document.getElementById('addLoaiMon');
      Array.from(loaiMonSelect.options).forEach(option => {
        option.selected = idChinhLm.includes(option.value);
      });
    }
    if (hinhAnh) {
      console.warn('Image file cannot be prefilled from query parameter. Please select the file manually.');
    }
  }
}

// Function to bind event listeners to forms
function bindEventListeners() {
 const addForm = document.getElementById('addDishForm');
if (addForm) {
  addForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const loaiMonSelect = document.getElementById('addLoaiMon');

    const selectedLoaiMon = Array.from(loaiMonSelect.selectedOptions)
      .map(option => String(option.value).trim())
      .filter(id => id && !isNaN(id));

    const tenMonAn = formData.get('TEN_MON_AN')?.trim();
    if (!tenMonAn) {
      showAdminNotification('Tên món ăn là bắt buộc!', 'error');
      return;
    }
    if (selectedLoaiMon.length === 0) {
      showAdminNotification('Vui lòng chọn ít nhất một loại món!', 'error');
      return;
    }

    const idChinhLmJson = JSON.stringify(selectedLoaiMon);
    formData.set('ID_CHINH_LM', idChinhLmJson);

    try {
      const response = await fetch('/admin/mon-an', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();

      if (response.ok) {
        showAdminNotification(result.message || 'Thêm món ăn thành công!');
        closeAddModal();
        loadPage('/admin/mon-an?page=1', document.querySelector('#content'));
      } else {
        showAdminNotification(result.message || 'Thêm món ăn thất bại!', 'error');
      }
    } catch (err) {
      console.error('Lỗi khi thêm:', err);
      showAdminNotification('Lỗi server: ' + err.message, 'error');
    }
  });
}


  const editForm = document.getElementById('editDishForm');
  if (editForm) {
    console.log('editDishForm found, attaching submit event listener');
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      console.log('editDishForm submit event triggered');
      const formData = new FormData(e.target);
      const id = formData.get('ID_CHINH_MA')?.trim();
      const tenMonAn = formData.get('TEN_MON_AN')?.trim();
      const loaiMonSelect = document.getElementById('editLoaiMon');
      const selectedLoaiMon = Array.from(loaiMonSelect.selectedOptions)
        .map(option => String(option.value).trim())
        .filter(id => id && !isNaN(id)); // Lọc ID hợp lệ
      console.log('selectedLoaiMon:', selectedLoaiMon);

      // Validate inputs
      if (!id || isNaN(id)) {
        alert('ID món ăn không hợp lệ!');
        return;
      }
      if (!tenMonAn) {
        alert('Tên món ăn là bắt buộc!');
        return;
      }
      if (selectedLoaiMon.length === 0) {
        alert('Vui lòng chọn ít nhất một loại món!');
        return;
      }

      // Tạo chuỗi JSON cho ID_CHINH_LM
      const idChinhLmJson = JSON.stringify(selectedLoaiMon);
      console.log('ID_CHINH_LM JSON:', idChinhLmJson);
      formData.set('ID_CHINH_LM', idChinhLmJson);
      console.log('FormData to be sent:', Object.fromEntries(formData));

      try {
        const response = await fetch(`/admin/mon-an/${id}`, {
          method: 'PUT',
          body: formData,
        });
        const result = await response.json();
        console.log('Server response:', result);
        if (response.ok) {
          alert('Cập nhật món ăn thành công!');
          closeEditModal();
          loadPage('/admin/mon-an?page=1', document.querySelector('#content'));
        } else {
          alert(result.message || 'Cập nhật món ăn thất bại!');
        }
      } catch (err) {
        console.error('Lỗi khi sửa:', err);
        alert('Lỗi server: ' + err.message);
      }
    });
  } else {
    console.error('editDishForm not found in DOM');
  }

  // Attach edit button listeners
   const editButtons = document.querySelectorAll('.btn-edit');
  console.log(`Found ${editButtons.length} edit buttons`);
  editButtons.forEach(button => {
    button.addEventListener('click', () => {
      const id = button.dataset.id;
      const ten = button.dataset.ten;
      const loai = button.dataset.loai;
      const mota = button.dataset.mota;
      const hinh = button.dataset.hinh;
      console.log('Edit button clicked:', { id, ten, loai, mota, hinh });
      openEditModal(id, ten, loai, mota, hinh);
    });
  });
}

// Tab switching function
function showTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.add('hidden');
  });
  document.querySelectorAll('.tab-button').forEach(button => {
    button.classList.remove('bg-yellow-500', 'text-white');
    button.classList.add('bg-gray-200', 'text-gray-600');
    button.setAttribute('aria-selected', 'false');
  });
  document.getElementById(tabId).classList.remove('hidden');
  const activeButton = document.getElementById(`tab-${tabId}`);
  activeButton.classList.remove('bg-gray-200', 'text-gray-600');
  activeButton.classList.add('bg-yellow-500', 'text-white');
  activeButton.setAttribute('aria-selected', 'true');
}

// Toggle dishes in the "Danh Sách Món Ăn Theo Loại Món" tab
function toggleDishes(groupId) {
  const rows = document.querySelectorAll(`.dish-row[data-group="${groupId}"]`);
  rows.forEach(row => {
    row.classList.toggle('hidden');
  });
}

// Filter dishes based on search input
function filterDishes() {
  const searchTerm = document.querySelector('#searchDish')?.value.toLowerCase() || '';
  const rows = document.querySelectorAll('.dish-row');
  let totalVisible = 0;

  document.querySelectorAll('tr[data-group-id]').forEach(group => {
    const dishName = group.querySelector('td').textContent.toLowerCase();
    const groupId = group.getAttribute('data-group-id');
    const childRows = document.querySelectorAll(`.dish-row[data-group="${groupId}"]`);
    let hasVisibleChild = false;

    childRows.forEach(row => {
      const dishText = row.querySelector('td:nth-child(2)').textContent.toLowerCase();
      const categoryText = row.querySelector('td:nth-child(3)').textContent.toLowerCase();
      const isVisible = dishText.includes(searchTerm) || categoryText.includes(searchTerm);
      row.classList.toggle('hidden', !isVisible);
      if (isVisible) hasVisibleChild = true;
      totalVisible += isVisible ? 1 : 0;
    });

    group.classList.toggle('hidden', !hasVisibleChild);
  });

  const totalDishes = document.getElementById('totalDishes');
  if (totalDishes) totalDishes.textContent = totalVisible;
}

// Modal handling
function openAddModal() {
  const addModal = document.getElementById('addModal');
  if (addModal) {
    addModal.classList.remove('hidden');
    const addForm = document.getElementById('addDishForm');
    if (addForm) addForm.reset();
    const addImagePreview = document.getElementById('addImagePreview');
    if (addImagePreview) addImagePreview.src = '/default.jpg';
  } else {
    console.error('addModal not found');
  }
}

function closeAddModal() {
  const addModal = document.getElementById('addModal');
  if (addModal) addModal.classList.add('hidden');
}

  // Hàm mở modal chỉnh sửa
  function openEditModal(id, ten, loai, mota, hinh) {
    console.log('Opening edit modal with data:', { id, ten, loai, mota, hinh });
    const modal = document.getElementById('editModal');
    const editId = document.getElementById('editId');
    const editTenMonAn = document.getElementById('editTenMonAn');
    const editLoaiMon = document.getElementById('editLoaiMon');
    const editMota = document.getElementById('editMota');
    const currentHinhAnh = document.getElementById('currentHinhAnh');
    const editImagePreview = document.getElementById('editImagePreview');

    if (!modal || !editId || !editTenMonAn || !editLoaiMon || !editMota || !currentHinhAnh) {
      console.error('One or more form elements not found in editModal');
      return;
    }

    // Giải mã và điền dữ liệu
    editId.value = id;
    editTenMonAn.value = decodeURIComponent(ten);
    editMota.value = decodeURIComponent(mota || '');

    // Xử lý loại món
    let loaiMonIds = [];
    try {
      loaiMonIds = JSON.parse(decodeURIComponent(loai));
      console.log('Parsed loaiMonIds:', loaiMonIds);
    } catch (err) {
      console.error('Lỗi phân tích data-loai:', err.message, 'Raw value:', loai);
      alert('Dữ liệu loại món không hợp lệ!');
      return;
    }

    // Đặt giá trị cho <select multiple>
    Array.from(editLoaiMon.options).forEach(option => {
      option.selected = loaiMonIds.includes(option.value);
    });

    // Hiển thị hình ảnh hiện tại
    const hinhAnhPath = decodeURIComponent(hinh || '');
    if (hinhAnhPath) {
      currentHinhAnh.src = hinhAnhPath;
      currentHinhAnh.classList.remove('hidden');
    } else {
      currentHinhAnh.classList.add('hidden');
    }

    // Reset preview hình ảnh mới
    editImagePreview.classList.add('hidden');

    // Mở modal
    modal.classList.remove('hidden');
  }

  // Gắn sự kiện cho các nút "Sửa"
  const editButtons = document.querySelectorAll('.btn-edit');
  console.log(`Found ${editButtons.length} edit buttons`);
  editButtons.forEach(button => {
    button.addEventListener('click', () => {
      const id = button.dataset.id;
      const ten = button.dataset.ten;
      const loai = button.dataset.loai;
      const mota = button.dataset.mota;
      const hinh = button.dataset.hinh;
      console.log('Edit button clicked:', { id, ten, loai, mota, hinh });
      openEditModal(id, ten, loai, mota, hinh);
    });
  });

// Image preview handling
const addHinhAnh = document.getElementById('addHinhAnh');
if (addHinhAnh) {
  addHinhAnh.addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (file) {
      const addImagePreview = document.getElementById('addImagePreview');
      if (addImagePreview) {
        addImagePreview.src = URL.createObjectURL(file);
      }
    }
  });
}

 const editHinhAnhInput = document.getElementById('editHinhAnh');
  const editImagePreview = document.getElementById('editImagePreview');
  if (editHinhAnhInput && editImagePreview) {
    editHinhAnhInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          editImagePreview.src = event.target.result;
          editImagePreview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
      } else {
        editImagePreview.classList.add('hidden');
      }
    });
  }

// Delete dish
function confirmDeleteDish(id) {
  if (confirm("Bạn có chắc muốn xóa món ăn này?")) {
    fetch(`/admin/mon-an/${id}`, {
      method: 'DELETE'
    })
      .then(res => res.json())
      .then(data => {
        showAdminNotification(data.message || "Xóa thành công!");
        loadPage("/admin/mon-an?page=1", document.querySelector("#content"));
      })
      .catch(err => {
        console.error(err);
        showAdminNotification("Lỗi server khi xóa!", "error");
      });
  }
}


