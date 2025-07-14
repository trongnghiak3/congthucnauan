function bindCamXucBinhLuanEventListeners() {
  console.log('Gọi cho /admin/cam-xuc-binh-luan tại', new Date().toISOString());
}
function toggleEmotions(groupId) {
  document.querySelectorAll(`.emotion-row[data-group="${groupId}"]`)
    .forEach(row => row.classList.toggle('hidden'));
}