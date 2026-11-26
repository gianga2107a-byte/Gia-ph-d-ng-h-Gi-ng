(() => {
  'use strict';
  const STORAGE_KEY = 'gia-pha-nha-minh.v1';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const content = $('#content');
  const modalRoot = $('#modal-root');
  let members = loadMembers();
  let view = 'overview';
  let query = '';
  let treeRootId = '';

  function loadMembers() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(saved) ? saved.filter(item => item && typeof item.id === 'string' && typeof item.name === 'string') : [];
    } catch { return []; }
  }
  function saveMembers() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
      return true;
    } catch {
      toast('Không thể lưu. Bộ nhớ trình duyệt có thể đã đầy.', true);
      return false;
    }
  }
  function esc(value = '') {
    return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  }
  function makeId() { return globalThis.crypto?.randomUUID?.() || `mem-${Date.now()}-${Math.random().toString(36).slice(2,9)}`; }
  function getMember(id) { return members.find(member => member.id === id); }
  function sorted(items = members) {
    return [...items].sort((a,b) => (a.birthDate || '9999').localeCompare(b.birthDate || '9999') || a.name.localeCompare(b.name, 'vi'));
  }
  function dateText(value) {
    if (!value) return '';
    const parts = value.split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : value;
  }
  function yearText(value) { return value ? value.slice(0,4) : ''; }
  function initials(name) { return (name || '?').trim().split(/\s+/).slice(-2).map(part => part[0] || '').join('').toLocaleUpperCase('vi'); }
  function genderClass(gender) { return gender === 'Nữ' ? 'female' : (gender === 'Khác' ? 'other' : ''); }
  function lifespan(member) {
    const birth = yearText(member.birthDate), death = yearText(member.deathDate);
    if (birth && death) return `${birth} – ${death}`;
    if (birth) return `Sinh năm ${birth}`;
    if (death) return `Mất năm ${death}`;
    return member.gender || 'Chưa bổ sung ngày sinh';
  }
  function relationsFor(member) {
    const parents = (member.parents || []).map(getMember).filter(Boolean);
    const spouses = (member.spouses || []).map(getMember).filter(Boolean);
    const children = members.filter(person => (person.parents || []).includes(member.id));
    return {parents, spouses, children};
  }
  function generationOf(id, seen = new Set()) {
    if (seen.has(id)) return 0;
    seen.add(id);
    const person = getMember(id);
    const parentDepths = (person?.parents || []).filter(getMember).map(parentId => generationOf(parentId, new Set(seen)));
    return parentDepths.length ? Math.max(...parentDepths) + 1 : 0;
  }
  function toast(message, isError = false) {
    const node = document.createElement('div');
    node.className = `toast${isError ? ' error' : ''}`;
    node.textContent = message;
    $('#toast-root').append(node);
    setTimeout(() => node.remove(), 3200);
  }
  function updateNav() {
    $$('.nav-item[data-view]').forEach(button => button.classList.toggle('active', button.dataset.view === view));
    $('#nav-count').textContent = String(members.length);
    const names = {overview:'TỔNG QUAN',tree:'CÂY GIA PHẢ',members:'THÀNH VIÊN'};
    $('#breadcrumb').innerHTML = `GIA ĐÌNH <span>/</span> ${names[view] || 'TỔNG QUAN'}`;
  }
  function personCard(member, compact = false) {
    const {parents, spouses, children} = relationsFor(member);
    const relationHtml = [];
    if (parents.length) relationHtml.push(`<div><strong>Cha mẹ:</strong> ${parents.map(p => esc(p.name)).join(' · ')}</div>`);
    if (spouses.length) relationHtml.push(`<div><strong>Vợ/chồng:</strong> ${spouses.map(p => esc(p.name)).join(' · ')}</div>`);
    if (children.length) relationHtml.push(`<div><strong>Con:</strong> ${children.length} thành viên</div>`);
    if (member.notes && !compact) relationHtml.push(`<div class="member-note">${esc(member.notes).replace(/\n/g,'<br>')}</div>`);
    return `<article class="member-card" data-member-card="${esc(member.id)}">
      <div class="member-card-top"><div class="avatar ${genderClass(member.gender)}">${esc(initials(member.name))}</div>
        <div class="member-card-title"><h3 class="member-name" title="${esc(member.name)}">${esc(member.name)}</h3><div class="member-meta">${esc(lifespan(member))}</div></div>
        <div class="member-card-actions"><button class="icon-button" title="Xem trên cây gia phả" aria-label="Xem ${esc(member.name)} trên cây gia phả" data-action="tree" data-id="${esc(member.id)}">⌘</button><button class="icon-button" title="Chỉnh sửa" aria-label="Sửa ${esc(member.name)}" data-action="edit" data-id="${esc(member.id)}">✎</button><button class="icon-button" title="Xóa" aria-label="Xóa ${esc(member.name)}" data-action="delete" data-id="${esc(member.id)}">×</button></div>
      </div>${relationHtml.length ? `<div class="member-detail">${relationHtml.join('')}</div>` : ''}</article>`;
  }
  function emptyState(title, description, buttonText = '＋ Thêm thành viên') {
    return `<div class="empty-state"><div class="empty-icon" aria-hidden="true">♧</div><h3>${title}</h3><p>${description}</p><button class="button button-primary" data-action="add">${buttonText}</button></div>`;
  }
  function renderOverview() {
    const generations = members.length ? new Set(members.map(member => generationOf(member.id))).size : 0;
    const recent = sorted().slice(-3).reverse();
    return `<section class="welcome-row"><div><div class="eyebrow">DẤU VẾT QUA CÁC THẾ HỆ</div><h1 class="page-title">Chuyện nhà mình</h1><p class="page-subtitle">Từng cái tên, từng câu chuyện — cùng nhau gìn giữ ký ức gia đình.</p></div><button class="button button-primary" data-action="add">＋ Thêm thành viên</button></section>
      <section class="stats-row" aria-label="Tổng quan gia đình"><div class="stat-card"><div class="stat-label">Thành viên</div><div class="stat-number">${members.length}</div><div class="stat-note">được lưu trong sổ gia đình</div></div><div class="stat-card"><div class="stat-label">Thế hệ</div><div class="stat-number">${generations}</div><div class="stat-note">đang được ghi lại</div></div><div class="stat-card"><div class="stat-label">Cặp đôi</div><div class="stat-number">${members.filter(m => (m.spouses || []).some(id => m.id < id)).length}</div><div class="stat-note">mối liên kết gia đình</div></div></section>
      ${members.length ? `<section class="welcome-banner"><div class="banner-copy"><div class="banner-eyebrow">GIA PHẢ ĐƯỢC VIẾT TỪ NHỮNG CÂU CHUYỆN</div><h2 class="banner-title">Mỗi thành viên là một nhánh yêu thương.</h2><p class="banner-subtitle">Bổ sung thông tin và kết nối các thế hệ để cây gia đình dần thành hình.</p></div><button class="button" data-view="tree">Xem cây gia phả <span>→</span></button></section>
      <div class="section-heading"><h2>Thành viên gần đây</h2><button class="text-link" data-view="members">Xem tất cả →</button></div><div class="members-grid">${recent.map(member => personCard(member, true)).join('')}</div>` : `<section class="welcome-banner"><div class="banner-copy"><div class="banner-eyebrow">KHỞI ĐẦU CUỐN SỔ GIA ĐÌNH</div><h2 class="banner-title">Kể lại câu chuyện của nhà mình.</h2><p class="banner-subtitle">Thêm thành viên đầu tiên, rồi kết nối các thế hệ để tạo nên cây gia phả của riêng bạn.</p></div><button class="button" data-action="add">＋ Bắt đầu ghi chép</button></section><div class="section-heading"><h2>Bắt đầu từ một cái tên</h2></div>${emptyState('Cuốn sổ của bạn đang chờ câu chuyện đầu tiên','Thêm thông tin một thành viên để bắt đầu xây dựng gia phả. Dữ liệu được lưu riêng trên trình duyệt này.')}`}`;
  }
  function renderMembers() {
    const items = sorted();
    return `<section class="welcome-row"><div><div class="eyebrow">SỔ GIA ĐÌNH</div><h1 class="page-title">Thành viên</h1><p class="page-subtitle">${members.length ? 'Những người làm nên câu chuyện gia đình.' : 'Thêm thành viên và giữ lại dấu mốc của mỗi người.'}</p></div><button class="button button-primary" data-action="add">＋ Thêm thành viên</button></section>
      ${items.length ? `<div class="list-toolbar"><span class="result-count">${items.length} ${items.length === 1 ? 'thành viên' : 'thành viên'}</span><span class="result-count">Sắp xếp theo năm sinh</span></div><div class="members-grid">${items.map(member => personCard(member)).join('')}</div>` : emptyState('Chưa có thành viên nào','Ghi lại thành viên đầu tiên để bắt đầu tạo cây gia phả.')}`;
  }
  function treePerson(member, root = false) {
    const spouses = sorted((member.spouses || []).map(getMember).filter(Boolean));
    const card = person => `<div class="tree-person ${root ? 'root' : ''}"><div class="avatar ${genderClass(person.gender)}">${esc(initials(person.name))}</div><div class="member-name" title="${esc(person.name)}">${esc(person.name)}</div><div class="member-meta">${esc(lifespan(person))}</div><div class="tree-person-tools"><button class="icon-button" data-action="edit" data-id="${esc(person.id)}" aria-label="Sửa ${esc(person.name)}" title="Sửa">✎</button></div></div>`;
    return `<div class="tree-pair">${card(member)}${spouses.map(spouse => `<span class="tree-pair-mark" title="Vợ/chồng">♥</span>${card(spouse)}`).join('')}</div>`;
  }
  function treeNode(id, ancestors = new Set(), root = false, rendered = new Set()) {
    const person = getMember(id);
    if (!person || ancestors.has(id) || rendered.has(id)) return '';
    rendered.add(id);
    const next = new Set(ancestors); next.add(id);
    const parentIds = [id, ...(person.spouses || [])];
    const children = sorted(members.filter(item => (item.parents || []).some(parentId => parentIds.includes(parentId))));
    const childHtml = children.map(child => treeNode(child.id, next, false, rendered)).filter(Boolean).join('');
    return `<li class="tree-item">${treePerson(person, root)}${childHtml ? `<div class="tree-children"><ul class="tree-list">${childHtml}</ul></div>` : ''}</li>`;
  }
  function renderTree() {
    if (!members.length) return `<section class="welcome-row"><div><div class="eyebrow">CÁC THẾ HỆ</div><h1 class="page-title">Cây gia phả</h1><p class="page-subtitle">Những mối liên hệ làm nên gia đình.</p></div></section>${emptyState('Cây gia đình sẽ bắt đầu từ đây','Thêm thành viên và nối các quan hệ cha mẹ, vợ/chồng để nhìn thấy gia phả lớn dần.')}`;
    const options = sorted().map(member => `<option value="${esc(member.id)}" ${member.id === treeRootId ? 'selected' : ''}>${esc(member.name)}${member.birthDate ? ` · ${yearText(member.birthDate)}` : ''}</option>`).join('');
    const root = getMember(treeRootId) || sorted()[0];
    if (!getMember(treeRootId)) treeRootId = root.id;
    const descendantCount = (() => { const found = new Set(); const walk = id => { const person = getMember(id); const parentIds = [id, ...(person?.spouses || [])]; members.filter(m => (m.parents || []).some(parentId => parentIds.includes(parentId))).forEach(child => { if (!found.has(child.id)) { found.add(child.id); walk(child.id); } }); }; walk(root.id); return found.size; })();
    return `<section class="welcome-row"><div><div class="eyebrow">CÁC THẾ HỆ</div><h1 class="page-title">Cây gia phả</h1><p class="page-subtitle">Bắt đầu từ một thành viên để khám phá những nhánh gia đình.</p></div><button class="button button-primary" data-action="add">＋ Thêm thành viên</button></section>
      <section class="tree-panel"><div class="tree-toolbar"><label>Chọn người làm điểm bắt đầu<select id="tree-root-select" aria-label="Chọn thành viên gốc">${options}</select></label><span class="result-count">${descendantCount} hậu duệ được kết nối</span></div><div class="tree-canvas"><ul class="tree-list">${treeNode(root.id, new Set(), true)}</ul></div><div class="tree-key"><span><i></i> Thành viên</span><span><i class="key-two"></i> Vợ / chồng</span></div></section>
      ${descendantCount === 0 ? `<div class="tree-empty">Chưa có con được kết nối với ${esc(root.name)}. Mở hồ sơ thành viên và chọn cha/mẹ để nối các thế hệ trong cây.</div>` : ''}`;
  }
  function renderSearch() {
    const term = query.trim().toLocaleLowerCase('vi');
    const found = sorted().filter(member => { const links = relationsFor(member); return [member.name, member.gender, member.birthDate, member.deathDate, member.notes, ...links.parents.map(person => person.name), ...links.spouses.map(person => person.name), ...links.children.map(person => person.name)].join(' ').toLocaleLowerCase('vi').includes(term); });
    return `<div class="eyebrow">TRA CỨU GIA ĐÌNH</div><h1 class="page-title">Kết quả tìm kiếm</h1><p class="page-subtitle">${found.length} kết quả cho “${esc(query)}”</p><h2 class="search-results-heading">Thành viên phù hợp</h2>${found.length ? `<div class="members-grid">${found.map(m => personCard(m)).join('')}</div>` : `<div class="no-results">Không tìm thấy thành viên phù hợp. Hãy thử một tên khác.</div>`}`;
  }
  function render() {
    updateNav();
    content.innerHTML = query.trim() ? renderSearch() : (view === 'tree' ? renderTree() : view === 'members' ? renderMembers() : renderOverview());
  }
  function openForm(id = '') {
    const existing = getMember(id);
    const available = sorted().filter(person => person.id !== id);
    const options = (selected = []) => `<option value="">— Chưa chọn —</option>${available.map(person => `<option value="${esc(person.id)}" ${selected.includes(person.id) ? 'selected' : ''}>${esc(person.name)}${person.birthDate ? ` · ${yearText(person.birthDate)}` : ''}</option>`).join('')}`;
    const spouseOptions = available.map(person => `<option value="${esc(person.id)}" ${(existing?.spouses || []).includes(person.id) ? 'selected' : ''}>${esc(person.name)}</option>`).join('');
    modalRoot.innerHTML = `<div class="modal-backdrop" data-backdrop><section class="modal" role="dialog" aria-modal="true" aria-labelledby="member-form-title"><header class="modal-head"><div><h2 class="modal-title" id="member-form-title">${existing ? 'Sửa hồ sơ thành viên' : 'Thêm thành viên'}</h2><p class="modal-subtitle">Ghi lại thông tin để gìn giữ câu chuyện gia đình.</p></div><button class="icon-button" data-action="close-modal" aria-label="Đóng">×</button></header>
      <form id="member-form" class="modal-body" data-id="${esc(id)}"><div class="form-grid">
        <div class="field full"><label for="member-name">Họ và tên <span aria-hidden="true">*</span></label><input id="member-name" name="name" required maxlength="100" placeholder="Ví dụ: Nguyễn Văn An" value="${esc(existing?.name || '')}"></div>
        <div class="field"><label for="member-gender">Giới tính</label><select id="member-gender" name="gender"><option value="">Chưa xác định</option>${['Nam','Nữ','Khác'].map(value => `<option ${existing?.gender === value ? 'selected' : ''}>${value}</option>`).join('')}</select></div>
        <div class="field"><label for="member-birth">Ngày sinh</label><input id="member-birth" name="birthDate" type="date" value="${esc(existing?.birthDate || '')}"></div>
        <div class="field"><label for="member-death">Ngày mất</label><input id="member-death" name="deathDate" type="date" value="${esc(existing?.deathDate || '')}"></div>
        <div class="form-section-label">KẾT NỐI GIA ĐÌNH</div>
        <div class="field"><label for="member-parent1">Cha / phụ huynh</label><select id="member-parent1" name="parent1">${options(existing?.parents || [])}</select></div>
        <div class="field"><label for="member-parent2">Mẹ / phụ huynh</label><select id="member-parent2" name="parent2">${options(existing?.parents || [])}</select></div>
        <div class="field full"><label for="member-spouses">Vợ / chồng</label><select id="member-spouses" name="spouses" multiple size="${Math.min(4, Math.max(2, available.length))}">${spouseOptions}</select><span class="field-hint">Có thể chọn nhiều người bằng cách giữ Ctrl (Windows) hoặc ⌘ (Mac) khi bấm.</span></div>
        <div class="form-section-label">DẤU MỐC VÀ GHI CHÚ</div>
        <div class="field full"><label for="member-notes">Ghi chú / câu chuyện</label><textarea id="member-notes" name="notes" maxlength="2000" placeholder="Nơi sinh, nghề nghiệp, kỷ niệm đáng nhớ…">${esc(existing?.notes || '')}</textarea></div>
      </div><div class="modal-foot">${existing ? `<button type="button" class="button button-danger" data-action="delete" data-id="${esc(id)}">Xóa hồ sơ</button>` : '<span></span>'}<div class="modal-foot-right"><button type="button" class="button button-secondary" data-action="close-modal">Hủy</button><button type="submit" class="button button-primary">${existing ? 'Lưu thay đổi' : 'Thêm vào gia phả'}</button></div></div></form></section></div>`;
    $('#member-name')?.focus();
  }
  function isDescendant(possibleDescendantId, ancestorId, seen = new Set()) {
    if (possibleDescendantId === ancestorId) return true;
    if (seen.has(ancestorId)) return false;
    seen.add(ancestorId);
    const children = members.filter(m => (m.parents || []).includes(ancestorId));
    return children.some(child => isDescendant(possibleDescendantId, child.id, seen));
  }
  function submitForm(form) {
    const data = new FormData(form);
    const id = form.dataset.id;
    const existing = getMember(id);
    const name = String(data.get('name') || '').trim();
    if (!name) { toast('Vui lòng nhập họ và tên.', true); return; }
    const birthDate = String(data.get('birthDate') || ''), deathDate = String(data.get('deathDate') || '');
    if (birthDate && deathDate && deathDate < birthDate) { toast('Ngày mất không thể trước ngày sinh.', true); return; }
    const parentIds = [String(data.get('parent1') || ''), String(data.get('parent2') || '')].filter(Boolean);
    if (new Set(parentIds).size !== parentIds.length) { toast('Hãy chọn hai phụ huynh khác nhau.', true); return; }
    if (parentIds.some(parentId => isDescendant(parentId, id || '__new__'))) { toast('Quan hệ này sẽ tạo vòng lặp trong cây gia phả.', true); return; }
    const spouseIds = [...$('#member-spouses').selectedOptions].map(option => option.value).filter(Boolean);
    if (parentIds.some(parentId => spouseIds.includes(parentId))) { toast('Một thành viên không thể vừa là phụ huynh vừa là vợ/chồng.', true); return; }
    const previousMembers = JSON.parse(JSON.stringify(members));
    const memberId = id || makeId();
    const record = {id: memberId, name, gender: String(data.get('gender') || ''), birthDate, deathDate, parents: parentIds, spouses: spouseIds, notes: String(data.get('notes') || '').trim()};
    if (existing) {
      (existing.spouses || []).forEach(oldId => { const old = getMember(oldId); if (old) old.spouses = (old.spouses || []).filter(otherId => otherId !== memberId); });
      Object.assign(existing, record);
    } else members.push(record);
    spouseIds.forEach(spouseId => { const spouse = getMember(spouseId); if (spouse && !spouse.spouses.includes(memberId)) spouse.spouses.push(memberId); });
    if (saveMembers()) {
      modalRoot.innerHTML = '';
      render();
      toast(existing ? 'Đã cập nhật hồ sơ thành viên.' : 'Đã thêm thành viên vào gia phả.');
    } else members = previousMembers;
  }
  function deleteMember(id) {
    const member = getMember(id);
    if (!member) return;
    if (!confirm(`Xóa hồ sơ “${member.name}”? Quan hệ với thành viên khác cũng sẽ được gỡ.`)) return;
    const previousMembers = JSON.parse(JSON.stringify(members));
    const previousRootId = treeRootId;
    members = members.filter(person => person.id !== id);
    members.forEach(person => { person.parents = (person.parents || []).filter(otherId => otherId !== id); person.spouses = (person.spouses || []).filter(otherId => otherId !== id); });
    if (treeRootId === id) treeRootId = '';
    if (saveMembers()) { modalRoot.innerHTML = ''; render(); toast('Đã xóa hồ sơ thành viên.'); }
    else { members = previousMembers; treeRootId = previousRootId; }
  }
  function exportData() {
    const payload = {format:'gia-pha-nha-minh', version:1, exportedAt:new Date().toISOString(), members};
    const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `gia-pha-${new Date().toISOString().slice(0,10)}.json`;
    document.body.append(link); link.click(); link.remove(); URL.revokeObjectURL(url);
    toast('Đã tải tệp sao lưu gia phả.');
  }
  async function importFile(file) {
    if (!file) return;
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('Tệp lớn hơn giới hạn 5 MB.');
      const parsed = JSON.parse(await file.text());
      const records = Array.isArray(parsed) ? parsed : parsed?.members;
      if (!Array.isArray(records)) throw new Error('Tệp không có danh sách thành viên hợp lệ.');
      if (records.some(person => !person || typeof person.name !== 'string' || !person.name.trim())) throw new Error('Mỗi hồ sơ cần có họ tên hợp lệ.');
      if (!confirm(`Khôi phục ${records.length} hồ sơ? Dữ liệu hiện tại trong trình duyệt sẽ được thay thế.`)) return;
      const previousMembers = members;
      const ids = new Set();
      members = records.map(person => {
        const nextId = typeof person.id === 'string' && !ids.has(person.id) ? person.id : makeId(); ids.add(nextId);
        return {id:nextId, name:String(person.name).trim().slice(0,100), gender:['Nam','Nữ','Khác'].includes(person.gender) ? person.gender : '', birthDate:typeof person.birthDate === 'string' ? person.birthDate : '', deathDate:typeof person.deathDate === 'string' ? person.deathDate : '', notes:typeof person.notes === 'string' ? person.notes.slice(0,2000) : '', parents:Array.isArray(person.parents) ? person.parents.filter(id => typeof id === 'string') : [], spouses:Array.isArray(person.spouses) ? person.spouses.filter(id => typeof id === 'string') : []};
      });
      const valid = new Set(members.map(person => person.id));
      members.forEach(person => { person.parents = [...new Set(person.parents.filter(id => id !== person.id && valid.has(id)))]; person.spouses = [...new Set(person.spouses.filter(id => id !== person.id && valid.has(id)))]; });
      // Restore symmetric spouse links in imported archives.
      members.forEach(person => person.spouses.forEach(id => { const spouse = getMember(id); if (spouse && !spouse.spouses.includes(person.id)) spouse.spouses.push(person.id); }));
      if (saveMembers()) { view = 'overview'; query = ''; $('#search-input').value = ''; render(); toast(`Đã khôi phục ${members.length} hồ sơ.`); }
      else members = previousMembers;
    } catch (error) { toast(error instanceof SyntaxError ? 'Tệp JSON không đọc được.' : (error.message || 'Không thể khôi phục tệp.'), true); }
  }

  document.addEventListener('click', event => {
    const viewButton = event.target.closest('[data-view]');
    if (viewButton) { view = viewButton.dataset.view; query = ''; $('#search-input').value = ''; render(); return; }
    const actionButton = event.target.closest('[data-action]');
    if (actionButton) {
      const {action, id} = actionButton.dataset;
      if (action === 'add') openForm();
      if (action === 'edit') openForm(id);
      if (action === 'delete') deleteMember(id);
      if (action === 'tree') { view = 'tree'; treeRootId = id; query = ''; $('#search-input').value = ''; render(); }
      if (action === 'export') exportData();
      if (action === 'import') $('#import-file').click();
      if (action === 'close-modal') modalRoot.innerHTML = '';
      return;
    }
    if (event.target.matches('[data-backdrop]')) modalRoot.innerHTML = '';
  });
  document.addEventListener('submit', event => {
    if (event.target.id === 'member-form') { event.preventDefault(); submitForm(event.target); }
  });
  $('#content').addEventListener('change', event => { if (event.target.id === 'tree-root-select') { treeRootId = event.target.value; render(); } });
  $('#search-input').addEventListener('input', event => { query = event.target.value; render(); event.target.focus(); });
  $('#add-member-top').addEventListener('click', () => openForm());
  $('#export-button').addEventListener('click', exportData);
  $('#import-button').addEventListener('click', () => $('#import-file').click());
  $('#import-file').addEventListener('change', event => { importFile(event.target.files?.[0]); event.target.value = ''; });
  document.addEventListener('keydown', event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); $('#search-input').focus(); }
    if (event.key === 'Escape' && modalRoot.innerHTML) modalRoot.innerHTML = '';
  });
  render();
})();
