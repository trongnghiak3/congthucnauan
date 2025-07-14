   function toggleReplies(id) {
      const rows = document.querySelectorAll(`.reply-row[data-group="${id}"]`);
      const header = document.querySelector(`.group-header[onclick="toggleReplies('${id}')"]`);
      const icon = header.querySelector('.toggle-icon');
      
      rows.forEach(row => {
        row.classList.toggle('hidden');
        if (!row.classList.contains('hidden')) {
          row.style.opacity = '0';
          row.style.transform = 'translateY(-10px)';
          setTimeout(() => {
            row.style.opacity = '1';
            row.style.transform = 'translateY(0)';
            row.style.transition = 'all 0.3s ease';
          }, 10);
        }
      });
      
      icon.style.transform = rows[0].classList.contains('hidden') 
        ? 'rotate(0deg)' 
        : 'rotate(-180deg)';
    }
function confirmDeleteReply(id) {
  if (confirm("Phản hồi này có thể có phản hồi con. Bạn có chắc chắn muốn xóa tất cả không?")) {
    fetch(`/admin/phan-hoi-binh-luan/${id}`, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
      },
    })
    .then(async res => {
      const result = await res.json();
      if (res.ok) {
        showAdminNotification("🗑️ Xóa phản hồi thành công!");
        loadPage("/admin/phan-hoi-binh-luan?page=1", document.querySelector("#content"));
      } else {
        showAdminNotification(result.message || "❌ Xóa thất bại", 'error');
      }
    })
    .catch(err => {
      showAdminNotification("⚠️ Lỗi server: " + err.message, 'error');
    });
  }
}

//   return replyMap[parentId].map((reply, idx) => `
//   <tr>
//     ...
//     <td class="p-3" style="padding-left: ${depth * 24}px">
//       ${'⤷ '.repeat(depth)}${reply.NOI_DUNG_PH}
//     </td>
//     ...
//   </tr>
// `);
 function replyTo(parentId) {
    // Hiển thị modal trả lời hoặc chuyển hướng trang để nhập phản hồi con
    alert("Trả lời phản hồi ID cha: " + parentId);
    // TODO: mở form trả lời tương ứng
  }
      function bindphbinhluanEventListeners() {
  console.log('Gọi  cho /admin/phan-hoi-binh-luan tại', new Date().toISOString());
  // Hiện tại không có form hoặc hành động cần gắn sự kiện
  // Có thể thêm logic sau nếu cần (ví dụ: lọc, tìm kiếm)
}