(() => {
  const directory = window.OMAN_VILLAGES || {};
  const wilaya = document.querySelector('#hostWilaya');
  const majlis = document.querySelector('#hostMajlis');
  const other = document.querySelector('#hostMajlisOther');
  if (!wilaya || !majlis) return;

  const currentWilaya = wilaya.value;
  const names = Object.keys(directory);
  wilaya.innerHTML = '<option value="">اختر الولاية</option>' + names.map(n => `<option value="${n}">${n}</option>`).join('');
  if (currentWilaya && directory[currentWilaya]) wilaya.value = currentWilaya;

  function fill() {
    const list = directory[wilaya.value] || [];
    majlis.disabled = !wilaya.value;
    if (!wilaya.value) {
      majlis.innerHTML = '<option value="">اختر الولاية أولًا</option>';
      return;
    }
    majlis.innerHTML = '<option value="">اختر المجلس / القرية</option>' + list.map(v => `<option value="${v}">${v}</option>`).join('') + '<option value="__other__">أخرى…</option>';
    if (other) { other.value=''; other.classList.add('hidden'); }
  }

  wilaya.addEventListener('change', () => setTimeout(fill, 0));
  majlis.addEventListener('change', () => {
    if (!other) return;
    const show = majlis.value === '__other__';
    other.classList.toggle('hidden', !show);
    if (show) setTimeout(()=>other.focus(),30);
  });
  fill();
})();
