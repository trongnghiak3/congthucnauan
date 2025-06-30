function previewImage(input, previewElementId) {
  console.log(`Previewing image for ${previewElementId}`);
  const preview = document.getElementById(previewElementId);
  if (!preview) {
    console.error(`Preview element with ID ${previewElementId} not found`);
    return;
  }
  console.log('Input files:', input.files);
  if (input.files && input.files[0]) {
    console.log('File selected:', input.files[0].name);
    const reader = new FileReader();
    reader.onload = function (e) {
      console.log('FileReader result:', e.target.result);
      preview.src = e.target.result;
      preview.classList.remove('hidden');
    };
    reader.readAsDataURL(input.files[0]);
  } else {
    console.log('No file selected, resetting preview');
    preview.src = '#';
    preview.classList.add('hidden');
  }
}
   document.getElementById('hinh_anh')?.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file?.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const preview = document.getElementById('image_preview');
                preview.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

// Cập nhật hàm loadEditCategoryPage để sử dụng editCategoryForm
async function loadEditCategoryPage(id, element) {
  console.log('loadEditCategoryPage called with ID:', id);

  try {
    const response = await fetch(`/admin/loai-mon/edit/${id}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    const result = await response.json();
    console.log('Server response:', result);

    if (!response.ok) {
      alert(result.message || `Lỗi khi lấy dữ liệu loại món (Mã lỗi: ${response.status})`);
      return;
    }

    const modal = document.getElementById('editModal');
    const editCategoryForm = document.getElementById('editCategoryForm');
    if (!modal || !editCategoryForm) {
      console.error('Edit modal or form not found!');
      alert('Lỗi: Không tìm thấy modal hoặc form sửa!');
      return;
    }

    // Set form action and method for PUT request
    editCategoryForm.action = `/admin/loai-mon/${id}`;
    editCategoryForm.method = 'POST'; // Use POST in HTML, override with _method in formData
    modal.classList.remove('hidden');

    const editIdInput = document.getElementById('editId');
    const editTenLoaiInput = document.getElementById('editTenLoai');
    const editSlugInput = document.getElementById('editSlug');
    const currentHinhAnh = document.getElementById('currentHinhAnh');
    const editImagePreview = document.getElementById('editImagePreview');

    if (!editIdInput || !editTenLoaiInput || !editSlugInput || !currentHinhAnh || !editImagePreview) {
      console.error('Form fields not found!');
      alert('Lỗi: Không tìm thấy các trường form!');
      return;
    }

    editIdInput.value = result.ID_CHINH_LM || '';
    editTenLoaiInput.value = result.TEN_LM || '';
    editSlugInput.value = result.SLUG_LM || '';

    if (result.HINH_ANH_LM_URL && result.HINH_ANH_LM_URL.trim()) {
      currentHinhAnh.src = result.HINH_ANH_LM_URL;
      currentHinhAnh.classList.remove('hidden');
    } else {
      currentHinhAnh.src = '';
      currentHinhAnh.classList.add('hidden');
    }
    editImagePreview.src = '#';
    editImagePreview.classList.add('hidden');

    console.log('Form values set:', {
      id: editIdInput.value,
      TEN_LM: editTenLoaiInput.value,
      SLUG_LM: editSlugInput.value,
      hinh_anh: currentHinhAnh.src,
    });
  } catch (error) {
    console.error('Lỗi khi tải dữ liệu loại món:', error);
    alert('Lỗi server: ' + (error.message || 'Không thể kết nối tới server'));
  }
}

function bindEventListeners() {
  // Form thêm loại món
  const addCategoryForm = document.getElementById('addCategoryForm');
  if (addCategoryForm) {
    addCategoryForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      console.log('addCategoryForm submitted');

      const formData = new FormData(addCategoryForm);
      const ten_lm = formData.get('TEN_LM')?.trim();
      if (!ten_lm) {
        alert('Vui lòng nhập tên loại món!');
        return;
      }

      try {
        const response = await fetch('/admin/loai-mon', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();
        if (response.ok) {
          alert('Thêm loại món thành công!');
          closeAddModal();
          loadPage('/admin/loai-mon?page=1', document.querySelector('#content'));
        } else {
          alert(result.message || 'Đã xảy ra lỗi');
        }
      } catch (error) {
        console.error('Lỗi khi thêm loại món:', error);
        alert('Lỗi server: ' + error.message);
      }
    });

    const addHinhAnhInput = document.getElementById('addHinhAnh');
    if (addHinhAnhInput) {
      addHinhAnhInput.addEventListener('change', () => {
        previewImage(addHinhAnhInput, 'addImagePreview');
      });
    }
  } else {
    console.error('addCategoryForm not found');
  }

  // Form sửa/thêm loại món (sử dụng cùng modal)
const editCategoryForm = document.getElementById('editCategoryForm');
if (editCategoryForm) {
  console.log('Gắn sự kiện submit cho editCategoryForm');
  editCategoryForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Ngăn hành vi mặc định của form
    console.log('Form submit được gọi cho editCategoryForm');

    const formData = new FormData(editCategoryForm);
    const id = formData.get('id_chinh');
    const ten_lm = formData.get('TEN_LM')?.trim();
    const slug_lm = formData.get('SLUG_LM')?.trim();

    if (!ten_lm) {
      alert('Vui lòng nhập tên loại món!');
      return;
    }

    if (!id || isNaN(id)) {
      alert('ID loại món không hợp lệ!');
      return;
    }

    const url = `/admin/loai-mon/${id}`;
    console.log(`Gửi yêu cầu PUT tới: ${url}`);
    console.log('Dữ liệu gửi:', {
      TEN_LM: ten_lm,
      SLUG_LM: slug_lm,
      hinh_anh: formData.get('hinh_anh') ? formData.get('hinh_anh').name : 'No file selected',
    });

    try {
      const response = await fetch(url, {
        method: 'PUT', // Luôn gửi PUT
        body: formData,
      });

      const result = await response.json();
      console.log('Server Response:', result);
      if (response.ok) {
        alert('Cập nhật loại món thành công!');
        closeEditModal();
        loadPage('/admin/loai-mon?page=1', document.querySelector('#content'));
      } else {
        alert(result.message || 'Lỗi khi cập nhật loại món');
      }
    } catch (err) {
      console.error('Lỗi:', err);
      alert('Lỗi server: ' + err.message);
    }
  });

  const editHinhAnhInput = document.getElementById('editHinhAnh');
  if (editHinhAnhInput) {
    editHinhAnhInput.addEventListener('change', () => {
      previewImage(editHinhAnhInput, 'editImagePreview');
    });
  }
} else {
  console.error('editCategoryForm not found');
}
}

function closeAddModal() {
  document.getElementById('addModal').classList.add('hidden');
  document.getElementById('addCategoryForm').reset();
  const addImagePreview = document.getElementById('addImagePreview');
  addImagePreview.src = '#';
  addImagePreview.classList.add('hidden');
}

function closeEditModal() {
  document.getElementById('editModal').classList.add('hidden');
  document.getElementById('editCategoryForm').reset();
  document.getElementById('currentHinhAnh').classList.add('hidden');
  const editImagePreview = document.getElementById('editImagePreview');
  editImagePreview.src = '#';
  editImagePreview.classList.add('hidden');
}

function confirmDeleteCategory(id) {
  if (confirm('Bạn có chắc muốn xóa loại món này?')) {
    fetch(`/admin/loai-mon/${id}`, {
      method: 'DELETE',
    })
      .then(response => response.json())
      .then(result => {
        if (result.message) {
          alert(result.message);
          loadPage('/admin/loai-mon?page=1', document.querySelector('#content'));
        } else {
          alert('Lỗi khi xóa loại món');
        }
      })
      .catch(error => {
        console.error('Lỗi khi xóa loại món:', error);
        alert('Lỗi server: ' + error.message);
      });
  }
}
// tìm món ăn Ẩn/hiện danh sách món ăn theo loại món
function toggleRecipes(groupId) {
    const rows = document.querySelectorAll(`.recipe-row[data-group="${groupId}"]`);
    rows.forEach(row => {
      row.classList.toggle("hidden");
    });
  }
 function filterRecipes() {
    const input = document.getElementById("searchRecipe").value.toLowerCase().trim();
    const allRows = document.querySelectorAll(".recipe-row");
    let count = 0;

    allRows.forEach(row => {
      const tenMonAn = row.cells[1].textContent.toLowerCase(); // cột Tên Món Ăn
      if (tenMonAn.includes(input)) {
        row.classList.remove("hidden");
        count++;
      } else {
        row.classList.add("hidden");
      }
    });

    document.getElementById("totalRecipes").textContent = count;
  }

document.addEventListener('DOMContentLoaded', () => {
  bindEventListeners();
  console.log('DOM loaded, event listeners bound');
});