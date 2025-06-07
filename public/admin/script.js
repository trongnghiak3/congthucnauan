console.log("script.js đã tải thành công!");
    // function showTab(tabId) {
    //   // Ẩn tất cả các tab
    //   document.querySelectorAll('.tab-content').forEach(tab => {
    //     tab.classList.add('hidden');
    //   });

    //   // Hiển thị tab được chọn
    //   document.getElementById(tabId).classList.remove('hidden');

    //   // Cập nhật trạng thái nút tab
    //   document.querySelectorAll('.tab-button').forEach(button => {
    //     button.classList.remove('bg-yellow-500', 'text-white');
    //     button.classList.add('bg-gray-200', 'text-gray-700');
    //   });

    //   const activeButton = document.querySelector(`button[onclick="showTab('${tabId}')"]`);
    //   activeButton.classList.remove('bg-gray-200', 'text-gray-700');
    //   activeButton.classList.add('bg-yellow-500', 'text-white');

    //   // Cập nhật tiêu đề
    //   document.querySelector('h1').textContent = tabId === 'ingredients' ? 'Danh Sách Nguyên Liệu' : 'Danh Sách Công Thức Nguyên Liệu';
    // }

    // function loadPage(url) {
    //   window.location.href = url;
    // }
function loadPage(url, element) {
    console.log("Bắt đầu tải trang từ URL: " + url);
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then(data => {
            console.log("Nội dung nhận được: " + data.substring(0, 100) + "...");
            document.querySelector("#content").innerHTML = data;
            console.log("Chèn nội dung vào #content...");
            // Cập nhật URL trình duyệt mà không reload trang
            window.history.pushState({ path: url }, '', url);
            try {
                initializePage(url);
            } catch (e) {
                console.error("Không tìm thấy hàm initializePage: ", e);
            }
        })
        .catch(err => console.error("Lỗi fetch: ", err));
}

function initializeRecipesList() {
    console.log("Khởi tạo sự kiện cho trang danh sách công thức...");
    const toggleButtons = document.querySelectorAll('button[onclick^="toggleInstructions"]');
    toggleButtons.forEach(button => {
        const recipeId = button.getAttribute('onclick').match(/'([^']+)'/)[1];
        button.onclick = () => toggleInstructions(recipeId);
    });

    const deleteButtons = document.querySelectorAll('button[onclick^="confirmDelete"]');
    deleteButtons.forEach(button => {
        const recipeId = button.getAttribute('onclick').match(/'([^']+)'/)[1];
        button.onclick = () => confirmDelete(recipeId);
    });
}

function onNguyenLieuChange(select) {
    const parent = select.closest('.nguyen_lieu_item');
    const donViInput = parent.querySelector('input[name="don_vi[]"]');
    const inputKhac = parent.querySelector('input[name="ten_nguyen_lieu_khac[]"]');
    const inputDonViKhac = parent.querySelector('input[name="don_vi_khac[]"]');

    if (select.value === 'khac') {
        inputKhac.classList.remove('hidden');
        inputKhac.required = true;
        inputDonViKhac.classList.remove('hidden');
        inputDonViKhac.required = true;
        donViInput.classList.add('hidden');
        donViInput.value = '';
    } else {
        const selectedOption = select.options[select.selectedIndex];
        const donVi = selectedOption.getAttribute('data-donvi') || '';
        donViInput.value = donVi;
        donViInput.classList.remove('hidden');
        inputKhac.classList.add('hidden');
        inputKhac.required = false;
        inputKhac.value = '';
        inputDonViKhac.classList.add('hidden');
        inputDonViKhac.required = false;
        inputDonViKhac.value = '';
    }
}

function addNguyenLieu() {
    const container = document.getElementById('nguyen_lieu_container');
    const template = container.querySelector('.nguyen_lieu_item');
    const item = template.cloneNode(true);

    item.querySelectorAll('input, select').forEach(el => {
        if (el.tagName === 'SELECT') {
            el.value = '';
            el.onchange = () => onNguyenLieuChange(el);
        } else {
            el.value = '';
            if (el.name === 'ten_nguyen_lieu_khac[]' || el.name === 'don_vi_khac[]') {
                el.classList.add('hidden');
                el.required = false;
            } else if (el.name === 'don_vi[]') {
                el.classList.remove('hidden');
                el.readOnly = true;
            } else if (el.name === 'so_luong[]') {
                el.required = true;
                el.min = '0.01';
            } else if (el.name === 'ghi_chu[]') {
                el.required = false;
            }
        }
    });

    container.appendChild(item);
}

function removeNguyenLieu(button) {
    const item = button.closest('.nguyen_lieu_item');
    if (document.querySelectorAll('.nguyen_lieu_item').length > 1) {
        item.remove();
    } else {
        showError("Phải có ít nhất một nguyên liệu!");
    }
}

