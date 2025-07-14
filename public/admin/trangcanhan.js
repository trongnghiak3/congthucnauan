
  // Định nghĩa biến avatarUrl từ EJS
  const avatarUrl = '<%= (user.AVARTAR_URL || "").replace(/"/g, "") %>';

  // Hiển thị thông báo thành công/thất bại
  function showProfileNotification(message, type = 'success') {
    const notif = document.createElement('div');
    notif.className = `fixed top-5 right-5 z-50 px-4 py-2 rounded text-white shadow-lg ${
      type === 'error' ? 'bg-red-500' : 'bg-green-500'
    }`;
    notif.textContent = message;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 3000);
  }

  // Xử lý nút chỉnh sửa
  function enableProfileEdit() {
    const form = document.getElementById("userForm");
    if (!form) return;

    document.querySelectorAll("#userForm input").forEach(el => {
      const name = el.name;
      if (
        name !== "VAI_TRO" &&
        name !== "TRANG_THAI" &&
        name !== "NGAY_TAO_ND" &&
        name !== "NGAY_CAP_NHAT_ND"
      ) {
        el.removeAttribute("readonly");
        el.removeAttribute("disabled");
        el.classList.remove("bg-gray-100");
      }
    });

    // Cho phép chọn ảnh
    const avatarInput = document.querySelector("input[name='hinh_anh']");
    if (avatarInput) {
      avatarInput.removeAttribute("disabled");
      avatarInput.classList.remove("cursor-not-allowed");
    }

    const selectImageBtn = document.getElementById("selectImageBtn");
    if (selectImageBtn) {
      selectImageBtn.classList.remove("opacity-50", "cursor-not-allowed");
      selectImageBtn.classList.add("hover:bg-gray-100", "cursor-pointer");
      const tooltip = selectImageBtn.nextElementSibling;
      if (tooltip) tooltip.classList.add("hidden");
    }

    // Xem trước ảnh khi chọn
    avatarInput?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = document.querySelector('img[alt="Avatar"]') || document.createElement('img');
          img.src = e.target.result;
          img.className = "w-60 h-60 rounded-xl shadow-md object-cover mb-4 transition-transform duration-300 hover:scale-105 hover:shadow-lg";
          img.alt = "Avatar";
          const avatarContainer = document.querySelector('.w-full.lg\\:w-2\\/5');
          const placeholder = avatarContainer.querySelector('.w-60.h-60.rounded-xl.bg-gray-100');
          if (placeholder) placeholder.remove();
          avatarContainer.insertBefore(img, avatarContainer.children[1]);
        };
        reader.readAsDataURL(file);
      } else {
        showProfileNotification("Vui lòng chọn file hình ảnh!", "error");
      }
    });

    document.getElementById("editBtn")?.classList.add("hidden");
    document.getElementById("saveBtn")?.classList.remove("hidden");
    document.getElementById("cancelBtn")?.classList.remove("hidden");
  }

  // Xử lý nút thoát
  function cancelProfileEdit() {
    const form = document.getElementById("userForm");
    if (!form) return;

    // Khôi phục trạng thái readonly và disabled
    document.querySelectorAll("#userForm input").forEach(el => {
      const name = el.name;
      if (
        name !== "VAI_TRO" &&
        name !== "TRANG_THAI" &&
        name !== "NGAY_TAO_ND" &&
        name !== "NGAY_CAP_NHAT_ND"
      ) {
        el.setAttribute("readonly", true);
        if (name === "hinh_anh") {
          el.setAttribute("disabled", true);
          el.value = ""; // Xóa file đã chọn
          el.classList.add("cursor-not-allowed");
        }
        el.classList.add("bg-gray-100");
      }
    });

    // Khôi phục nút chọn ảnh
    const selectImageBtn = document.getElementById("selectImageBtn");
    if (selectImageBtn) {
      selectImageBtn.classList.add("opacity-50", "cursor-not-allowed");
      selectImageBtn.classList.remove("hover:bg-gray-100", "cursor-pointer");
      const tooltip = selectImageBtn.nextElementSibling;
      if (tooltip) tooltip.classList.remove("hidden");
    }

    // Khôi phục ảnh gốc hoặc placeholder
    const avatarContainer = document.querySelector('.w-full.lg\\:w-2\\/5');
    const currentImg = avatarContainer.querySelector('img[alt="Avatar"]');
    // Xóa ảnh xem trước nếu khác với ảnh gốc
    if (currentImg && !currentImg.src.includes(avatarUrl)) {
      currentImg.remove();
    }
    // Thêm lại ảnh gốc hoặc placeholder
    if (avatarUrl) {
      const img = document.createElement('img');
      img.src = avatarUrl.startsWith('/') ? avatarUrl : '/' + avatarUrl; // Đảm bảo đường dẫn đúng
      img.className = "w-60 h-60 rounded-xl shadow-md object-cover mb-4 transition-transform duration-300 hover:scale-105 hover:shadow-lg";
      img.alt = "Avatar";
      avatarContainer.insertBefore(img, avatarContainer.children[1] || null);
    } else {
      const placeholder = avatarContainer.querySelector('.w-60.h-60.rounded-xl.bg-gray-100');
      if (!placeholder) {
        const newPlaceholder = document.createElement('div');
        newPlaceholder.className = "w-60 h-60 rounded-xl bg-gray-100 flex items-center justify-center text-yellow-500 mb-4 shadow-inner";
        newPlaceholder.innerHTML = '<i class="fas fa-user text-5xl"></i>';
        avatarContainer.insertBefore(newPlaceholder, avatarContainer.children[1] || null);
      }
    }

    document.getElementById("editBtn")?.classList.remove("hidden");
    document.getElementById("saveBtn")?.classList.add("hidden");
    document.getElementById("cancelBtn")?.classList.add("hidden");
  }

  // Xử lý nút lưu
  async function submitProfileUpdate() {
    const form = document.getElementById("userForm");
    if (!form) return;

    const formData = new FormData(form);

    try {
      const res = await fetch("/admin/trang-ca-nhan/cap-nhat", {
        method: "PUT",
        body: formData
      });

      const result = await res.json();

      if (res.ok) {
        showProfileNotification(result.message || "✅ Cập nhật thành công!");
        setTimeout(() => window.location.reload(), 1500);
      } else {
        showProfileNotification(result.error || "❌ Cập nhật thất bại", "error");
      }
    } catch (err) {
      console.error("Lỗi khi gửi yêu cầu PUT:", err);
      showProfileNotification("❌ Lỗi kết nối tới server", "error");
    }
  }

  // Hàm gắn sự kiện khi DOM sẵn sàng
  function bindTrangCaNhanEventListeners() {
    console.log("Gắn sự kiện cho /admin/trang-ca-nhan");

    const editBtn = document.getElementById("editBtn");
    const saveBtn = document.getElementById("saveBtn");
    const cancelBtn = document.getElementById("cancelBtn");

    if (editBtn && saveBtn && cancelBtn) {
      editBtn.addEventListener("click", enableProfileEdit);
      saveBtn.addEventListener("click", submitProfileUpdate);
      cancelBtn.addEventListener("click", cancelProfileEdit);
    } else {
      console.warn("Không tìm thấy một trong các nút: Chỉnh sửa, Lưu, hoặc Thoát");
    }
  }

  // Gọi khi DOM đã load xong
  document.addEventListener("DOMContentLoaded", () => {
    bindTrangCaNhanEventListeners();
  });
