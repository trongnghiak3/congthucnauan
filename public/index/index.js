document.addEventListener("DOMContentLoaded", function () {
      // Toggle mobile menu
      document.getElementById("menu-toggle").addEventListener("click", () => {
        const menu = document.getElementById("mobile-menu");
        menu.classList.toggle("hidden");
      });

      // Toggle user dropdown
      document.getElementById("user-avatar")?.addEventListener("click", () => {
        const dropdown = document.getElementById("user-dropdown");
        dropdown.classList.toggle("hidden");
      });

    document.addEventListener("DOMContentLoaded", function () {
      const searchInput = document.getElementById("searchInput");
      const filterButtons = document.querySelectorAll(".filter-btn");
      const portionButtons = document.querySelectorAll(".portion-btn");
      const timeButtons = document.querySelectorAll(".time-btn");
      const difficultyButtons = document.querySelectorAll(".difficulty-btn");
      const sortSelect = document.getElementById("sortSelect");
      const recipeList = document.getElementById("recipeList");
      const noResults = document.getElementById("noResults");
      const showMoreBtn = document.getElementById("showMoreBtn");
      const resetFiltersBtn = document.getElementById("resetFilters");
      const toggleSidebarBtn = document.getElementById("toggleSidebar");
      const sidebar = document.getElementById("sidebar");

      let recipeCards = Array.from(document.querySelectorAll(".recipe-card"));
      let recipesPerPage = 8;
      let selectedCategory = "";
      let selectedPortion = "";
      let selectedTime = "";
      let selectedDifficulty = "";
      let searchTerm = "";
      let sortOption = "default";
      let visibleCount = recipesPerPage;

      // Debounce function
      function debounce(func, delay) {
        let timeout;
        return function (...args) {
          clearTimeout(timeout);
          timeout = setTimeout(() => func.apply(this, args), delay);
        };
      }

      // Sắp xếp công thức
      function sortRecipes(recipes) {
        return recipes.sort((a, b) => {
          const timeA = parseInt(a.getAttribute("data-time") || 0);
          const timeB = parseInt(b.getAttribute("data-time") || 0);
          const ratingA = parseFloat(a.querySelector(".text-xs")?.textContent.match(/\d+\.?\d*/)?.[0] || 0);
          const ratingB = parseFloat(b.querySelector(".text-xs")?.textContent.match(/\d+\.?\d*/)?.[0] || 0);

          if (sortOption === "time-asc") return timeA - timeB;
          if (sortOption === "time-desc") return timeB - timeA;
          if (sortOption === "rating-desc") return ratingB - ratingA;
          return 0;
        });
      }

      // Lọc công thức
      function getFilteredRecipes() {
        let filtered = recipeCards.filter(recipe => {
          const title = recipe.querySelector("h3")?.textContent.toLowerCase() || "";
          const category = recipe.getAttribute("data-category-id") || "";
          const portion = recipe.getAttribute("data-portion") || "";
          const time = parseInt(recipe.getAttribute("data-time") || 0);
          const difficulty = recipe.getAttribute("data-difficulty") || "";

          const matchesSearch = title.includes(searchTerm);
          const matchesCategory = selectedCategory === "" || category === selectedCategory;
          let matchesPortion = true;
          if (selectedPortion) {
            if (selectedPortion === "1-2") matchesPortion = portion === "1-2";
            else if (selectedPortion === "3-4") matchesPortion = portion === "3-4";
            else if (selectedPortion === "5+") matchesPortion = portion === "5+";
          }
          let matchesTime = true;
          if (selectedTime) {
            if (selectedTime === "0-30") matchesTime = time <= 30;
            else if (selectedTime === "30-60") matchesTime = time > 30 && time <= 60;
            else if (selectedTime === "60+") matchesTime = time > 60;
          }
          const matchesDifficulty = selectedDifficulty === "" || difficulty === selectedDifficulty;

          return matchesSearch && matchesCategory && matchesPortion && matchesTime && matchesDifficulty;
        });
        return sortRecipes(filtered);
      }

      // Render công thức
      function renderRecipes() {
        const filteredRecipes = getFilteredRecipes();
        recipeCards.forEach(r => r.classList.add("hidden"));
        const toShow = filteredRecipes.slice(0, visibleCount);
        toShow.forEach(recipe => recipe.classList.remove("hidden"));
        noResults.classList.toggle("hidden", filteredRecipes.length > 0);
        showMoreBtn.classList.toggle("hidden", visibleCount >= filteredRecipes.length);
      }

      function resetAndRender() {
        visibleCount = recipesPerPage;
        renderRecipes();
      }

      // Sự kiện nút "Xem thêm"
      showMoreBtn.addEventListener("click", () => {
        visibleCount += recipesPerPage;
        renderRecipes();
      });

      // Tìm kiếm
      searchInput.addEventListener("input", debounce(function () {
        searchTerm = this.value.toLowerCase();
        resetAndRender();
      }, 300));

      // Lọc danh mục
      filterButtons.forEach(button => {
        button.addEventListener("click", function () {
          filterButtons.forEach(btn => btn.classList.remove("active"));
          this.classList.add("active");
          selectedCategory = this.getAttribute("data-category");
          resetAndRender();
        });
      });

      // Lọc số phần ăn
      portionButtons.forEach(button => {
        button.addEventListener("click", function () {
          portionButtons.forEach(btn => btn.classList.remove("active"));
          this.classList.add("active");
          selectedPortion = this.getAttribute("data-portion");
          resetAndRender();
        });
      });

      // Lọc thời gian nấu
      timeButtons.forEach(button => {
        button.addEventListener("click", function () {
          timeButtons.forEach(btn => btn.classList.remove("active"));
          this.classList.add("active");
          selectedTime = this.getAttribute("data-time");
          resetAndRender();
        });
      });

      // Lọc độ khó
      difficultyButtons.forEach(button => {
        button.addEventListener("click", function () {
          difficultyButtons.forEach(btn => btn.classList.remove("active"));
          this.classList.add("active");
          selectedDifficulty = this.getAttribute("data-difficulty");
          resetAndRender();
        });
      });

      // Sắp xếp
      sortSelect.addEventListener("change", function () {
        sortOption = this.value;
        resetAndRender();
      });

      // Reset bộ lọc
      resetFiltersBtn.addEventListener("click", () => {
        selectedPortion = "";
        selectedTime = "";
        selectedDifficulty = "";
        selectedCategory = "";
        searchTerm = "";
        sortOption = "default";
        searchInput.value = "";
        filterButtons.forEach(btn => btn.classList.remove("active"));
        portionButtons.forEach(btn => btn.classList.remove("active"));
        timeButtons.forEach(btn => btn.classList.remove("active"));
        difficultyButtons.forEach(btn => btn.classList.remove("active"));
        sortSelect.value = "default";
        resetAndRender();
      });

      // Toggle sidebar trên mobile
      toggleSidebarBtn.addEventListener("click", () => {
        sidebar.classList.toggle("open");
      });

      resetAndRender();
    });
  // Chuyển bước
  const btnNextStep = document.getElementById('btnNextStep');
  if (btnNextStep) {
    btnNextStep.addEventListener('click', function () {
      document.getElementById('step1').style.display = 'none';
      document.getElementById('step2').style.display = 'block';
    });
  } else {
    console.error('Phần tử btnNextStep không tìm thấy!');
  }

  const btnPrevStep = document.getElementById('btnPrevStep');
  if (btnPrevStep) {
    btnPrevStep.addEventListener('click', function () {
      document.getElementById('step2').style.display = 'none';
      document.getElementById('step1').style.display = 'block';
    });
  } else {
    console.error('Phần tử btnPrevStep không tìm thấy!');
  }





  // Preview hình ảnh
  const hinhAnhInput = document.getElementById('hinh_anh');
  if (hinhAnhInput) {
    hinhAnhInput.addEventListener('change', function (event) {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
          document.getElementById('image_preview').src = e.target.result;
        };
        reader.readAsDataURL(file);
      }
    });
  } else {
    console.error('Phần tử hinh_anh không tìm thấy!');
  }

  // Preview video
  const videoFileInput = document.getElementById('video_file');
  if (videoFileInput) {
    videoFileInput.addEventListener('change', function (event) {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
          document.getElementById('video_preview').src = e.target.result;
        };
        reader.readAsDataURL(file);
      }
    });
  } else {
    console.error('Phần tử video_file không tìm thấy!');
  }

  // Xử lý submit form
