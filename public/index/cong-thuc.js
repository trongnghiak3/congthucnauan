//  alert("js của công thức đã nhận");
  // Toggle sidebar trên mobile
  document.getElementById('toggleSidebar')?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.toggle('open');
  });

  // Hàm lấy tham số truy vấn từ URL
  function getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      ingredient: params.get('ingredient') || '',
      portion: params.get('portion') || '',
      time: params.get('time') || '',
      difficulty: params.get('difficulty') || '',
      search: params.get('search') || '',
      sort: params.get('sort') || 'default',
      page: parseInt(params.get('page')) || 1
    };
  }

  // Hàm gửi yêu cầu tìm kiếm động (AJAX)
  async function fetchRecipes() {
    const filters = getQueryParams();
    const { ingredient, portion, time, difficulty, search, sort, page } = filters;

    // Hiển thị hiệu ứng loading
    const recipeList = document.getElementById('recipeList');
    if (recipeList) {
      recipeList.innerHTML = '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1"><div class="placeholder h-64 rounded-lg"></div><div class="placeholder h-64 rounded-lg"></div><div class="placeholder h-64 rounded-lg"></div></div>';
    }

    try {
      const response = await fetch(`/cong-thuc?ingredient=${encodeURIComponent(ingredient)}&portion=${encodeURIComponent(portion)}&time=${encodeURIComponent(time)}&difficulty=${encodeURIComponent(difficulty)}&search=${encodeURIComponent(search)}&sort=${encodeURIComponent(sort)}&page=${page}`);
      if (!response.ok) throw new Error('Lỗi server');
      const data = await response.text();

      // Tạo một DOM ảo để phân tích dữ liệu trả về
      const parser = new DOMParser();
      const doc = parser.parseFromString(data, 'text/html');
      const newRecipeList = doc.getElementById('recipeList')?.innerHTML || '';
      const noResults = doc.getElementById('noResults')?.outerHTML || '<p id="noResults" class="text-center text-gray-500 text-sm font-medium mt-6">Không tìm thấy công thức nào phù hợp.</p>';
      const showMoreBtn = doc.getElementById('showMoreBtn');

      // Cập nhật danh sách công thức
      if (recipeList) {
        recipeList.innerHTML = newRecipeList;
      }
      const noResultsElement = document.getElementById('noResults');
      if (noResultsElement) {
        noResultsElement.outerHTML = noResults;
      }
      const showMoreBtnElement = document.getElementById('showMoreBtn');
      if (showMoreBtnElement) {
        showMoreBtnElement.classList.toggle('hidden', !showMoreBtn || showMoreBtn.classList.contains('hidden'));
      }

      // Cập nhật URL mà không tải lại trang
      const newUrl = `/cong-thuc?ingredient=${encodeURIComponent(ingredient)}&portion=${encodeURIComponent(portion)}&time=${encodeURIComponent(time)}&difficulty=${encodeURIComponent(difficulty)}&search=${encodeURIComponent(search)}&sort=${encodeURIComponent(sort)}&page=${page}`;
      history.pushState({}, '', newUrl);
    } catch (err) {
      console.error('Lỗi khi tải công thức:', err);
      if (recipeList) {
        recipeList.innerHTML = '<p class="text-center text-red-500">Đã xảy ra lỗi. Vui lòng thử lại!</p>';
      }
    }
  }

  // Xử lý sự kiện khi thay đổi bộ lọc
  document.querySelectorAll('.portion-btn, .time-btn, .difficulty-btn').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll(`.${button.classList[0]}`).forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      const filters = getQueryParams();
      filters[button.classList[0].replace('-btn', '')] = button.dataset[button.classList[0].replace('-btn', '')] || '';
      filters.page = 1; // Reset về trang 1 khi thay đổi bộ lọc
      fetchRecipes();
    });
  });

  // Xử lý sự kiện khi nhập nguyên liệu hoặc tìm kiếm
  document.getElementById('ingredientInput')?.addEventListener('input', debounce(() => {
    const filters = getQueryParams();
    filters.ingredient = document.getElementById('ingredientInput')?.value.trim() || '';
    filters.page = 1;
    fetchRecipes();
  }, 500));

  document.getElementById('searchInput')?.addEventListener('input', debounce(() => {
    const filters = getQueryParams();
    filters.search = document.getElementById('searchInput')?.value.trim() || '';
    filters.page = 1;
    fetchRecipes();
  }, 500));

  // Xử lý sự kiện khi thay đổi sắp xếp
  document.getElementById('sortSelect')?.addEventListener('change', () => {
    const filters = getQueryParams();
    filters.sort = document.getElementById('sortSelect')?.value || 'default';
    filters.page = 1;
    fetchRecipes();
  });

  // Xử lý nút Xóa bộ lọc
  document.getElementById('resetFilters')?.addEventListener('click', () => {
    if (document.getElementById('ingredientInput')) document.getElementById('ingredientInput').value = '';
    if (document.getElementById('searchInput')) document.getElementById('searchInput').value = '';
    if (document.getElementById('sortSelect')) document.getElementById('sortSelect').value = 'default';
    document.querySelectorAll('.portion-btn, .time-btn, .difficulty-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.portion-btn[data-portion=""], .time-btn[data-time=""], .difficulty-btn[data-difficulty=""]').forEach(btn => btn.classList.add('active'));
    fetchRecipes();
  });

  // Xử lý nút Xem thêm
  document.getElementById('showMoreBtn')?.addEventListener('click', () => {
    const filters = getQueryParams();
    filters.page += 1;
    fetchRecipes();
  });

  // Hàm debounce để giới hạn tần suất gọi hàm
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
