console.log("script.js đã tải thành công!");
// console.log("User hiện tại:", req.user);
// Hàm tải trang bằng AJAX
function loadPage(url, element) {
    console.log("🔄 Bắt đầu tải trang từ URL:", url);
    const content = document.querySelector("#content");

    if (!content) {
        console.error("❌ Không tìm thấy phần tử #content trong DOM");
        return;
    }

    content.innerHTML = '<div class="text-center py-8 text-yellow-600">⏳ Đang tải...</div>';

    fetch(url, {
        headers: {
            'Accept': 'text/html'
        }
    })
    .then(async (response) => {
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Lỗi HTTP ${response.status}:`, errorText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.text();
    })
    .then((data) => {
        console.log("📦 HTML trả về (đã cắt):", data.slice(0, 500), "...");

        const parser = new DOMParser();
        const doc = parser.parseFromString(data, "text/html");
        const newContentHTML = doc.querySelector("#content")?.innerHTML;

        if (newContentHTML) {
            content.innerHTML = newContentHTML; // <--- Dòng này thay thế nội dung DOM cũ

            // ***** DÒNG CỰC KỲ QUAN TRỌNG *****
            // Gọi lại hàm gắn tất cả các sự kiện cần thiết cho nội dung mới được tải
            // Bao gồm sự kiện cho các nút Sửa/Xóa và sự kiện submit của form modal
            bindUserEventListeners(); // Hãy đảm bảo hàm này tìm và gắn sự kiện cho CÁC NÚT trong bảng VÀ form
            // **********************************

        } else {
            content.innerHTML = '<div class="text-center py-8 text-red-600">⚠️ Không tìm thấy nội dung để hiển thị.</div>';
        }

        document.querySelectorAll(".sidebar-item").forEach((item) => {
            item.classList.remove("active");
        });
        if (element) {
            element.classList.add("active");
        }

        window.history.pushState({ path: url }, "", url);

        if (typeof initializePage === 'function') {
            initializePage(url);
        }
    })
    .catch((err) => {
        console.error("🚨 Lỗi fetch hoặc DOM:", err);
        content.innerHTML = `
            <div class="bg-red-100 text-red-700 p-4 rounded-lg mt-4 shadow">
              ❌ Không thể tải trang: <strong>${err.message}</strong><br>
              🔍 Kiểm tra xem file EJS có bị lỗi hoặc thiếu không.<br>
            </div>`;
    });
}

// Xử lý dropdown avatar
const avatar = document.getElementById("user-avatar");
const dropdown = document.getElementById("user-dropdown");

document.addEventListener("click", function (e) {
  if (avatar && dropdown) {
    if (avatar.contains(e.target)) {
      dropdown.classList.toggle("hidden");
    } else {
      dropdown.classList.add("hidden"); // Ẩn nếu click ra ngoài
    }
  }
});

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
    
  document.querySelectorAll('.tom-select').forEach((el) => {
  if (el.tomselect) {
    el.tomselect.destroy(); // ✅ Xóa instance cũ nếu có
  }

  new TomSelect(el, {
    create: false,
    maxOptions: 500,
    allowEmptyOption: true,
    placeholder: 'Tìm hoặc chọn nguyên liệu...'
  });
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
  const template = document.getElementById('template_nguyen_lieu');

  if (!template) {
    console.error("❌ Không tìm thấy template_nguyen_lieu");
    return;
  }

  const clone = template.content.cloneNode(true);
  const item = clone.querySelector('.nguyen_lieu_item');

  const select = item.querySelector('select[name="nguyen_lieu_id[]"]');
  if (select) {
    const ts = new TomSelect(select, {
      create: false,
      maxOptions: 500,
      allowEmptyOption: true,
      placeholder: 'Tìm hoặc chọn nguyên liệu...'
    });

    ts.on('change', () => onNguyenLieuChange(select));
  }

  container.appendChild(clone);
}

  function removeVideo() {
    const video = document.getElementById('video_preview');
    const removeInput = document.getElementById('remove_video');

    // Ẩn video
    video.src = '';
    video.style.display = 'none';

    // Đánh dấu cần xoá video khi submit
    if (removeInput) {
      removeInput.value = '1';
    }
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
// Reset form tìm kiếm
function resetSearchForm() {
  const searchForm = document.getElementById('searchForm');
  searchForm.reset();
  loadPage('/admin/cong-thuc?page=1', document.querySelector('#content'));
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
    btnNextStep.addEventListener("click", () => {
      step1.classList.add("hidden");
      step2.classList.remove("hidden");
    });
  }

  if (btnPrevStep && step1 && step2) {
    btnPrevStep.addEventListener("click", () => {
      step2.classList.add("hidden");
      step1.classList.remove("hidden");
    });
  }
document.querySelectorAll('.tom-select').forEach((el) => {
  if (!el.tomselect) {
    const tom = new TomSelect(el, {
      create: false,
      maxOptions: 500,
      allowEmptyOption: true,
      placeholder: 'Tìm hoặc chọn nguyên liệu...'
    });

    tom.on('change', () => onNguyenLieuChange(el));
  }
});

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

            const method = recipeId ? "PUT" : "POST";
            const url = recipeId ? `/admin/cong-thuc/${recipeId}` : "/admin/cong-thuc";

            try {
                const res = await fetch(url, {
                    method,
                    body: formData,
                });

                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.message || "Lỗi từ server");
                }

                console.log("Response:", data);
                showAdminNotification(recipeId ? "Cập nhật công thức thành công!" : "Thêm công thức thành công!", "success");
                loadPage("/admin/cong-thuc", document.querySelector("#content"));
            } catch (err) {
                console.error("Lỗi gửi form:", err);
                showError("Đã xảy ra lỗi: " + err.message);
            }
        });
    }
}

function showError(message) {
  const errorContainer = document.getElementById("errorContainer");
  if (!errorContainer) {
    console.error("Không tìm thấy #errorContainer trong DOM");
    alert(message); // Fallback: dùng alert nếu không có errorContainer
    return;
  }

  const errorElement = document.createElement("div");
  errorElement.className = "bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4";
  errorElement.textContent = message;
  errorContainer.prepend(errorElement);

  setTimeout(() => {
    errorElement.remove();
  }, 5000);
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
  instructions.classList.toggle("hidden");
  toggleIcon.classList.toggle("rotate-180");
}

async function confirmDelete(id) {
  if (confirm("Bạn có chắc muốn xóa công thức này?")) {
    try {
      const res = await fetch(`/admin/cong-thuc/${id}`, {
        method: "DELETE",
        headers: {
          "X-Requested-With": "XMLHttpRequest",
        },
      });

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        const text = await res.text();
        throw new Error("Server không trả về JSON hợp lệ: " + text);
      }

      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Có lỗi từ server.");

      showAdminNotification("Xóa công thức thành công!", "success");
      loadPage("/admin/cong-thuc", document.querySelector("#content"));
    } catch (err) {
      console.error("Lỗi xóa công thức:", err);
      showError("Đã xảy ra lỗi: " + err.message);
    }
  }
}

async function confirmApprove(id) {
    if (confirm('Bạn có chắc muốn duyệt công thức này?')) {
        try {
            const res = await fetch(`/admin/cong-thuc/approve/${id}`, {
                method: 'PUT',
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

            showAdminNotification('Duyệt công thức thành công!', 'success');
            loadPage('/admin/cong-thuc', document.querySelector('#content'));
        } catch (err) {
            console.error('Lỗi duyệt công thức:', err);
            showError('Đã xảy ra lỗi: ' + err.message);
        }
    }
}

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
    }, 10); // delay nhỏ để kích hoạt animation

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

// Hàm khởi tạo trang
function initializePage(url) {
  console.log("Khởi tạo trang với URL:", url);

  if (url.includes('/admin/cong-thuc/add') || url.includes('/admin/cong-thuc/edit')) {
    initializeAddRecipe();
    return;
  }

  if (url.includes('/admin/cong-thuc')) {
    initializeRecipesList();
    return;
  }

  const routeHandlers = [
    { path: '/admin/loai-mon', handler: bindEventListeners, name: 'bindEventListeners' },
    { path: '/admin/mon-an', handler: bindDishEventListeners, name: 'bindDishEventListeners' },
    { path: '/admin/nguyen-lieu', handler: bindEvennguyenlieutListeners, name: 'bindEvennguyenlieutListeners' },
    { path: '/admin/nguoi-dung', handler: bindUserEventListeners, name: 'bindUserEventListeners' },
    { path: '/admin/yeu-thich', handler: bindFavoriteEventListeners, name: 'bindFavoriteEventListeners' },
    { path: '/admin/danh-gia', handler: binddanhgiaEventListeners, name: 'binddanhgiaEventListeners' },
    { path: '/admin/binh-luan', handler: bindbinhluanEventListeners, name: 'bindbinhluanEventListeners' },
    { path: '/admin/phan-hoi-binh-luan', handler: bindphbinhluanEventListeners, name: 'bindphbinhluanEventListeners' },
    { path: '/admin/binh-luan-cam-xuc', handler: bindCamXucBinhLuanEventListeners, name: 'bindCamXucBinhLuanEventListeners' },
    { path: '/admin/phan-hoi-cam-xuc', handler: bindPhanHoiCamXucEventListeners, name: 'bindPhanHoiCamXucEventListeners' },
    { path: '/admin/trang-ca-nhan', handler: bindTrangCaNhanEventListeners, name: 'bindTrangCaNhanEventListeners' },
    { path: '/admin/thong-bao', handler: bindThongBaoEventListeners, name: 'bindThongBaoEventListeners' }
  ];

  let matched = false;

  for (const route of routeHandlers) {
    if (url.includes(route.path)) {
      if (typeof route.handler === 'function') {
        route.handler();
        console.log(`✅ Đã gọi ${route.name} cho ${route.path}`);
      } else {
        console.warn(`⚠️ Hàm ${route.name} không được định nghĩa.`);
      }
      matched = true;
      break;
    }
  }

  if (!matched) {
    console.warn("❌ Không có route phù hợp trong initializePage");
  }
}

document.addEventListener('DOMContentLoaded', () => {
    updateStepNumbers();
    initializePage(window.location.pathname);
    document.querySelectorAll('.reply-content').forEach(td => {
      const depth = parseInt(td.getAttribute('data-depth')) || 0;
      td.style.paddingLeft = `${depth * 24}px`;
    });
    const currentPath = window.location.pathname;
    console.log("URL hiện tại:", currentPath);

    // Kiểm tra nếu là route admin, tải lại nội dung
    if (currentPath.startsWith("/admin")) {
      loadPage(currentPath, document.querySelector(`a[href="${currentPath}"]`) || null);
    } else {
      // Fallback về trang admin mặc định nếu không phải route admin
      loadPage("/admin", document.querySelector(`a[href="/admin"]`));
    }

    // Xử lý popstate cho back/forward
    window.addEventListener("popstate", (event) => {
      const path = event.state ? event.state.path : "/admin";
      console.log("Popstate với URL:", path);
      loadPage(path, document.querySelector(`a[href="${path}"]`) || null);
    });
     
  
});

