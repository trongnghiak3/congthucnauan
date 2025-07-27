console.log("js dang cong thuc da hoat dong");

function showAdminNotification(message, type = 'success') {
  const notif = document.getElementById('admin-notification');
  if (!notif) {
    console.error('Phần tử admin-notification không tồn tại!');
    alert(message);
    return;
  }
  notif.innerHTML = '';

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

  notif.className = `fixed top-5 right-5 z-50 flex items-start gap-3 px-4 py-3 rounded-xl text-white shadow-xl transform transition-all duration-300 ease-in-out opacity-0 ${bgColors[type] || bgColors.success}`;
  notif.innerHTML = `
    <div class="text-2xl">${icons[type] || icons.success}</div>
    <div class="text-sm font-medium">${message}</div>
  `;

  notif.classList.remove('hidden');
  setTimeout(() => {
    notif.classList.add('opacity-100', 'translate-y-0');
  }, 10);

  setTimeout(() => {
    notif.classList.remove('opacity-100');
    notif.classList.add('opacity-0');
  }, 3000);

  setTimeout(() => {
    notif.classList.add('hidden');
  }, 3500);
}

function showError(message) {
  showAdminNotification(message, 'error');
}

function removeVideo() {
  const video = document.getElementById('video_preview');
  const removeInput = document.getElementById('remove_video');
  const removeBtn = document.getElementById('remove_video_btn');
  if (video && removeInput && removeBtn) {
    video.src = '';
    video.style.display = 'none';
    removeInput.value = '1';
    removeBtn.classList.add('hidden');
  }
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

async function deleteRecipe(recipeId) {
  if (confirm('Bạn có chắc muốn xóa công thức này?')) {
    try {
      const res = await fetch(`/dang-cong-thuc/${recipeId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Lỗi khi xóa công thức');
      }
      showAdminNotification('Xóa công thức thành công!', 'success');
      setTimeout(() => {
        window.location.href = '/cong-thuc-cua-toi';
      }, 3500);
    } catch (err) {
      console.error('Lỗi xóa công thức:', err);
      showError('Đã xảy ra lỗi: ' + err.message);
    }
  }
}

function initializeAddRecipe() {
  console.log("Khởi tạo biểu mẫu đăng công thức");
  const form = document.getElementById('add-recipe-form');
  const step1 = document.getElementById('step1');
  const step2 = document.getElementById('step2');
  const btnNextStep = document.getElementById('btnNextStep');
  const btnPrevStep = document.getElementById('btnPrevStep');
  const btnDeleteRecipe = document.getElementById('btnDeleteRecipe');
  const recipeId = form?.dataset.recipeId;
  const maxFileSize = 100 * 1024 * 1024; // 100MB in bytes
  const imageInput = document.getElementById('hinh_anh');
  const videoInput = document.getElementById('video_file');

  if (!form) {
    console.error("Không tìm thấy form với ID 'add-recipe-form'");
    return;
  }
  if (!imageInput || !videoInput) {
    console.error("Không tìm thấy input hinh_anh hoặc video_file!");
    return;
  }

  if (btnNextStep && step1 && step2) {
    btnNextStep.addEventListener("click", () => {
      // Validate step1 trước khi chuyển sang step2
      const tenCt = form.querySelector('input[name="TEN_CT"]')?.value.trim();
      const moTa = form.querySelector('textarea[name="MOTA"]')?.value.trim();
      const idChinhMa = form.querySelector('select[name="ID_CHINH_MA"]')?.value;
      if (!tenCt || !moTa || !idChinhMa) {
        showError("Vui lòng điền đầy đủ tên công thức, mô tả, và loại món ăn trước khi chuyển bước!");
        return;
      }
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

  imageInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file?.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const preview = document.getElementById('image_preview');
        if (preview) {
          preview.src = e.target.result;
        }
      };
      reader.readAsDataURL(file);
    }
  });

  videoInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file?.type === 'video/mp4') {
      const preview = document.getElementById('video_preview');
      const removeBtn = document.getElementById('remove_video_btn');
      if (preview && removeBtn) {
        preview.src = URL.createObjectURL(file);
        removeBtn.classList.remove('hidden');
      }
    }
  });

  if (btnDeleteRecipe && recipeId) {
    btnDeleteRecipe.addEventListener('click', () => deleteRecipe(recipeId));
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const formData = new FormData(form);
    const removeVideoInput = document.getElementById('remove_video');

    // Kiểm tra các trường bắt buộc
    const tenCt = formData.get('TEN_CT')?.trim();
    const moTa = formData.get('MOTA')?.trim();
    const idChinhMa = formData.get('ID_CHINH_MA');
    const thoiGianNau = formData.get('THOI_GIAN_NAU')?.trim();
    const doKho = formData.get('DO_KHO')?.trim();
    const soPhanAn = formData.get('SO_PHAN_AN')?.trim();

    if (!tenCt) {
      showError("Vui lòng nhập tên công thức!");
      return;
    }
    if (!moTa) {
      showError("Vui lòng nhập mô tả!");
      return;
    }
    if (!idChinhMa) {
      showError("Vui lòng chọn loại món ăn!");
      return;
    }
    if (!thoiGianNau || isNaN(thoiGianNau) || parseFloat(thoiGianNau) <= 0) {
      showError("Thời gian nấu phải là số hợp lệ và lớn hơn 0!");
      return;
    }
    if (!doKho) {
      showError("Vui lòng chọn độ khó!");
      return;
    }
    if (!soPhanAn || isNaN(soPhanAn) || parseFloat(soPhanAn) <= 0) {
      showError("Số phần ăn phải là số hợp lệ và lớn hơn 0!");
      return;
    }

    // Kiểm tra kích thước file
    if (imageInput.files.length > 0 && imageInput.files[0].size > maxFileSize) {
      showError("Hình ảnh quá lớn! Kích thước tối đa là 100MB.");
      return;
    }
    if (videoInput.files.length > 0 && videoInput.files[0].size > maxFileSize) {
      showError("Video quá lớn! Kích thước tối đa là 100MB.");
      return;
    }

    // Xử lý remove_video
    if (removeVideoInput && removeVideoInput.value === '1') {
      formData.append('remove_video', '1');
    }

    // Kiểm tra nguyên liệu
    const nguyenLieuContainer = document.getElementById('nguyen_lieu_container');
    const items = nguyenLieuContainer.querySelectorAll('.nguyen_lieu_item');
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

      const sl = soLuong.value.trim();
      if (!sl || isNaN(sl) || parseFloat(sl) <= 0) {
        showError("Số lượng nguyên liệu phải là số hợp lệ và lớn hơn 0!");
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
      showError("Vui lòng thêm ít nhất một nguyên liệu hợp lệ!");
      return;
    }

    // Kiểm tra bước nấu
    const buocNauContainer = document.getElementById('buoc_nau_container');
    const steps = buocNauContainer.querySelectorAll('.buoc_nau_item');
    if (steps.length === 0) {
      showError("Vui lòng thêm ít nhất một bước nấu!");
      return;
    }

    for (const step of steps) {
      const tenBuoc = step.querySelector('input[name="ten_buoc[]"]').value.trim();
      const moTaBuoc = step.querySelector('textarea[name="buoc_nau[]"]').value.trim();
      if (!tenBuoc || !moTaBuoc) {
        showError("Tên bước và mô tả bước là bắt buộc!");
        return;
      }
    }

    // Log FormData để debug
    console.log('FormData gửi đi:');
    for (const [key, value] of formData.entries()) {
      console.log(`${key}: ${value}`);
    }

    try {
      const url = recipeId ? `/dang-cong-thuc/${recipeId}` : '/dang-cong-thuc';
      const method = recipeId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method: method,
        body: formData,
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Lỗi từ server");
      }

      showAdminNotification(
        recipeId ? "Cập nhật công thức thành công!" : "Đăng công thức thành công! Vui lòng chờ duyệt.",
        "success"
      );
      setTimeout(() => {
        window.location.href = '/cong-thuc-cua-toi';
      }, 3500);
    } catch (err) {
      console.error("Lỗi gửi form:", err);
      showError("Đã xảy ra lỗi: " + err.message);
    }
  });
}

document.addEventListener('DOMContentLoaded', initializeAddRecipe);