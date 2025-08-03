document.addEventListener('DOMContentLoaded', () => {
    // ... (các hàm toggleSidebar, debounce giữ nguyên)
    console.log("js cua công thưc đã hoạt động");

    // Hàm lấy tham số truy vấn từ URL
    function layThamSoTruyVan() {
        const params = new URLSearchParams(window.location.search);
        return {
            loaiMon: params.get('loaiMon') || '',
            nguyenLieu: params.get('nguyenLieu') || '',
            thoiGian: params.get('thoiGian') || '',
            doKho: params.get('doKho') || '',
            monAnId: params.get('monAnId') || '',
            timKiem: params.get('timKiem') || '',
            sapXep: params.get('sapXep') || 'mac-dinh',
            trang: parseInt(params.get('trang')) || 1,
            soPhan: params.get('soPhan') || '' // Đảm bảo soPhan không bị undefined
        };
    }

    // Gọi hàm layCongThuc ngay khi trang load với tham số từ URL
    const initialFilters = layThamSoTruyVan();
    layCongThuc(initialFilters);

    // Hàm cập nhật trạng thái các nút lọc trên UI
    function capNhatTrangThaiBoLocUI() {
        const filters = layThamSoTruyVan();

        // Cập nhật input tìm kiếm tên công thức
        const timKiemInput = document.getElementById('timKiemInput');
        if (timKiemInput) timKiemInput.value = filters.timKiem;

        // Cập nhật input tìm kiếm nguyên liệu
        const nguyenLieuInput = document.getElementById('nguyenLieuInput');
        if (nguyenLieuInput) nguyenLieuInput.value = filters.nguyenLieu;

        // Cập nhật select sắp xếp
        const sapXepSelect = document.getElementById('sapXepSelect');
        if (sapXepSelect) sapXepSelect.value = filters.sapXep;

        // Cập nhật các nút bộ lọc
        document.querySelectorAll('.portion-btn').forEach(btn => {
            if (btn.dataset.soPhan === filters.soPhan) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        document.querySelectorAll('.time-btn').forEach(btn => {
            if (btn.dataset.thoiGian === filters.thoiGian) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            if (btn.dataset.doKho === filters.doKho) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    // Hàm gửi yêu cầu tìm kiếm động (AJAX)
   async function layCongThuc(boLoc = layThamSoTruyVan()) {
    const { loaiMon, nguyenLieu, thoiGian, doKho, monAnId, timKiem, sapXep, trang, soPhan } = boLoc;

    const newUrl = `/cong-thuc?loaiMon=${encodeURIComponent(loaiMon)}&nguyenLieu=${encodeURIComponent(nguyenLieu)}&thoiGian=${encodeURIComponent(thoiGian)}&doKho=${encodeURIComponent(doKho)}&monAnId=${encodeURIComponent(monAnId)}&timKiem=${encodeURIComponent(timKiem)}&sapXep=${encodeURIComponent(sapXep)}&trang=${trang}&soPhan=${encodeURIComponent(soPhan || '')}`;
    history.pushState(boLoc, '', newUrl);

    try {
        const response = await fetch(newUrl);
        if (!response.ok) throw new Error('Lỗi server');
        const data = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(data, 'text/html');

        const danhSachCongThucMoi = doc.getElementById('recipeList')?.innerHTML || '';
        const noResultsElementMoi = doc.getElementById('noResults')?.outerHTML || '';
        const nutXemThemMoi = doc.getElementById('showMoreBtn');

        const danhSachCongThuc = document.getElementById('recipeList');
        if (danhSachCongThuc) {
            // Lấy danh sách ID của các công thức đã có
            const existingIds = new Set([...danhSachCongThuc.querySelectorAll('.recipe-card')].map(card => card.getAttribute('data-id')));

            // Nếu là reload với trang > 1, tải lại từ trang 1 trước
            if (trang > 1 && !sessionStorage.getItem('initialLoad')) {
                const initialFilters = { ...boLoc, trang: 1 };
                const initialResponse = await fetch(`/cong-thuc?loaiMon=${encodeURIComponent(loaiMon)}&nguyenLieu=${encodeURIComponent(nguyenLieu)}&thoiGian=${encodeURIComponent(thoiGian)}&doKho=${encodeURIComponent(doKho)}&monAnId=${encodeURIComponent(monAnId)}&timKiem=${encodeURIComponent(timKiem)}&sapXep=${encodeURIComponent(sapXep)}&trang=1&soPhan=${encodeURIComponent(soPhan || '')}`);
                const initialData = await initialResponse.text();
                const initialDoc = parser.parseFromString(initialData, 'text/html');
                danhSachCongThuc.innerHTML = initialDoc.getElementById('recipeList')?.innerHTML || '';
                sessionStorage.setItem('initialLoad', 'true');
            }

            // Append dữ liệu mới, chỉ thêm các công thức chưa tồn tại
            if (trang > 1) {
                const parserTemp = new DOMParser();
                const docTemp = parserTemp.parseFromString(danhSachCongThucMoi, 'text/html');
                const newRecipes = docTemp.querySelectorAll('.recipe-card');
                newRecipes.forEach(recipe => {
                    const recipeId = recipe.getAttribute('data-id');
                    if (recipeId && !existingIds.has(recipeId)) {
                        existingIds.add(recipeId);
                        danhSachCongThuc.appendChild(recipe.cloneNode(true));
                    }
                });
            } else {
                danhSachCongThuc.innerHTML = danhSachCongThucMoi;
            }
        }

        let currentNoResultsElement = document.getElementById('noResults');
        if (currentNoResultsElement) {
            currentNoResultsElement.outerHTML = noResultsElementMoi;
        } else if (danhSachCongThucMoi === '' && !currentNoResultsElement) {
            danhSachCongThuc.insertAdjacentHTML('afterend', '<p id="noResults" class="text-center text-gray-500 text-sm font-medium mt-6">Không tìm thấy công thức nào phù hợp. Hãy thử từ khóa khác!</p>');
        }

        const nutXemThemHienTai = document.getElementById('showMoreBtn');
        if (nutXemThemHienTai) {
            if (nutXemThemMoi && !nutXemThemMoi.classList.contains('hidden')) {
                nutXemThemHienTai.classList.remove('hidden');
            } else {
                nutXemThemHienTai.classList.add('hidden');
            }
        }
        capNhatTrangThaiBoLocUI();

    } catch (err) {
        console.error('Lỗi khi tải công thức:', err);
        const danhSachCongThuc = document.getElementById('recipeList');
        if (danhSachCongThuc) {
            danhSachCongThuc.innerHTML = '<p class="text-center text-red-500 col-span-full">Đã xảy ra lỗi. Vui lòng thử lại!</p>';
        }
        const nutXemThemHienTai = document.getElementById('showMoreBtn');
        if (nutXemThemHienTai) nutXemThemHienTai.classList.add('hidden');
    }
}

    // Xử lý sự kiện khi thay đổi bộ lọc số phần ăn
    document.querySelectorAll('.portion-btn').forEach(button => {
        button.addEventListener('click', () => {
            const filters = layThamSoTruyVan();
            filters.soPhan = button.dataset.soPhan || '';
            filters.trang = 1;
            sessionStorage.removeItem('initialLoad'); // Reset khi thay đổi bộ lọc
            layCongThuc(filters);
        });
    });

    // Xử lý sự kiện khi thay đổi bộ lọc thời gian nấu
    document.querySelectorAll('.time-btn').forEach(button => {
        button.addEventListener('click', () => {
            const filters = layThamSoTruyVan();
            filters.thoiGian = button.dataset.thoiGian || '';
            filters.trang = 1;
            sessionStorage.removeItem('initialLoad'); // Reset khi thay đổi bộ lọc
            layCongThuc(filters);
        });
    });

    // Xử lý sự kiện khi thay đổi bộ lọc độ khó
    document.querySelectorAll('.difficulty-btn').forEach(button => {
        button.addEventListener('click', () => {
            const filters = layThamSoTruyVan();
            filters.doKho = button.dataset.doKho || '';
            filters.trang = 1;
            sessionStorage.removeItem('initialLoad'); // Reset khi thay đổi bộ lọc
            layCongThuc(filters);
        });
    });

    // Xử lý sự kiện khi nhập tìm kiếm tên công thức (timKiemInput)
    document.getElementById('timKiemInput')?.addEventListener('input', debounce(() => {
        const filters = layThamSoTruyVan();
        filters.timKiem = document.getElementById('timKiemInput')?.value.trim() || '';
        filters.trang = 1;
        sessionStorage.removeItem('initialLoad'); // Reset khi thay đổi bộ lọc
        layCongThuc(filters);
    }, 500));

    // Xử lý sự kiện khi nhập tìm kiếm nguyên liệu
    document.getElementById('nguyenLieuInput')?.addEventListener('input', debounce(() => {
        const filters = layThamSoTruyVan();
        filters.nguyenLieu = document.getElementById('nguyenLieuInput')?.value.trim() || '';
        filters.trang = 1;
        sessionStorage.removeItem('initialLoad'); // Reset khi thay đổi bộ lọc
        layCongThuc(filters);
    }, 500));

    // Xử lý sự kiện khi thay đổi sắp xếp
    document.getElementById('sapXepSelect')?.addEventListener('change', () => {
        const filters = layThamSoTruyVan();
        filters.sapXep = document.getElementById('sapXepSelect')?.value || 'mac-dinh';
        filters.trang = 1;
        sessionStorage.removeItem('initialLoad'); // Reset khi thay đổi bộ lọc
        layCongThuc(filters);
    });

    // Xử lý nút Xóa bộ lọc
    document.getElementById('resetFilters')?.addEventListener('click', () => {
        const timKiemInput = document.getElementById('timKiemInput');
        if (timKiemInput) timKiemInput.value = '';
        const nguyenLieuInput = document.getElementById('nguyenLieuInput');
        if (nguyenLieuInput) nguyenLieuInput.value = '';

        const sapXepSelect = document.getElementById('sapXepSelect');
        if (sapXepSelect) sapXepSelect.value = 'mac-dinh';

        document.querySelectorAll('.portion-btn, .time-btn, .difficulty-btn').forEach(btn => btn.classList.remove('active'));

        const filters = {
            loaiMon: '',
            nguyenLieu: '',
            thoiGian: '',
            doKho: '',
            monAnId: '',
            timKiem: '',
            sapXep: 'mac-dinh',
            trang: 1,
            soPhan: ''
        };
        sessionStorage.removeItem('initialLoad'); // Reset khi xóa bộ lọc
        layCongThuc(filters);
    });

    // Xử lý nút Xem thêm
    document.getElementById('showMoreBtn')?.addEventListener('click', () => {
        const filters = layThamSoTruyVan();
        filters.trang += 1;
        layCongThuc(filters);
    });

    // Cập nhật UI ngay khi tải trang dựa trên URL hiện tại
    capNhatTrangThaiBoLocUI();

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
});