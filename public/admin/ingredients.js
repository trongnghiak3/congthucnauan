  // Function to bind event listeners to forms
function bindEventListeners() {
    const addForm = document.getElementById('addIngredientForm');
    if (addForm) {
        addForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);
            try {
                const response = await fetch('/admin/nguyen-lieu', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });
                const result = await response.json();
                if (response.ok) {
                    alert('Thêm nguyên liệu thành công!');
                    closeAddModal();
                    loadPage('/admin/nguyen-lieu?page=1', document.querySelector('#content'));
                } else {
                    alert(result.message);
                }
            } catch (err) {
                console.error('Lỗi:', err);
                alert('Lỗi server: ' + err.message);
            }
        });
    } else {
        // console.error('addIngredientForm not found');
    }

    const editForm = document.getElementById('editIngredientForm');
      if (editForm) {
    console.log('Gắn sự kiện submit cho editIngredientForm');
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      console.log('Form submit được gọi');
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData);
      const id = data.id_chinh;
      const ten_nguyen_lieu = data.ten_nguyen_lieu;
      const don_vi = data.don_vi;

      // Kiểm tra dữ liệu
      if (!id || isNaN(id)) {
        alert('ID nguyên liệu không hợp lệ');
        return;
      }
      if (!ten_nguyen_lieu || !don_vi) {
        alert('Vui lòng điền đầy đủ tên nguyên liệu và đơn vị');
        return;
      }

      console.log('Yêu cầu PUT tới:', `/admin/nguyen-lieu/${id}`);
      console.log('Dữ liệu gửi:', { TEN_NL: ten_nguyen_lieu, DON_VI: don_vi });

      try {
        const response = await fetch(`/admin/nguyen-lieu/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            TEN_NL: ten_nguyen_lieu, // Sử dụng key khớp với backend
            DON_VI: don_vi,
          }),
        });

        const result = await response.json();
        if (response.ok) {
          alert('Cập nhật nguyên liệu thành công!');
          closeEditModal();
          loadPage('/admin/nguyen-lieu?page=1', document.querySelector('#content'));
        } else {
          alert(result.message);
        }
      } catch (err) {
        console.error('Lỗi:', err);
        alert('Lỗi server: ' + err.message);
      }
    });
  } else {
    // console.error('editIngredientForm not found');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  
    bindEventListeners();
});

  // Existing modal and tab functions
  function openAddModal() {
    document.getElementById('addModal').classList.remove('hidden');
    document.getElementById('addIngredientForm').reset();
  }

  function closeAddModal() {
    document.getElementById('addModal').classList.add('hidden');
  }

  function openEditModal(id, ten_nguyen_lieu, don_vi) {
    console.log('Mở modal chỉnh sửa với ID:', id); // Gỡ lỗi
    document.getElementById('editModal').classList.remove('hidden');
    document.getElementById('editId').value = id;
    document.getElementById('editTenNguyenLieu').value = decodeURIComponent(ten_nguyen_lieu);
    document.getElementById('editDonVi').value = decodeURIComponent(don_vi);
  }


  function closeEditModal() {
    document.getElementById('editModal').classList.add('hidden');
  }

  function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    document.getElementById(tabId).classList.remove('hidden');
    document.querySelectorAll('.tab-button').forEach(button => {
      button.classList.remove('bg-yellow-500', 'text-white');
      button.classList.add('bg-gray-200', 'text-gray-600');
      button.setAttribute('aria-selected', 'false');
    });
    const activeButton = document.getElementById(`tab-${tabId}`);
    activeButton.classList.remove('bg-gray-200', 'text-gray-600');
    activeButton.classList.add('bg-yellow-500', 'text-white');
    activeButton.setAttribute('aria-selected', 'true');
  }
async function confirmDeleteIngredient(id) {
  if (confirm('Bạn có chắc muốn xóa nguyên liệu này?')) {
    try {
      const res = await fetch(`/admin/nguyen-lieu/${id}`, {
        method: 'DELETE',
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await res.text();
        throw new Error('Server không trả về JSON hợp lệ: ' + text);
      }

      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Có lỗi từ server.');

      alert('Xóa nguyên liệu thành công!');
      loadPage('/admin/nguyen-lieu?page=1', document.querySelector('#content'));
    } catch (err) {
      console.error('Lỗi xóa nguyên liệu:', err);
      showError('Đã xảy ra lỗi: ' + err.message);
    }
  }
}

  function toggleIngredients(id) {
    const rows = document.querySelectorAll(`.ingredient-row[data-group='${id}']`);
    rows.forEach(row => {
      row.classList.toggle("hidden");
    });
  }
function filterRecipes() {
  const input = document.getElementById('searchRecipe').value.toLowerCase();
  const rows = document.querySelectorAll('#ingredient-recipes tbody tr');

  rows.forEach(row => {
    // Nếu là dòng tên công thức (có colspan), kiểm tra text
    if (row.querySelector('td[colspan="4"]')) {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(input) ? '' : 'none';

      // Ẩn/hiện các dòng nguyên liệu tương ứng theo group id
      const groupId = row.getAttribute('data-group-id') || row.querySelector('td[colspan="4"]').textContent.trim();
      const ingredientRows = document.querySelectorAll(`.ingredient-row[data-group="${groupId}"]`);
      ingredientRows.forEach(r => {
        r.style.display = text.includes(input) ? '' : 'none';
      });
    }
  });
}



// // Gọi updateStats sau khi load dữ liệu hoặc khi thay đổi
// updateStats();
