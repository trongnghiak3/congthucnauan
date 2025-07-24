document.addEventListener("DOMContentLoaded", function () {
 // Ẩn/hiện menu di động
document.getElementById("nut-chuyen-menu")?.addEventListener("click", () => {
  const menuDiDong = document.getElementById("menu-di-dong");
  menuDiDong.classList.toggle("an");
});

// Ẩn/hiện menu thả xuống của người dùng
document.getElementById("anh-dai-dien-nguoi-dung")?.addEventListener("click", () => {
  const menuThaSuaXuong = document.getElementById("menu-tha-xuong-nguoi-dung");
  menuThaSuaXuong.classList.toggle("an");
});


const nutChuyenMenu = document.getElementById("nut-chuyen-menu");
const menuDiDong = document.getElementById("menu-di-dong");
nutChuyenMenu?.addEventListener("click", () => { // Thêm ?. ở đây để đảm bảo an toàn nếu phần tử không tồn tại
  menuDiDong?.classList.toggle("an"); // Thêm ?. ở đây
});

// thông báo
        const toggle = document.getElementById('notification-toggle');
    const dropdown = document.getElementById('notification-dropdown');

    if (toggle && dropdown) {
      toggle.addEventListener('click', () => {
        dropdown.classList.toggle('hidden');
      });

      // Click ngoài sẽ đóng dropdown
      document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && !toggle.contains(e.target)) {
          dropdown.classList.add('hidden');
        }
      });
    }
// gợi ý hôm nay 
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
  });
// menu điện thoại
   const menuToggle = document.getElementById("menu-toggle");
    const mobileMenu = document.getElementById("mobile-menu");

    if (menuToggle && mobileMenu) {
      menuToggle.addEventListener("click", () => {
        mobileMenu.classList.toggle("hidden");
      });
    }
 








    const avatar = document.getElementById("user-avatar");
    const dropdown = document.getElementById("user-dropdown");
    if (avatar && dropdown) {
      avatar.addEventListener("click", () => {
        dropdown.classList.toggle("hidden");
      });
    }




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