function updateStepNumbers() {
    const steps = document.querySelectorAll('#buoc_nau_container .buoc_nau_item');
    steps.forEach((step, index) => {
        const stepNumberSpan = step.querySelector('.step-number');
        if (stepNumberSpan) {
            stepNumberSpan.textContent = (index + 1) + '.';
        }
    });
}

function addBuocNau() {
    const container = document.getElementById('buoc_nau_container');
    const newStep = document.createElement('div');
    newStep.className = 'buoc_nau_item space-y-2 relative flex flex-col';
    newStep.innerHTML = `
        <div class="flex items-center space-x-2">
            <span class="step-number font-bold text-yellow-600"></span>
            <input type="text" name="ten_buoc[]" placeholder="Tên bước..." class="flex-grow p-2 border rounded-lg" required>
            <button type="button" class="text-red-500 hover:text-red-700" onclick="removeBuocNau(this)">❌</button>
        </div>
        <textarea name="buoc_nau[]" rows="2" placeholder="Mô tả bước..." class="w-full p-2 border rounded-lg" required></textarea>
    `;
    container.appendChild(newStep);
    updateStepNumbers();
}

function removeBuocNau(btn) {
    const stepItem = btn.closest('.buoc_nau_item');
    if (document.querySelectorAll('.buoc_nau_item').length > 1) {
        stepItem.remove();
        updateStepNumbers();
    } else {
        showError("Phải có ít nhất một bước nấu!");
    }
}

function initializeAddRecipe() {
    console.log("Khởi tạo biểu mẫu thêm/chỉnh sửa công thức");
    const form = document.getElementById('add-recipe-form');
    const step1 = document.getElementById('step1');
    const step2 = document.getElementById('step2');
    const btnNextStep = document.getElementById('btnNextStep');
    const btnPrevStep = document.getElementById('btnPrevStep');
    const recipeId = form ? form.dataset.recipeId : '';

    if (btnNextStep && step1 && step2) {
        btnNextStep.addEventListener('click', () => {
            step1.style.display = 'none';
            step2.style.display = 'block';
        });
    }

    if (btnPrevStep && step1 && step2) {
        btnPrevStep.addEventListener('click', () => {
            step2.style.display = 'none';
            step1.style.display = 'block';
        });
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

        document.getElementById('video_file')?.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file?.type === 'video/mp4') {
                const preview = document.getElementById('video_preview');
                preview.src = URL.createObjectURL(file);
            }
        });

    if (form) {
        form.addEventListener('submit', async function (e) {
            e.preventDefault();
            const formData = new FormData(form);

            const loaiMonSelect = document.getElementById('loai_mon');
            const loaiMon = Array.from(loaiMonSelect.selectedOptions).map(option => option.value);
            if (loaiMon.length === 0) {
                return showError("Vui lòng chọn ít nhất một loại món!");
            }

            formData.delete('loai_mon[]');
            loaiMon.forEach(value => formData.append('loai_mon[]', value));

            const nguyenLieuContainer = document.getElementById('nguyen_lieu_container');
            const items = nguyenLieuContainer.querySelectorAll('.nguyen_lieu_item');
            if (items.length === 0) {
                return showError("Vui lòng thêm ít nhất một nguyên liệu!");
            }

            formData.delete('nguyen_lieu_id[]');
            formData.delete('ten_nguyen_lieu_khac[]');
            formData.delete('don_vi_khac[]');
            formData.delete('so_luong[]');
            formData.delete('ghi_chu[]');

            let hasValidIngredient = false;
            for (const item of items) {
                const select = item.querySelector('select[name="nguyen_lieu_id[]"]');
                const tenKhac = item.querySelector('input[name="ten_nguyen_lieu_khac[]"]');
                const donViKhac = item.querySelector('input[name="don_vi_khac[]"]');
                const soLuong = item.querySelector('input[name="so_luong[]"]');
                const ghiChu = item.querySelector('input[name="ghi_chu[]"]');

                const sl = soLuong.value.trim();
                if (!sl || isNaN(sl) || parseFloat(sl) <= 0) {
                    showError("Số lượng phải là số hợp lệ và lớn hơn 0!");
                    return;
                }

                if (select.value === 'khac') {
                    const ten = tenKhac.value.trim();
                    const donVi = donViKhac.value.trim();
                    if (!ten) {
                        showError("Vui lòng nhập tên nguyên liệu khác!");
                        return;
                    }
                    if (!donVi) {
                        showError("Vui lòng nhập đơn vị cho nguyên liệu khác!");
                        return;
                    }
                    formData.append('nguyen_lieu_id[]', '');
                    formData.append('ten_nguyen_lieu_khac[]', ten);
                    formData.append('don_vi_khac[]', donVi);
                } else if (select.value) {
                    formData.append('nguyen_lieu_id[]', select.value);
                    formData.append('ten_nguyen_lieu_khac[]', '');
                    formData.append('don_vi_khac[]', '');
                } else {
                    showError("Vui lòng chọn một nguyên liệu hợp lệ!");
                    return;
                }

                formData.append('so_luong[]', sl);
                formData.append('ghi_chu[]', ghiChu.value.trim());
                hasValidIngredient = true;
            }

            if (!hasValidIngredient) {
                return showError("Vui lòng thêm ít nhất một nguyên liệu hợp lệ!");
            }

            const buocNauContainer = document.getElementById('buoc_nau_container');
            const steps = buocNauContainer.querySelectorAll('.buoc_nau_item');
            if (steps.length === 0) {
                return showError("Vui lòng thêm ít nhất một bước nấu!");
            }

            for (const step of steps) {
                const tenBuoc = step.querySelector('input[name="ten_buoc[]"]').value.trim();
                const moTaBuoc = step.querySelector('textarea[name="buoc_nau[]"]').value.trim();
                if (!tenBuoc || !moTaBuoc) {
                    showError("Tên bước và mô tả bước là bắt buộc!");
                    return;
                }
            }

            console.log("FormData gửi đi:");
            for (const [key, val] of formData.entries()) {
                console.log(`${key}: ${val}`);
            }

            const method = recipeId ? 'PUT' : 'POST';
            const url = recipeId ? `/admin/recipes/${recipeId}` : '/admin/recipes';

            try {
                const res = await fetch(url, {
                    method,
                    body: formData,
                });

                const contentType = res.headers.get('content-type') || '';
                if (!contentType.includes('application/json')) {
                    const text = await res.text();
                    throw new Error('Server không trả về JSON hợp lệ: ' + text);
                }

                const result = await res.json();
                if (!res.ok) throw new Error(result.message || 'Có lỗi từ server.');

                alert(recipeId ? 'Cập nhật công thức thành công!' : 'Thêm công thức thành công!');
               loadPage('/admin/recipes', document.querySelector('#content'));
            } catch (err) {
                console.error('Lỗi gửi form:', err);
                showError('Đã xảy ra lỗi: ' + err.message);
            }
        });
    }
}

