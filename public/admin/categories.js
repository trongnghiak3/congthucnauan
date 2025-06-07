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

// Cập nhật bindEventListeners để thêm sự kiện xem trước hình ảnh
function bindEventListeners() {
  // Form thêm loại món
  const addCategoryForm = document.getElementById('addCategoryForm');
  if (addCategoryForm) {
    addCategoryForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const formData = new FormData(addCategoryForm);

      const ten_loai = formData.get('ten_loai')?.trim();
      const slug = formData.get('slug')?.trim();
      if (!ten_loai || !slug) {
        alert('Vui lòng nhập đầy đủ tên loại món và slug!');
        return;
      }

      try {
        const response = await fetch('/admin/categories', {
          method: 'POST',
          body: formData, // Gửi FormData để hỗ trợ file upload
        });

        const result = await response.json();

        if (response.ok) {
          alert('Thêm loại món thành công!');
          closeAddModal?.();
          loadPage('/admin/categories?page=1', document.querySelector('#content'));
        } else {
          alert(result.message || 'Đã xảy ra lỗi');
        }
      } catch (error) {
        console.error('Lỗi khi thêm loại món:', error);
        alert('Lỗi server: ' + error.message);
      }
    });

    // Xem trước hình ảnh cho form thêm
    const addHinhAnhInput = document.getElementById('addHinhAnh');
    if (addHinhAnhInput) {
      addHinhAnhInput.addEventListener('change', () => {
        previewImage(addHinhAnhInput, 'addImagePreview');
      });
    }
  } else {
    console.error('addCategoryForm not found');
  }

  // Form sửa loại món
  const editCategoryForm = document.getElementById('editCategoryForm');
  if (editCategoryForm) {
    editCategoryForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const id = formData.get('id_chinh');

      console.log('Edit Form Data:', {
        id: id,
        ten_loai: formData.get('ten_loai'),
        slug: formData.get('slug'),
        hinh_anh: formData.get('hinh_anh'),
      });

      try {
        const response = await fetch(`/admin/categories/${id}`, {
          method: 'PUT',
          body: formData,
        });

        const result = await response.json();
        console.log('Server Response:', result);

        if (response.ok) {
          alert('Cập nhật loại món thành công!');
          closeEditModal();
          loadPage('/admin/categories?page=1', document.querySelector('#content'));
        } else {
          alert(result.message || 'Lỗi khi cập nhật loại món');
        }
      } catch (err) {
        console.error('Lỗi khi cập nhật loại món:', err);
        alert('Lỗi server: ' + err.message);
      }
    });

    // Xem trước hình ảnh cho form sửa
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

// Cập nhật closeAddModal để reset ảnh xem trước
function closeAddModal() {
  document.getElementById('addModal').classList.add('hidden');
  document.getElementById('addCategoryForm').reset();
  const addImagePreview = document.getElementById('addImagePreview');
  addImagePreview.src = '#';
  addImagePreview.classList.add('hidden');
}

// Cập nhật closeEditModal để reset ảnh xem trước
function closeEditModal() {
  document.getElementById('editModal').classList.add('hidden');
  document.getElementById('editCategoryForm').reset();
  document.getElementById('currentHinhAnh').classList.add('hidden');
  const editImagePreview = document.getElementById('editImagePreview');
  editImagePreview.src = '#';
  editImagePreview.classList.add('hidden');
}

// Cập nhật openEditModal để đảm bảo ảnh xem trước được reset
function openEditModal(id, tenLoaiEncoded, slugEncoded, hinhAnhEncoded) {
  document.getElementById('editModal').classList.remove('hidden');

  const tenLoai = decodeURIComponent(tenLoaiEncoded);
  const slug = decodeURIComponent(slugEncoded);
  const hinhAnh = decodeURIComponent(hinhAnhEncoded);

  document.getElementById('editId').value = id;
  document.getElementById('editTenLoai').value = tenLoai;
  document.getElementById('editSlug').value = slug;

  const currentHinhAnh = document.getElementById('currentHinhAnh');
  const editImagePreview = document.getElementById('editImagePreview');
  if (hinhAnh) {
    currentHinhAnh.src = hinhAnh;
    currentHinhAnh.classList.remove('hidden');
  } else {
    currentHinhAnh.classList.add('hidden');
  }
  // Reset ảnh xem trước khi mở modal
  editImagePreview.src = '#';
  editImagePreview.classList.add('hidden');
}

// Gọi khi trang đã load xong
document.addEventListener('DOMContentLoaded', () => {
  bindEventListeners();
});

// Hàm filterRecipes và toggleRecipes giữ nguyên
function filterRecipes() {
  const input = document.getElementById('searchRecipe').value.toLowerCase();
  const rows = document.querySelectorAll('#recipe-categories tbody tr.recipe-row');
  let total = 0;
  rows.forEach(row => {
    const recipeName = row.querySelector('td:nth-child(2)')?.textContent.toLowerCase();
    if (recipeName && recipeName.includes(input)) {
      row.classList.remove('hidden');
      total++;
    } else {
      row.classList.add('hidden');
    }
  });
  document.getElementById('totalRecipes').textContent = total;
}

function toggleRecipes(groupId) {
  const rows = document.querySelectorAll(`tr[data-group="${groupId}"]`);
  rows.forEach(row => {
    row.classList.toggle('hidden');
  });
}