function toggleReplyEmotions(groupId) {
  document.querySelectorAll(`.emotion-row[data-group="${groupId}"]`)
    .forEach(row => row.classList.toggle('hidden'));
}

function bindPhanHoiCamXucEventListeners() {
  console.log('Gọi cho /admin/phan-hoi-cam-xuc tại', new Date().toISOString());
}