function showError(msg) {
    let errorEl = document.getElementById('error-message');
    if (!errorEl) {
        errorEl = document.createElement('div');
        errorEl.id = 'error-message';
        errorEl.className = 'text-red-600 mt-2';
        document.getElementById('add-recipe-form').prepend(errorEl);
    }
    errorEl.textContent = msg;
}

function convertYouTubeUrl(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
        return `https://www.youtube.com/embed/${match[2]}`;
    }
    return null;
}

function toggleInstructions(recipeId) {
    const instructions = document.getElementById(`instructions-${recipeId}`);
    const toggleIcon = document.getElementById(`toggle-icon-${recipeId}`);
    instructions.classList.toggle('hidden');
    toggleIcon.classList.toggle('rotate-180');
}

async function confirmDelete(id) {
    if (confirm('Bạn có chắc muốn xóa công thức này?')) {
      try {
        const res = await fetch(`/admin/recipes/${id}`, {
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

        alert('Xóa công thức thành công!');
        // Tải lại danh sách công thức bằng loadPage
        loadPage('/admin/recipes', document.querySelector('#content'));
      } catch (err) {
        console.error('Lỗi xóa công thức:', err);
        showError('Đã xảy ra lỗi: ' + err.message);
      }
    }
  }
async function confirmApprove(id) {
    if (confirm('Bạn có chắc muốn duyệt công thức này?')) {
      try {
        const res = await fetch(`/admin/recipes/approve/${id}`, {
          method: 'PUT', // Sử dụng PUT để cập nhật trạng thái
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Content-Type': 'application/json'
          }
        });

        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          const text = await res.text();
          throw new Error('Server không trả về JSON hợp lệ: ' + text);
        }

        const result = await res.json();
        if (!res.ok) throw new Error(result.message || 'Có lỗi từ server.');

        alert('Duyệt công thức thành công!');
        loadPage('/admin/recipes', document.querySelector('#content'));
      } catch (err) {
        console.error('Lỗi duyệt công thức:', err);
        showError('Đã xảy ra lỗi: ' + err.message);
      }
    }
  }

function initializePage(url) {
    console.log("Khởi tạo trang với URL:", url);
    if (url.includes('/admin/recipes/add') || url.includes('/admin/recipes/edit')) {
        initializeAddRecipe();
    } else if (url.includes('/admin/recipes')) {
        initializeRecipesList();
    } else if (url.includes('/admin/ingredients') || url.includes('/admin/categories')) {
        if (typeof bindEventListeners === 'function') {
            bindEventListeners();
        } else {
            console.error('bindEventListeners not found');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    updateStepNumbers();
    initializePage(window.location.pathname);
});