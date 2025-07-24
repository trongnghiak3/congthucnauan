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
                'Accept': 'text/html',
                'X-Requested-With': 'XMLHttpRequest'
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
                if (url.includes('/admin/cong-thuc/add') || url.includes('/admin/cong-thuc/edit')) {
                    if (!data.includes('id="add-recipe-form"')) {
                        console.error("❌ HTML trả về không chứa #add-recipe-form");
                    }
                } else if (url.includes('/admin/cong-thuc')) {
                    if (!data.includes('id="searchForm"')) {
                        console.error("❌ HTML trả về không chứa #searchForm");
                    }
                }

                const parser = new DOMParser();
                const doc = parser.parseFromString(data, "text/html");
                const newContentHTML = doc.querySelector("#content")?.innerHTML;

                if (newContentHTML) {
                    content.innerHTML = newContentHTML;
                    if (url.includes('/admin/cong-thuc/add') || url.includes('/admin/cong-thuc/edit')) {
                        initializeAddRecipe();
                    } else if (url.includes('/admin/cong-thuc')) {
                        initializeRecipesList();
                    } else if (url.includes('/admin/nguoi-dung')) {
                        bindUserEventListeners();
                    } else {
                        initializePage(url);
                    }
                } else {
                    console.error("❌ Không tìm thấy #content trong HTML trả về");
                    content.innerHTML = '<div class="text-center py-8 text-red-600">⚠️ Không tìm thấy nội dung để hiển thị.</div>';
                }

                document.querySelectorAll(".sidebar-item").forEach((item) => {
                    item.classList.remove("active");
                });
                if (element) {
                    element.classList.add("active");
                }

                window.history.pushState({ path: url }, "", url);
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
function goToPage(pageNumber) {
    const url = new URL(window.location.href);
    url.searchParams.set('page', pageNumber); // Cập nhật tham số page
    const newUrl = url.pathname + url.search;
    loadPage(newUrl);
  }
