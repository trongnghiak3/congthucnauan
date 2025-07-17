console.log("js cua profile da hoat dong");
function openModalProfile() {
      const modal = document.getElementById('updateProfileModal');
      if (modal) {
        modal.classList.remove('hidden');
        setTimeout(() => {
          const modalContent = modal.querySelector('.modal');
          if (modalContent) modalContent.classList.add('show');
        }, 10);
      } else {
        console.error('Modal không tìm thấy!');
      }
    }
    
    function closeModalProfile() {
      const modal = document.getElementById('updateProfileModal');
      if (modal) {
        const modalContent = modal.querySelector('.modal');
        if (modalContent) modalContent.classList.remove('show');
        setTimeout(() => modal.classList.add('hidden'), 400);
      } else {
        console.error('Modal không tìm thấy khi đóng!');
      }
    }

    document.getElementById('avatarInput').addEventListener('change', function(event) {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
          const avatarPreview = document.getElementById('avatarPreview');
          const avatarImg = document.getElementById('avatar-img');
          if (avatarPreview) avatarPreview.src = e.target.result;
          if (avatarImg) avatarImg.src = e.target.result;
        };
        reader.readAsDataURL(file);
      }
    });

      function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.getElementById(`${tabName}-tab`).classList.remove('hidden');

    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active-tab'));
    event.currentTarget.classList.add('active-tab');
  }

  // Tùy chỉnh class active-tab cho tab được chọn
  document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded cua profile da hoat dong");
    document.querySelector('.tab-btn.active-tab').classList.add('border-yellow-500', 'text-yellow-600');
       document.getElementById('updateProfileForm').addEventListener('submit', async function(event) {
      event.preventDefault();
      const saveButton = document.getElementById('saveButton');
      const loadingIcon = document.getElementById('loadingIcon');
      
      if (!saveButton || !loadingIcon) {
        console.error('Nút lưu hoặc icon loading không tìm thấy!');
        return;
      }

      saveButton.disabled = true;
      loadingIcon.classList.remove('hidden');

      const formData = new FormData(this);

      try {
        const response = await fetch('/api/profile', {
          method: 'PUT',
          body: formData
        });
        const data = await response.json();
        console.log('Phản hồi từ API:', data);
        
        if (data.error) {
          alert(data.error);
        } else {
          alert(data.message || 'Cập nhật hồ sơ thành công!');
          closeModalProfile();
          
          if (data.user) {
            const avatarImg = document.getElementById('avatar-img');
            const nameElement = document.querySelector('h2.text-2xl.font-bold');
            const emailElement = document.querySelector('p.text-gray-600.mt-2');
            
            if (avatarImg) avatarImg.src = data.user.AVARTAR_URL || 'https://i.imgur.com/2Nv5jVb.png';
            if (nameElement) nameElement.textContent = data.user.TEN_NGUOI_DUNG || 'Chưa có tên';
            if (emailElement) emailElement.textContent = `📧 ${data.user.EMAIL_ || 'Chưa có email'}`;
            
            const errorMessage = document.querySelector('.error-message');
            if (errorMessage && data.user.TEN_NGUOI_DUNG && data.user.EMAIL_) errorMessage.remove();
          }
        }
      } catch (error) {
        console.error('Lỗi:', error);
        alert('Có lỗi khi cập nhật hồ sơ!');
      } finally {
        saveButton.disabled = false;
        loadingIcon.classList.add('hidden');
      }
    });
  });

    



