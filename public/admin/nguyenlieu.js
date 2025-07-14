// Function to bind event listeners to forms
function bindEvennguyenlieutListeners() {
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
                    showAdminNotification('Thêm nguyên liệu thành công!', 'success');
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
                        TEN_NL: ten_nguyen_lieu,
                        DON_VI: don_vi,
                    }),
                });

                const result = await response.json();
                if (response.ok) {
                    showAdminNotification('Cập nhật nguyên liệu thành công!', 'success');
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
    bindEvennguyenlieutListeners();
});

// Hàm thông báo tùy chỉnh
function showAdminNotification(message, type = 'success') {
    const notif = document.getElementById('admin-notification');
    notif.innerHTML = '';

    // Chọn icon và màu theo loại
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

    // Tạo nội dung
    notif.className = `fixed top-5 right-5 z-50 flex items-start gap-3 px-4 py-3 rounded-xl text-white shadow-xl transform transition-all duration-300 ease-in-out opacity-0 ${bgColors[type] || bgColors.success}`;
    notif.innerHTML = `
        <div class="text-2xl">${icons[type] || icons.success}</div>
        <div class="text-sm font-medium">${message}</div>
    `;

    // Hiện thông báo
    notif.classList.remove('hidden');
    setTimeout(() => {
        notif.classList.add('opacity-100', 'translate-y-0');
    }, 10);

    // Ẩn sau 3 giây
    setTimeout(() => {
        notif.classList.remove('opacity-100');
        notif.classList.add('opacity-0');
    }, 3000);

    // Ẩn hoàn toàn sau animation
    setTimeout(() => {
        notif.classList.add('hidden');
    }, 3500);
}

// Existing modal and tab functions
function openAddModal() {
    document.getElementById('addModal').classList.remove('hidden');
    document.getElementById('addIngredientForm').reset();
}

function closeAddModal() {
    document.getElementById('addModal').classList.add('hidden');
}

function openEditModal(id, ten_nguyen_lieu, don_vi) {
    console.log('Mở modal chỉnh sửa với ID:', id);
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

            showAdminNotification('Xóa nguyên liệu thành công!', 'success');
            loadPage('/admin/nguyen-lieu?page=1', document.querySelector('#content'));
        } catch (err) {
            console.error('Lỗi xóa nguyên liệu:', err);
            showError('Đã xảy ra lỗi: ' + err.message);
        }
    }
}

function toggleIngredients(groupId) {
    const rows = document.querySelectorAll(`.ingredient-row[data-group="${groupId}"]`);
    rows.forEach(row => row.classList.toggle('hidden'));
    console.log(`Chuyển đổi hiển thị nhóm nguyên liệu ID: ${groupId}`);
}

function filterRecipes() {
    const input = document.getElementById('searchRecipe').value.toLowerCase().trim();
    const totalRecipesEl = document.getElementById('totalRecipes');
    const allGroupRows = document.querySelectorAll('#ingredient-recipes tbody tr[data-group-id]');

    if (!totalRecipesEl) {
        console.error('Không tìm thấy #totalRecipes');
        return;
    }

    let visibleGroupCount = 0;

    allGroupRows.forEach(groupRow => {
        const groupId = groupRow.getAttribute('data-group-id');
        const recipeName = groupRow.textContent.toLowerCase().trim();
        const ingredientRows = document.querySelectorAll(`.ingredient-row[data-group="${groupId}"]`);

        let groupVisible = false;

        if (!input) {
            groupRow.style.display = '';
            ingredientRows.forEach(row => row.style.display = '');
            visibleGroupCount++;
        } else {
            const matchInRecipe = recipeName.includes(input);

            let matchInIngredients = false;
            ingredientRows.forEach(row => {
                const ingredientName = row.querySelector('td:nth-child(2)').textContent.toLowerCase().trim();
                const quantity = row.querySelector('td:nth-child(3)').textContent.toLowerCase().trim();
                const match = ingredientName.includes(input) || quantity.includes(input);
                row.style.display = match ? '' : 'none';
                if (match) matchInIngredients = true;
            });

            groupVisible = matchInRecipe || matchInIngredients;
            groupRow.style.display = groupVisible ? '' : 'none';
            if (groupVisible) visibleGroupCount++;
        }
    });

    totalRecipesEl.textContent = visibleGroupCount;
    console.log('Số công thức hiển thị:', visibleGroupCount);
}