// Trong khối document.addEventListener("DOMContentLoaded", ...)
const addRecipeForm = document.getElementById('add-recipe-form');
  if (addRecipeForm) {
    addRecipeForm.addEventListener('submit', async function (event) {
      event.preventDefault();
      console.log('Gửi form');
      const formData = new FormData(this);

      // In dữ liệu form để debug
      for (let [key, value] of formData.entries()) {
        console.log(key, value);
      }

      // Kiểm tra các trường bắt buộc
      const tenCongThuc = formData.get('TEN_CT');
      const moTa = formData.get('MOTA');
      const idChinhMa = formData.get('id_chinh_ma');
      const thoiGianNau = formData.get('THOI_GIAN_NAU');
      const doKho = formData.get('DO_KHO');
      const soPhanAn = formData.get('SO_PHAN_AN');

      if (!tenCongThuc?.trim()) {
        alert('Vui lòng nhập tên công thức!');
        return;
      }
      if (!moTa?.trim()) {
        alert('Vui lòng nhập mô tả!');
        return;
      }
      if (!idChinhMa) {
        alert('Vui lòng chọn món ăn!');
        return;
      }
      if (!thoiGianNau || parseFloat(thoiGianNau) <= 0) {
        alert('Vui lòng nhập thời gian nấu hợp lệ!');
        return;
      }
      if (!doKho) {
        alert('Vui lòng chọn độ khó!');
        return;
      }
      if (!soPhanAn || parseInt(soPhanAn) <= 0) {
        alert('Vui lòng nhập số phần ăn hợp lệ!');
        return;
      }

      // Kiểm tra nguyên liệu
      const nguyenLieuIds = document.querySelectorAll('select[name="nguyen_lieu_id[]"]');
      const tenKhac = document.querySelectorAll('input[name="ten_nguyen_lieu_khac[]"]');
      const soLuong = document.querySelectorAll('input[name="so_luong[]"]');
      if (nguyenLieuIds.length === 0) {
        alert('Vui lòng thêm ít nhất một nguyên liệu!');
        return;
      }
      for (let i = 0; i < nguyenLieuIds.length; i++) {
        if (nguyenLieuIds[i].value === 'khac' && !tenKhac[i].value.trim()) {
          alert(`Vui lòng nhập tên nguyên liệu mới cho nguyên liệu thứ ${i + 1}!`);
          return;
        }
        if (!soLuong[i].value || parseFloat(soLuong[i].value) <= 0) {
          alert(`Vui lòng nhập số lượng hợp lệ cho nguyên liệu thứ ${i + 1}!`);
          return;
        }
      }

      // Kiểm tra bước nấu
      const tenBuoc = document.querySelectorAll('input[name="ten_buoc[]"]');
      const buocNau = document.querySelectorAll('textarea[name="buoc_nau[]"]');
      if (tenBuoc.length === 0 || buocNau.length === 0 || tenBuoc.length !== buocNau.length) {
        alert('Vui lòng thêm ít nhất một bước nấu!');
        return;
      }
      for (let i = 0; i < tenBuoc.length; i++) {
        if (!tenBuoc[i].value.trim() || !buocNau[i].value.trim()) {
          alert(`Vui lòng nhập tên và mô tả cho bước nấu thứ ${i + 1}!`);
          return;
        }
      }

      const submitButton = document.querySelector('#step2 button[type="submit"]');
      const loadingIcon = document.createElement('i');
      loadingIcon.className = 'fas fa-spinner fa-spin ml-2';
      submitButton.appendChild(loadingIcon);
      submitButton.disabled = true;

      try {
        const response = await fetch('/dang-cong-thuc', {
          method: 'POST',
          body: formData,
        });
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Không tìm thấy endpoint /dang-cong-thuc. Kiểm tra server và route!');
          }
          const errorData = await response.json();
          throw new Error(errorData.message || `Lỗi HTTP! Status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Phản hồi:', data);
        if (data.message) {
          alert(data.message);
          if (data.recipeId) {
            window.location.href = '/dang-cong-thuc';
          }
        } else {
          alert('Có lỗi xảy ra khi đăng công thức!');
        }
      } catch (error) {
        console.error('Lỗi:', error);
        alert(error.message || 'Không thể kết nối đến server!');
      } finally {
        submitButton.disabled = false;
        submitButton.removeChild(loadingIcon);
      }
    });
  } else {
    console.error('Phần tử add-recipe-form không tìm thấy!');
  }
});
 // Các hàm hỗ trợ khác
 // Các hàm hỗ trợ (giữ nguyên từ mã trước)
 // Hàm hỗ trợ cho nguyên liệu
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

    item.querySelectorAll('input, select').forEach((el) => {
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
      alert('Phải có ít nhất một nguyên liệu!');
    }
  }

  // Hàm hỗ trợ cho bước nấu
  function updateStepNumbers() {
    const steps = document.querySelectorAll('#buoc_nau_container .buoc_nau_item');
    steps.forEach((step, index) => {
      const stepNumberSpan = step.querySelector('.step-number');
      if (stepNumberSpan) {
        stepNumberSpan.textContent = `${index + 1}.`;
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
    alert('Phải có ít nhất một bước nấu!');
  }
}
  // Chuyển bước
  const btnNextStep = document.getElementById('btnNextStep');
  if (btnNextStep) {
    btnNextStep.addEventListener('click', function () {
      document.getElementById('step1').style.display = 'none';
      document.getElementById('step2').style.display = 'block';
    });
  }

  const btnPrevStep = document.getElementById('btnPrevStep');
  if (btnPrevStep) {
    btnPrevStep.addEventListener('click', function () {
      document.getElementById('step2').style.display = 'none';
      document.getElementById('step1').style.display = 'block';
    });
  }

    const toggle = document.getElementById('category-toggle');
    const menu = document.querySelector('.dropdown-menu');

    toggle.addEventListener('click', (e) => {
        e.preventDefault();
        menu.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
        if (!toggle.contains(e.target) && !menu.contains(e.target)) {
            menu.classList.add('hidden');
        }
    });

  // // Modal Profile
  // function openModalProfile() {
  //   const modal = document.getElementById('updateProfileModal');
  //   modal.classList.remove('hidden', 'modal-closed');
  //   modal.classList.add('modal-open');
  // }

  // function closeModalProfile() {
  //   const modal = document.getElementById('updateProfileModal');
  //   modal.classList.remove('modal-open');
  //   modal.classList.add('modal-closed');
  //   setTimeout(() => modal.classList.add('hidden'), 300);
  // }

  // // Preview Avatar
  // document.getElementById('avatarInput').addEventListener('change', function(event) {
  //   const file = event.target.files[0];
  //   if (file) {
  //     const reader = new FileReader();
  //     reader.onload = function(e) {
  //       document.getElementById('avatarPreview').src = e.target.result;
  //       document.getElementById('avatar-img').src = e.target.result;
  //     };
  //     reader.readAsDataURL(file);
  //   }
  // });

  // // Submit Profile Update
  // document.getElementById('updateProfileForm').addEventListener('submit', function(event) {
  //   event.preventDefault();
  //   const formData = new FormData(this);

  //   // Validation
  //   const username = formData.get('TEN_NGUOI_DUNG').trim();
  //   const email = formData.get('EMAIL_').trim();
  //   if (!username || !email) {
  //     alert('Vui lòng nhập đầy đủ tên người dùng và email!');
  //     return;
  //   }
  //   if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  //     alert('Email không hợp lệ!');
  //     return;
  //   }

  //   fetch('/api/profile', {
  //     method: 'PUT',
  //     body: formData
  //   })
  //     .then(response => response.json())
  //     .then(data => {
  //       if (data.error) {
  //         alert(data.error);
  //         return;
  //       }
  //       alert(data.message || 'Cập nhật hồ sơ thành công!');
  //       closeModalProfile();
  //       if (data.user) {
  //         document.getElementById('avatar-img').src = data.user.AVARTAR_URL || 'https://i.imgur.com/2Nv5jVb.png';
  //         document.querySelector('h2.text-2xl').textContent = data.user.TEN_NGUOI_DUNG;
  //         document.querySelector('p.text-gray-600').textContent = `📧 ${data.user.EMAIL_}`;
  //       }
  //     })
  //     .catch(error => {
  //       console.error('Lỗi:', error);
  //       alert('Có lỗi khi cập nhật hồ sơ!');
  //     });
  // });

  // // Tab Switching
  // function switchTab(tab) {
  //   const favoriteTab = document.getElementById('tab-favorite');
  //   const myRecipesTab = document.getElementById('tab-my-recipes');
  //   const favoriteContent = document.getElementById('favorite-content');
  //   const myRecipesContent = document.getElementById('my-recipes-content');

  //   if (tab === 'favorite') {
  //     favoriteTab.classList.add('tab-active');
  //     myRecipesTab.classList.remove('tab-active');
  //     favoriteContent.classList.remove('hidden');
  //     myRecipesContent.classList.add('hidden');
  //   } else {
  //     favoriteTab.classList.remove('tab-active');
  //     myRecipesTab.classList.add('tab-active');
  //     favoriteContent.classList.add('hidden');
  //     myRecipesContent.classList.remove('hidden');
  //   }
  // }

  // // Toggle Favorite
  // function toggleFavorite(recipeId) {
  //   fetch(`/api/yeu-thich/${recipeId}`, {
  //     method: 'POST',
  //   })
  //     .then(response => response.json())
  //     .then(data => {
  //       alert(data.message);
  //       window.location.reload();
  //     })
  //     .catch(error => {
  //       console.error('Lỗi:', error);
  //       alert('Có lỗi khi thay đổi trạng thái yêu thích!');
  //     });
  // }

  // // Placeholder functions
  // function editRecipe(id) {
  //   alert('Chức năng chỉnh sửa công thức đang được phát triển!');
  // }

  // function deleteRecipe(id) {
  //   if (confirm('Bạn có chắc muốn xóa công thức này?')) {
  //     fetch(`/cong-thuc-cua-toi/${id}`, {
  //       method: 'DELETE',
  //     })
  //       .then(response => response.json())
  //       .then(data => {
  //         alert(data.message);
  //         window.location.reload();
  //       })
  //       .catch(error => {
  //         console.error('Lỗi:', error);
  //         alert('Có lỗi khi xóa công thức!');
  //       });
  //   }
  // }