function filterRecipes() {
    const searchForm = document.getElementById('searchForm');
    if (!searchForm) {
        console.error("❌ Không tìm thấy #searchForm trong DOM");
        showError("Không tìm thấy form tìm kiếm. Đang tải lại trang...");
        loadPage('/admin/cong-thuc?page=1', document.querySelector('#content'));
        return;
    }

    const inputSearch = document.getElementById("filterSearch");
    const inputDate = document.getElementById("filterDate");
    //   const inputUser = document.getElementById("filterUser");
    const inputFood = document.getElementById("filterFoodName");
    const inputCreator = document.getElementById("filterCreator"); // 🆕
    const inputStatus = document.getElementById("filterStatus");

    if (!inputSearch || !inputDate || !inputFood || !inputCreator) {
        console.error("❌ Thiếu một số input lọc.");
        showError("Lỗi tìm kiếm. Đang tải lại trang...");
        loadPage('/admin/cong-thuc?page=1', document.querySelector('#content'));
        return;
    }

    const searchValue = inputSearch.value.trim();
    const dateValue = inputDate.value;
    //   const userValue = inputUser.value.trim();
    const foodValue = inputFood.value.trim();
    const creatorValue = inputCreator.value || "";
    const statusValue = inputStatus.value || "";
    let url = "/admin/cong-thuc?page=1";
    if (searchValue) url += `&search=${encodeURIComponent(searchValue)}`;
    if (dateValue) url += `&date=${encodeURIComponent(dateValue)}`;
    //   if (userValue) url += `&user=${encodeURIComponent(userValue)}`;
    if (foodValue) url += `&food=${encodeURIComponent(foodValue)}`;
    if (creatorValue) url += `&creator=${encodeURIComponent(creatorValue)}`; // 🆕
    if (statusValue) url += `&status=${encodeURIComponent(statusValue)}`;
    loadPage(url, document.querySelector('#content'));
}
function resetSearchForm() {
    const searchForm = document.getElementById('searchForm');
    if (!searchForm) {
        console.error("❌ Không tìm thấy #searchForm trong DOM");
        showError("Không tìm thấy form tìm kiếm. Đang tải lại trang...");
        loadPage('/admin/cong-thuc?page=1', document.querySelector('#content'));
        return;
    }

    if (searchForm.tagName.toLowerCase() !== 'form') {
        console.error("❌ #searchForm không phải là phần tử <form>");
        showError("Lỗi cấu hình form tìm kiếm. Đang tải lại trang...");
        loadPage('/admin/cong-thuc?page=1', document.querySelector('#content'));
        return;
    }

    searchForm.reset(); // Đặt lại các trường input
    showAdminNotification("Đã đặt lại bộ lọc!", "success");
    loadPage('/admin/cong-thuc?page=1', document.querySelector('#content')); // Tải lại danh sách mặc định
}
function initializeRecipesList() {
    console.log("Khởi tạo sự kiện cho trang danh sách công thức...");

    // Các sự kiện hiện có
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
            el.tomselect.destroy();
        }
        new TomSelect(el, {
            create: false,
            maxOptions: 500,
            allowEmptyOption: true,
            placeholder: 'Tìm hoặc chọn nguyên liệu...'
        });
    });

    const filterButton = document.querySelector('button[onclick="filterRecipes()"]');
    if (filterButton) {
        filterButton.onclick = () => filterRecipes();
    } else {
        console.warn("⚠️ Không tìm thấy nút Lọc");
    }

    const resetButton = document.querySelector('button[onclick="resetSearchForm()"]');
    if (resetButton) {
        resetButton.onclick = () => resetSearchForm();
    } else {
        console.warn("⚠️ Không tìm thấy nút Đặt lại");
    }

    // Thêm sự kiện contextmenu cho bảng
    const table = document.getElementById('recipeTable');
    if (table) {
        table.addEventListener('contextmenu', (e) => {
            const row = e.target.closest('.recipe-row');
            if (!row) return;

            e.preventDefault(); // Ngăn menu mặc định của trình duyệt
            const contextMenu = document.getElementById('contextMenu');
            if (!contextMenu) {
                console.error("❌ Không tìm thấy #contextMenu trong DOM");
                showError("Không tìm thấy menu ngữ cảnh!");
                return;
            }

            // Lấy ID công thức từ cột đầu tiên (ID_CHINH_CT)
            const recipeId = row.querySelector('td').textContent.trim(); // Lấy nội dung cột đầu tiên
            contextMenu.dataset.recipeId = recipeId;

            // 👉 Xử lý role để ẩn/hiện nút chỉnh sửa
            const role = row.dataset.role;
            const editOption = document.querySelector('#contextMenu li[onclick="handleEdit()"]');
            if (editOption) {
                if (role === 'nguoidung') {
                    editOption.classList.add('hidden');
                } else {
                    editOption.classList.remove('hidden');
                }
            }
            // Hiển thị menu tại vị trí chuột
            contextMenu.classList.remove('hidden');
            const menuWidth = contextMenu.offsetWidth;
            const menuHeight = contextMenu.offsetHeight;
            let posX = e.pageX;
            let posY = e.pageY;

            // Đảm bảo menu không vượt ra ngoài màn hình
            if (posX + menuWidth > window.innerWidth) posX -= menuWidth;
            if (posY + menuHeight > window.innerHeight) posY -= menuHeight;

            contextMenu.style.top = `${posY}px`;
            contextMenu.style.left = `${posX}px`;
        });
    }

    // Ẩn menu khi nhấp ra ngoài
    document.addEventListener('click', () => {
        const contextMenu = document.getElementById('contextMenu');
        if (contextMenu) contextMenu.classList.add('hidden');
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
// Định nghĩa các hàm xử lý menu ở cấp cao nhất
function handleEdit() {
    const contextMenu = document.getElementById('contextMenu');
    const recipeId = contextMenu.dataset.recipeId;
    if (recipeId) {
        loadPage(`/admin/cong-thuc/edit/${recipeId}`, null);
    } else {
        showError("Không tìm thấy ID công thức để chỉnh sửa!");
    }
}

function handleApprove() {
    const contextMenu = document.getElementById('contextMenu');
    const recipeId = contextMenu.dataset.recipeId;
    if (recipeId) {
        confirmApprove(recipeId);
    } else {
        showError("Không tìm thấy ID công thức để duyệt!");
    }
}
function handleReject() {
  const contextMenu = document.getElementById('contextMenu');
  const recipeId = contextMenu.dataset.recipeId;

  if (!recipeId) {
    showError("Không tìm thấy ID công thức để từ chối!");
    return;
  }

  const reason = prompt('Nhập lý do từ chối công thức này:');

  if (reason === null) return; // Người dùng nhấn Cancel
  if (reason.trim() === '') {
    showError('Bạn cần nhập lý do từ chối!');
    return;
  }

  fetch(`/admin/cong-thuc/reject/${recipeId}`, {
    method: 'PUT',
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ ly_do_tu_choi: reason.trim() }) // Gửi lý do lên server
  })
    .then(async (response) => {
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Lỗi từ server: ${errorText}`);
      }
      return response.json();
    })
    .then(() => {
      showAdminNotification('Công thức đã bị từ chối!', 'success');
      loadPage('/admin/cong-thuc', document.querySelector('#content'));
    })
    .catch((err) => {
      console.error('Lỗi từ chối công thức:', err);
      showError('Đã xảy ra lỗi: ' + err.message);
    });
}

function handleDelete() {
    const contextMenu = document.getElementById('contextMenu');
    const recipeId = contextMenu.dataset.recipeId;
    if (recipeId) {
        confirmDelete(recipeId);
    } else {
        showError("Không tìm thấy ID công thức để xóa!");
    }
}


function initializeAddRecipe() {
    console.log("Khởi tạo biểu mẫu thêm/chỉnh sửa công thức");

    const form = document.getElementById('add-recipe-form');
    const step1 = document.getElementById('step1');
    const step2 = document.getElementById('step2');
    const btnNextStep = document.getElementById('btnNextStep');
    const btnPrevStep = document.getElementById('btnPrevStep');
    const hinhAnhInput = document.getElementById('hinh_anh');
    const videoFileInput = document.getElementById('video_file');
    const recipeId = form ? form.dataset.recipeId : '';

    // Kiểm tra sự tồn tại của các phần tử
    if (!form) console.error("❌ Không tìm thấy #add-recipe-form");
    if (!step1) console.error("❌ Không tìm thấy #step1");
    if (!step2) console.error("❌ Không tìm thấy #step2");
    if (!btnNextStep) console.error("❌ Không tìm thấy #btnNextStep");
    if (!btnPrevStep) console.error("❌ Không tìm thấy #btnPrevStep");
    if (!hinhAnhInput) console.error("❌ Không tìm thấy #hinh_anh");
    if (!videoFileInput) console.error("❌ Không tìm thấy #video_file");

    // Gắn sự kiện cho nút Tiếp theo
    if (btnNextStep && step1 && step2) {
        btnNextStep.addEventListener("click", () => {
            console.log("Chuyển sang bước 2");
            step1.classList.add("hidden");
            step2.classList.remove("hidden");
        });
    }

    // Gắn sự kiện cho nút Quay lại
    if (btnPrevStep && step1 && step2) {
        btnPrevStep.addEventListener("click", () => {
            console.log("Quay lại bước 1");
            step2.classList.add("hidden");
            step1.classList.remove("hidden");
        });
    }

    // Khởi tạo TomSelect
    document.querySelectorAll('.tom-select').forEach((el) => {
        if (el.tomselect) {
            el.tomselect.destroy();
            console.log("Đã xóa instance TomSelect cũ cho:", el);
        }
        const tom = new TomSelect(el, {
            create: false,
            maxOptions: 500,
            allowEmptyOption: true,
            placeholder: 'Tìm hoặc chọn nguyên liệu...'
        });
        tom.on('change', () => {
            console.log("Nguyên liệu thay đổi:", el.value);
            onNguyenLieuChange(el);
        });
    });

    // Gắn sự kiện cho input hình ảnh
    if (hinhAnhInput) {
        hinhAnhInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file?.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const preview = document.getElementById('image_preview');
                    if (preview) {
                        preview.src = e.target.result;
                        preview.classList.remove('hidden');
                        console.log("Hiển thị hình ảnh xem trước");
                    } else {
                        console.error("❌ Không tìm thấy #image_preview");
                    }
                };
                reader.readAsDataURL(file);
            } else {
                console.warn("⚠️ File hình ảnh không hợp lệ");
            }
        });
    }

    // Gắn sự kiện cho input video
    if (videoFileInput) {
        videoFileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file?.type === 'video/mp4') {
                const preview = document.getElementById('video_preview');
                if (preview) {
                    preview.src = URL.createObjectURL(file);
                    preview.classList.remove('hidden');
                    console.log("Hiển thị video xem trước");
                } else {
                    console.error("❌ Không tìm thấy #video_preview");
                }
            } else {
                console.warn("⚠️ File video không hợp lệ");
            }
        });
    }

    // Gắn sự kiện submit cho form
    if (form) {
        form.addEventListener('submit', async function (e) {
            e.preventDefault();
            console.log("Bắt đầu gửi form công thức");
            const formData = new FormData(form);

            const nguyenLieuContainer = document.getElementById('nguyen_lieu_container');
            const items = nguyenLieuContainer?.querySelectorAll('.nguyen_lieu_item') || [];
            if (items.length === 0) {
                showError("Vui lòng thêm ít nhất một nguyên liệu!");
                return;
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

                const sl = soLuong?.value.trim();
                if (!sl || isNaN(sl) || parseFloat(sl) <= 0) {
                    showError("Số lượng phải là số hợp lệ và lớn hơn 0!");
                    return;
                }

                if (select?.value === 'khac') {
                    const ten = tenKhac?.value.trim();
                    const donVi = donViKhac?.value.trim();
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
                } else if (select?.value) {
                    formData.append('nguyen_lieu_id[]', select.value);
                    formData.append('ten_nguyen_lieu_khac[]', '');
                    formData.append('don_vi_khac[]', '');
                } else {
                    showError("Vui lòng chọn một nguyên liệu hợp lệ!");
                    return;
                }

                formData.append('so_luong[]', sl);
                formData.append('ghi_chu[]', ghiChu?.value.trim() || '');
                hasValidIngredient = true;
            }

            if (!hasValidIngredient) {
                showError("Vui lòng thêm ít nhất một nguyên liệu hợp lệ!");
                return;
            }

            const buocNauContainer = document.getElementById('buoc_nau_container');
            const steps = buocNauContainer?.querySelectorAll('.buoc_nau_item') || [];
            if (steps.length === 0) {
                showError("Vui lòng thêm ít nhất một bước nấu!");
                return;
            }

            for (const step of steps) {
                const tenBuoc = step.querySelector('input[name="ten_buoc[]"]')?.value.trim();
                const moTaBuoc = step.querySelector('textarea[name="buoc_nau[]"]')?.value.trim();
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
    } else {
        console.error("❌ Không tìm thấy form #add-recipe-form để gắn sự kiện submit");
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
        console.log("Gọi initializeAddRecipe cho:", url);
        initializeAddRecipe();
        return;
    }

    if (url.includes('/admin/cong-thuc')) {
        console.log("Gọi initializeRecipesList cho:", url);
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
                console.log(`✅ Đã gọi ${route.name} cho ${route.path}`);
                route.handler();
            } else {
                console.warn(`⚠️ Hàm ${route.name} không được định nghĩa`);
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

