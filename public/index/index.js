// /public/index/index.js

document.addEventListener("DOMContentLoaded", function () {

    // --- Chức năng menu di động ---
    const menuToggle = document.getElementById("menu-toggle");
    const mobileMenu = document.getElementById("mobile-menu");

    if (menuToggle && mobileMenu) {
        menuToggle.addEventListener("click", () => {
            mobileMenu.classList.toggle("hidden");
        });

        // Đóng mobile menu khi click bên ngoài (tùy chọn)
        document.addEventListener('click', (e) => {
            if (!mobileMenu.contains(e.target) && !menuToggle.contains(e.target) && !mobileMenu.classList.contains('hidden')) {
                mobileMenu.classList.add('hidden');
            }
        });
    }

    // --- Chức năng menu thả xuống của người dùng ---
    const userAvatar = document.getElementById("user-avatar");
    const userDropdown = document.getElementById("user-dropdown");

    if (userAvatar && userDropdown) {
        userAvatar.addEventListener("click", (e) => {
            e.stopPropagation(); // Ngăn chặn sự kiện click lan ra document
            userDropdown.classList.toggle("hidden");
        });

        // Đóng dropdown khi click bên ngoài
        document.addEventListener('click', (e) => {
            if (!userDropdown.contains(e.target) && !userAvatar.contains(e.target)) {
                userDropdown.classList.add('hidden');
            }
        });
    }

    // --- Chức năng thông báo ---
    // Hàm định dạng thời gian cho dễ đọc
    function formatTimeAgo(dateString) {
        const now = new Date();
        const notificationDate = new Date(dateString);
        const seconds = Math.floor((now - notificationDate) / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        const weeks = Math.floor(days / 7);
        const months = Math.floor(days / 30);
        const years = Math.floor(days / 365);

        if (seconds < 60) {
            return `${seconds} giây trước`;
        } else if (minutes < 60) {
            return `${minutes} phút trước`;
        } else if (hours < 24) {
            return `${hours} giờ trước`;
        } else if (days < 7) {
            return `${days} ngày trước`;
        } else if (weeks < 4) {
            return `${weeks} tuần trước`;
        } else if (months < 12) {
            return `${months} tháng trước`;
        } else {
            return `${years} năm trước`;
        }
    }

    const notificationToggle = document.getElementById('notification-toggle');
    const notificationDropdown = document.getElementById('notification-dropdown');
    const notificationPreview = document.getElementById('notification-preview');
    const unreadNotificationCount = document.getElementById('unread-notification-count');

    // Hàm để đánh dấu thông báo đã đọc
    async function markNotificationAsRead(notificationId) {
        try {
            const response = await fetch(`/api/thong-bao/${notificationId}/mark-read`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Thêm CSRF token nếu bạn có sử dụng
                }
            });
            if (!response.ok) {
                console.error('Lỗi khi đánh dấu thông báo đã đọc:', response.statusText);
            } else {
                console.log(`Thông báo ID ${notificationId} đã được đánh dấu là đã đọc.`);
                // Cập nhật số lượng thông báo chưa đọc sau khi đánh dấu
                fetchUnreadNotificationCount();
            }
        } catch (error) {
            console.error('Lỗi network khi đánh dấu đã đọc:', error);
        }
    }

    // Hàm tải thông báo và cập nhật dropdown
    async function loadNotificationPreview() {
        notificationPreview.innerHTML = `<p class="text-sm text-gray-500 text-center">Đang tải thông báo...</p>`;
        try {
            // Lấy 5 thông báo mới nhất từ API
            const response = await fetch('/api/thong-bao?limit=5'); // Sử dụng API backend trả về JSON
            if (!response.ok) {
                // Xử lý lỗi nếu API không trả về 200 OK
                throw new Error(`Lỗi HTTP! status: ${response.status}`);
            }
            const data = await response.json();
            const notifications = data.thong_bao;

            if (notifications.length > 0) {
              notificationPreview.innerHTML = notifications.map(notif => {
    let iconClass = 'fa-bell';
    let iconColor = 'text-yellow-500';

    // Ưu tiên duyệt trạng thái
    if (notif.TRANG_THAI_DUYET_ === 'Đã duyệt') {
        iconClass = 'fa-check-circle';
        iconColor = 'text-green-500';
    } else if (notif.TRANG_THAI_DUYET_ === 'Từ chối') {
        iconClass = 'fa-times-circle';
        iconColor = 'text-red-500';
    } else {
        switch (notif.LOAI_TB) {
            case 'cong_thuc':
                iconClass = 'fa-utensils';
                iconColor = 'text-blue-500';
                break;
            case 'binh_luan':
                iconClass = 'fa-comments';
                iconColor = 'text-green-500';
                break;
            case 'phan_hoi_binh_luan':
                iconClass = 'fa-reply';
                iconColor = 'text-purple-500';
                break;
            case 'danh_gia':
                iconClass = 'fa-star';
                iconColor = 'text-yellow-500';
                break;
            case 'yeu_thich':
                iconClass = 'fa-heart';
                iconColor = 'text-red-500';
                break;
            case 'binh_luan_cam_xuc':
            case 'phan_hoi_cam_xuc':
                iconClass = 'fa-smile';
                iconColor = 'text-pink-500';
                break;
        }
    }

    return `
        <a href="/thong-bao?id=${notif.ID_CHINH_TB}"
           class="flex items-start gap-2 p-2 rounded-md hover:bg-gray-50 ${notif.DA_DOC ? 'text-gray-600' : 'font-semibold text-gray-800'}"
           data-notification-id="${notif.ID_CHINH_TB}"
        >
            <i class="fa ${iconClass} ${iconColor} text-base mt-1"></i>
            <div class="flex-1">
                <p class="text-sm leading-snug">${notif.NOI_DUNG_TB}</p>
                <p class="text-xs text-gray-400 mt-1">${formatTimeAgo(notif.NGAY_TAO_TB)}</p>
            </div>
        </a>
    `;
}).join('');


                // Thêm sự kiện click để đánh dấu đã đọc khi chuyển hướng từ dropdown
                notificationPreview.querySelectorAll('a').forEach(link => {
                    link.addEventListener('click', (e) => {
                        const notificationId = link.dataset.notificationId;
                        if (notificationId) {
                            markNotificationAsRead(notificationId);
                        }
                        // Tiếp tục hành vi mặc định của link (chuyển hướng)
                    });
                });

            } else {
                notificationPreview.innerHTML = `<p class="text-sm text-gray-500 text-center">Không có thông báo nào.</p>`;
            }
            notificationPreview.dataset.loaded = 'true'; // Đánh dấu đã tải
        } catch (err) {
            console.error('Lỗi khi tải thông báo:', err);
            notificationPreview.innerHTML = `<p class="text-red-500 text-center">Lỗi tải thông báo!</p>`;
        }
    }

    // Hàm lấy số lượng thông báo chưa đọc
    async function fetchUnreadNotificationCount() {
        if (unreadNotificationCount) {
            try {
                const response = await fetch('/api/thong-bao/unread-count'); // Sử dụng API backend cho số lượng chưa đọc
                if (!response.ok) {
                    throw new Error(`Lỗi HTTP! status: ${response.status}`);
                }
                const data = await response.json();
                const count = data.count;

                if (count > 0) {
                    unreadNotificationCount.textContent = count;
                    unreadNotificationCount.classList.remove('hidden');
                } else {
                    unreadNotificationCount.classList.add('hidden');
                }
            } catch (error) {
                console.error('Lỗi khi lấy số thông báo chưa đọc:', error);
                unreadNotificationCount.classList.add('hidden'); // Ẩn badge nếu có lỗi
            }
        }
    }

    // Lắng nghe sự kiện click vào biểu tượng chuông
    if (notificationToggle && notificationDropdown && notificationPreview) {
        notificationToggle.addEventListener('click', async (e) => {
            e.stopPropagation(); // Ngăn chặn sự kiện click lan truyền ra ngoài
            notificationDropdown.classList.toggle('hidden');

            // Chỉ tải thông báo khi dropdown được mở
            if (!notificationDropdown.classList.contains('hidden')) {
                await loadNotificationPreview();
            }
            // Luôn cập nhật số lượng chưa đọc khi mở dropdown
            fetchUnreadNotificationCount();
        });

        // Đóng dropdown khi click bên ngoài
        document.addEventListener('click', (e) => {
            if (!notificationDropdown.contains(e.target) && !notificationToggle.contains(e.target)) {
                notificationDropdown.classList.add('hidden');
            }
        });
    }

    // Gọi hàm lấy số lượng thông báo chưa đọc khi trang tải xong
    fetchUnreadNotificationCount(); // Gọi ngay khi DOMContentLoaded để hiển thị badge ban đầu


    // --- Chức năng gợi ý hôm nay (Chỉ nếu phần này nằm trên trang chủ hoặc layout chính) ---
    // Nếu 'refresh-today-recipe' chỉ xuất hiện trên trang chủ, hãy di chuyển phần này vào JS riêng của trang chủ
    // hoặc đảm bảo ID này không gây lỗi trên các trang khác. Tôi sẽ giữ nó ở đây vì bạn đã đặt nó.
    document.getElementById("refresh-today-recipe")?.addEventListener("click", async () => {
        try {
            const response = await fetch("/api/random-recipe");
            const todayRecipe = await response.json();
            const container = document.getElementById("today-recipe-container");
            if (todayRecipe) {
                const totalMinutes = parseInt(todayRecipe.THOI_GIAN_NAU) || parseInt(todayRecipe.THOI_GIAN) || 0;
                let timeDisplay = "";
                if (totalMinutes >= 60) {
                    const hours = Math.floor(totalMinutes / 60);
                    const mins = totalMinutes % 60;
                    timeDisplay = `${hours} giờ${mins > 0 ? ' ' + mins + ' phút' : ''}`;
                } else {
                    timeDisplay = `${totalMinutes} phút`;
                }
                container.innerHTML = `
                    <div class="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-stone-100">
                        <div class="md:flex">
                            <div class="md:w-1/2 h-64 md:h-96 overflow-hidden relative">
                                <img src="${todayRecipe.HINH_ANH_CT || 'https://via.placeholder.com/600x400/F0F0F0/B0B0B0?text=No+Image'}" 
                                            alt="${todayRecipe.TEN_CT}" 
                                            class="w-full h-full object-cover transition-transform duration-500 hover:scale-110" />
                                <span class="absolute top-3 left-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-full shadow-md">
                                    ${todayRecipe.TEN_MON_AN || 'Ẩm thực'}
                                </span>
                                ${todayRecipe.DANH_GIA && todayRecipe.DANH_GIA !== 'Chưa có' ? `
                                    <div class="absolute bottom-3 right-3 bg-stone-800 bg-opacity-80 text-white text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-full flex items-center shadow-md">
                                        <i class="fas fa-star text-yellow-400 mr-1.5"></i>
                                        ${todayRecipe.DANH_GIA}
                                    </div>` : ''}
                            </div>
                            <div class="md:w-1/2 p-6 md:p-8 flex flex-col justify-center bg-stone-50">
                                <h3 class="text-2xl md:text-3xl font-bold text-stone-800 mb-4 hover:text-amber-600 transition-colors duration-300">
                                    ${todayRecipe.TEN_CT}
                                </h3>
                                <p class="text-gray-600 mb-6 line-clamp-3">
                                    ${todayRecipe.MO_TA || 'Thưởng thức món ăn tuyệt vời này với công thức đơn giản và dễ thực hiện!'}
                                </p>
                                <div class="flex flex-wrap items-center gap-4 text-sm text-stone-600 font-medium">
                                    <span class="flex items-center gap-1.5">
                                        <i class="fas fa-clock text-amber-500"></i> ${timeDisplay}
                                    </span>
                                    <span class="flex items-center gap-1.5">
                                        <i class="fas fa-fire text-red-500"></i> ${todayRecipe.DO_KHO || 'Dễ'}
                                    </span>
                                    <span class="flex items-center gap-1.5">
                                        <i class="fas fa-utensils text-green-500"></i> ${todayRecipe.SO_PHAN_AN || todayRecipe.KHOI_LUONG || '4'} người
                                    </span>
                                </div>
                                <a href="/cong-thuc/${todayRecipe.SLUG_CT || todayRecipe.ID_CHINH_CT}" 
                                   class="mt-6 inline-block bg-stone-600 text-white px-6 py-3 rounded-full text-lg font-bold shadow-xl hover:bg-stone-700 transition-all duration-300 transform hover:scale-105">
                                    Xem công thức <i class="fas fa-arrow-right ml-2"></i>
                                </a>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                container.innerHTML = `
                    <p class="text-center text-gray-600 p-8 bg-stone-50 rounded-lg shadow-inner border border-stone-200">
                        Chưa có gợi ý món ăn cho hôm nay. Hãy thử tìm kiếm một công thức yêu thích!
                    </p>
                `;
            }
        } catch (err) {
            console.error("Lỗi làm mới công thức:", err);
        }
    });

    // Các phần JS bị comment hoặc các phần riêng biệt chỉ dùng trên một trang cụ thể
    // nên được xóa khỏi index.js hoặc chỉ được include trên trang đó.
    // Ví dụ: logic modal profile, tab switching, toggle favorite, edit/delete recipe
    // thường chỉ cần thiết trên trang profile hoặc trang quản lý công thức.
});