/* Фрил-Бух — простая бухгалтерия для фрилансера. */
(function () {
  'use strict';

  /* ==================== Утилиты ==================== */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const esc = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  const uid = () => (window.crypto && crypto.randomUUID)
    ? crypto.randomUUID()
    : 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);

  const pad = (n) => String(n).padStart(2, '0');
  const toISO = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const todayISO = () => toISO(new Date());
  const addDays = (date, days) => {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    d.setDate(d.getDate() + days);
    return d;
  };
  const parseISO = (iso) => {
    const parts = String(iso || '').split('-').map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return new Date();
    return new Date(parts[0], parts[1] - 1, parts[2]);
  };
  const round2 = (n) => Math.round(Number(n) * 100) / 100;
  const num = (v) => {
    const n = Number(String(v == null ? '' : v).replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  };
  const str = (v) => (v == null ? '' : String(v));

  const plural = (n, forms) => {
    const abs = Math.abs(n) % 100;
    const last = abs % 10;
    if (abs > 10 && abs < 20) return forms[2];
    if (last > 1 && last < 5) return forms[1];
    if (last === 1) return forms[0];
    return forms[2];
  };

  const debounce = (fn, wait) => {
    let t;
    return function () {
      const args = arguments;
      clearTimeout(t);
      t = setTimeout(() => fn.apply(null, args), wait);
    };
  };

  /* ==================== Константы ==================== */
  const VERSION = '1.0.0';
  const IDLE_LOCK_MS = 5 * 60 * 1000;

  const CATEGORIES = [
    { id: 'dev', label: 'Разработка', color: '#0f766e' },
    { id: 'design', label: 'Дизайн', color: '#7c3aed' },
    { id: 'support', label: 'Поддержка', color: '#2563eb' },
    { id: 'consult', label: 'Консультация', color: '#d97706' },
    { id: 'repair', label: 'Ремонт', color: '#dc2626' },
    { id: 'other', label: 'Другое', color: '#64748b' }
  ];

  const METHODS = {
    cash: 'Наличные',
    card: 'Карта',
    transfer: 'Перевод',
    online: 'Онлайн',
    other: 'Другое'
  };

  const CURRENCIES = ['RUB', 'USD', 'EUR', 'KZT', 'GEL', 'UAH', 'BYN'];
  const CURRENCY_SYMBOL = { RUB: '₽', USD: '$', EUR: '€', KZT: '₸', GEL: '₾', UAH: '₴', BYN: 'Br' };

  const ICO = {
    edit: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
    trash: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/><path d="M10 11v5M14 11v5"/></svg>',
    phone: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2z"/></svg>',
    mail: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="4.5" width="19" height="15" rx="2.4"/><path d="m3 6 9 7 9-7"/></svg>'
  };

  /* ==================== Состояние ==================== */
  const state = {
    clients: [],
    works: [],
    payments: [],
    trash: [],
    currency: 'RUB',
    themeMode: 'auto',
    pin: null,
    view: 'overview',
    locked: false,
    overviewPeriod: 'month',
    clientsQuery: '',
    clientsMode: 'all',
    clientsSort: 'name',
    worksPeriod: 'month',
    worksClient: '',
    worksQuery: '',
    moneyPeriod: 'month',
    moneyClient: '',
    moneyQuery: '',
    detailId: null,
    editingWork: null,
    editingPayment: null
  };

  /* ==================== Форматирование ==================== */
  const moneyForms = {};

  function fmtMoney(value) {
    const amount = Number(value) || 0;
    const code = state.currency;
    if (!moneyForms[code]) {
      try {
        moneyForms[code] = new Intl.NumberFormat('ru-RU', {
          style: 'currency', currency: code, minimumFractionDigits: 0, maximumFractionDigits: 2
        });
      } catch (e) {
        moneyForms[code] = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
      }
    }
    const text = moneyForms[code].format(Math.abs(amount) < 0.005 ? 0 : amount);
    return text.replace(/\u00a0/g, ' ');
  }

  function fmtHours(hours) {
    const h = Math.round((Number(hours) || 0) * 100) / 100;
    return h.toLocaleString('ru-RU', { maximumFractionDigits: 2 }) + ' ч';
  }

  function fmtDate(iso) {
    return parseISO(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).replace('.', '');
  }

  function fmtDayLabel(iso) {
    const today = todayISO();
    if (iso === today) return 'Сегодня';
    if (iso === toISO(addDays(new Date(), -1))) return 'Вчера';
    return parseISO(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' });
  }

  function timeRange(start, end) {
    if (start && end) return start + '–' + end;
    if (start) return 'с ' + start;
    if (end) return 'до ' + end;
    return '';
  }

  const categoryById = (id) => CATEGORIES.find((c) => c.id === id) || null;

  /* ==================== Периоды ==================== */
  function periodStart(period) {
    const now = new Date();
    if (period === 'today') return todayISO();
    if (period === 'week') return toISO(addDays(now, -6));
    if (period === 'month') return toISO(new Date(now.getFullYear(), now.getMonth(), 1));
    if (period === 'prev') return toISO(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    return null;
  }

  function periodEnd(period) {
    const now = new Date();
    if (period === 'prev') return toISO(new Date(now.getFullYear(), now.getMonth(), 0));
    return null;
  }

  function inPeriod(dateISO, period) {
    if (!period || period === 'all') return true;
    const start = periodStart(period);
    const end = periodEnd(period);
    if (start && dateISO < start) return false;
    if (end && dateISO > end) return false;
    return true;
  }

  function periodLabel(period) {
    if (period === 'today') return 'сегодня';
    if (period === 'week') return 'последние 7 дней';
    if (period === 'month') return 'этот месяц';
    if (period === 'prev') return 'прошлый месяц';
    return 'всё время';
  }

  /* ==================== Производные данные ==================== */
  const clientById = (id) => state.clients.find((c) => c.id === id) || null;
  const clientName = (id) => {
    const c = clientById(id);
    return c ? c.name : 'Удалённый клиент';
  };

  function workRate(work) {
    if (typeof work.rate === 'number' && Number.isFinite(work.rate)) return work.rate;
    const c = clientById(work.clientId);
    return c ? num(c.rate) : 0;
  }

  const workAmount = (work) => round2((Number(work.hours) || 0) * workRate(work));

  function buildStats() {
    const map = new Map();
    state.clients.forEach((c) => map.set(c.id, { hours: 0, earned: 0, paid: 0, balance: 0 }));
    state.works.forEach((w) => {
      const s = map.get(w.clientId);
      if (!s) return;
      s.hours += num(w.hours);
      s.earned += workAmount(w);
    });
    state.payments.forEach((p) => {
      const s = map.get(p.clientId);
      if (!s) return;
      s.paid += num(p.amount);
    });
    map.forEach((s) => {
      s.hours = round2(s.hours);
      s.earned = round2(s.earned);
      s.paid = round2(s.paid);
      s.balance = round2(s.paid - s.earned);
    });
    return map;
  }

  const sortByDateDesc = (a, b) => {
    if (a.date !== b.date) return String(b.date).localeCompare(String(a.date));
    return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
  };

  const sortedWorks = () => state.works.slice().sort(sortByDateDesc);
  const sortedPayments = () => state.payments.slice().sort(sortByDateDesc);
  const sortedClients = () => state.clients.slice().sort((a, b) => a.name.localeCompare(b.name, 'ru'));

  /* ==================== Рендер: общее ==================== */
  function markChips(container, key, value) {
    if (!container) return;
    $$('button', container).forEach((b) => {
      b.classList.toggle('is-active', b.dataset[key] === value);
    });
  }

  function fillClientSelect(select, placeholder, value) {
    if (!select) return;
    const signature = state.clients.map((c) => c.id + ':' + c.name).join('|') + '::' + placeholder;
    if (select.dataset.signature !== signature) {
      select.innerHTML = '<option value="">' + esc(placeholder) + '</option>' +
        sortedClients().map((c) => '<option value="' + esc(c.id) + '">' + esc(c.name) + '</option>').join('');
      select.dataset.signature = signature;
    }
    select.value = value || '';
    if (select.value !== (value || '')) select.value = '';
  }

  function balanceBadge(balance) {
    if (balance < -0.005) return '<span class="badge badge-debt">Долг ' + fmtMoney(Math.abs(balance)) + '</span>';
    if (balance > 0.005) return '<span class="badge badge-advance">Аванс ' + fmtMoney(balance) + '</span>';
    return '<span class="badge badge-zero">0 ₽</span>';
  }

  const editBtn = (action, id, label) =>
    '<button class="icon-btn sm" type="button" data-action="' + action + '" data-id="' + esc(id) + '" aria-label="' + label + '" title="' + label + '">' + ICO.edit + '</button>';
  const trashBtn = (action, id, label) =>
    '<button class="icon-btn sm danger" type="button" data-action="' + action + '" data-id="' + esc(id) + '" aria-label="' + label + '" title="' + label + '">' + ICO.trash + '</button>';

  function renderAll() {
    renderOverview();
    renderClients();
    renderWorks();
    renderMoney();
    updateSettingsUI();
    if (state.detailId) renderDetail();
  }

  /* ==================== Рендер: обзор ==================== */
  function renderOverview() {
    markChips($('#overviewPeriod'), 'period', state.overviewPeriod);

    const stats = buildStats();
    const works = state.works.filter((w) => inPeriod(w.date, state.overviewPeriod));
    const payments = state.payments.filter((p) => inPeriod(p.date, state.overviewPeriod));
    const earned = round2(works.reduce((sum, w) => sum + workAmount(w), 0));
    const paid = round2(payments.reduce((sum, p) => sum + num(p.amount), 0));
    const hours = round2(works.reduce((sum, w) => sum + num(w.hours), 0));

    const debtors = state.clients
      .map((c) => ({ client: c, stats: stats.get(c.id) }))
      .filter((row) => row.stats && row.stats.balance < -0.005)
      .sort((a, b) => a.stats.balance - b.stats.balance);
    const debtTotal = round2(debtors.reduce((sum, row) => sum + Math.abs(row.stats.balance), 0));

    const subs = {
      month: 'Сводка за этот месяц',
      prev: 'Сводка за прошлый месяц',
      all: 'Сводка за всё время'
    };
    $('#overviewSub').textContent = subs[state.overviewPeriod] || subs.month;

    $('#statEarned').textContent = fmtMoney(earned);
    $('#statEarnedHint').textContent = works.length + ' ' + plural(works.length, ['работа', 'работы', 'работ']);
    $('#statPaid').textContent = fmtMoney(paid);
    $('#statPaidHint').textContent = payments.length + ' ' + plural(payments.length, ['платёж', 'платежа', 'платежей']);
    $('#statHours').textContent = fmtHours(hours);
    $('#statHoursHint').textContent = 'за период';

    const debtCard = $('#statDebt').closest('.stat');
    $('#statDebt').textContent = fmtMoney(debtTotal);
    $('#statDebtHint').textContent = debtors.length
      ? 'Должников: ' + debtors.length
      : 'Долгов нет';
    debtCard.classList.toggle('is-clean', debtTotal < 0.005);

    $('#debtorsCount').textContent = debtors.length ? String(debtors.length) : '';
    $('#debtorsList').innerHTML = debtors.length
      ? debtors.slice(0, 4).map(({ client, stats: s }) => (
        '<button class="debtor-row" type="button" data-action="detail" data-id="' + esc(client.id) + '">' +
          '<span class="debtor-name"><strong>' + esc(client.name) + '</strong>' +
            '<span>' + fmtHours(s.hours) + ' · ' + fmtMoney(client.rate) + '/ч</span></span>' +
          '<span class="debtor-sum">' + fmtMoney(Math.abs(s.balance)) + '</span>' +
        '</button>'
      )).join('')
      : '<p class="detail-empty">Долгов нет — красота.</p>';

    const showDebtors = $('[data-action="show-debtors"]');
    if (showDebtors) showDebtors.disabled = debtors.length === 0;

    const recent = sortedWorks().slice(0, 5);
    $('#recentWorks').innerHTML = recent.length
      ? recent.map((w) => {
        const cat = categoryById(w.category);
        return '<button class="debtor-row" type="button" data-action="edit-work" data-id="' + esc(w.id) + '">' +
          '<span class="debtor-name"><strong>' + esc(clientName(w.clientId)) + '</strong>' +
            '<span>' + (cat ? esc(cat.label) : 'Без категории') + ' · ' + fmtDate(w.date) + ' · ' + fmtHours(w.hours) + '</span></span>' +
          '<span class="debtor-amount">' + fmtMoney(workAmount(w)) + '</span>' +
        '</button>';
      }).join('')
      : '<p class="detail-empty">Работ пока нет.</p>';

    $('#onboarding').hidden = state.clients.length > 0;
  }

  /* ==================== Рендер: клиенты ==================== */
  function clientCard(client, s) {
    return '<article class="client-card">' +
      '<div class="client-top">' +
        '<button class="client-open" type="button" data-action="detail" data-id="' + esc(client.id) + '">' +
          '<span class="client-name">' + esc(client.name) + '</span>' +
          '<span class="client-meta">' + fmtMoney(client.rate) + '/ч · ' + fmtHours(s.hours) + '</span>' +
        '</button>' +
        balanceBadge(s.balance) +
      '</div>' +
      '<div class="client-bar">' +
        '<span>Заработано <b>' + fmtMoney(s.earned) + '</b></span>' +
        '<span>Оплачено <b>' + fmtMoney(s.paid) + '</b></span>' +
      '</div>' +
      '<div class="client-actions">' +
        '<button class="btn btn-sm btn-primary" type="button" data-action="client-work" data-id="' + esc(client.id) + '">+ Часы</button>' +
        '<button class="btn btn-sm" type="button" data-action="client-pay" data-id="' + esc(client.id) + '">Оплата</button>' +
        editBtn('edit-client', client.id, 'Редактировать клиента') +
        trashBtn('delete-client', client.id, 'Удалить клиента') +
      '</div>' +
    '</article>';
  }

  function renderClients() {
    markChips($('#clientMode'), 'mode', state.clientsMode);
    const stats = buildStats();
    const q = state.clientsQuery.trim().toLowerCase();

    let list = state.clients.filter((c) => {
      if (!q) return true;
      return [c.name, c.phone, c.email, c.note].some((v) => str(v).toLowerCase().includes(q));
    });

    if (state.clientsMode === 'debt') {
      list = list.filter((c) => (stats.get(c.id) || {}).balance < -0.005);
    } else if (state.clientsMode === 'clean') {
      list = list.filter((c) => (stats.get(c.id) || {}).balance >= -0.005);
    }

    const sorters = {
      name: (a, b) => a.name.localeCompare(b.name, 'ru'),
      debt: (a, b) => (stats.get(a.id).balance - stats.get(b.id).balance) || a.name.localeCompare(b.name, 'ru'),
      rate: (a, b) => (num(b.rate) - num(a.rate)) || a.name.localeCompare(b.name, 'ru'),
      hours: (a, b) => (stats.get(b.id).hours - stats.get(a.id).hours) || a.name.localeCompare(b.name, 'ru')
    };
    list = list.slice().sort(sorters[state.clientsSort] || sorters.name);

    const debtTotal = round2(state.clients.reduce((sum, c) => {
      const s = stats.get(c.id);
      return sum + (s && s.balance < 0 ? Math.abs(s.balance) : 0);
    }, 0));

    const sub = state.clients.length
      ? state.clients.length + ' ' + plural(state.clients.length, ['клиент', 'клиента', 'клиентов']) +
        (debtTotal > 0.005 ? ' · долг ' + fmtMoney(debtTotal) : ' · долгов нет')
      : 'Пока никого нет';
    $('#clientsSub').textContent = sub;

    $('#clientsList').innerHTML = list.map((c) => clientCard(c, stats.get(c.id))).join('');

    const empty = $('#clientsEmpty');
    empty.hidden = list.length > 0;
    $('#clientsEmptyText').textContent = state.clients.length
      ? 'Ничего не найдено — попробуйте изменить фильтр.'
      : 'Клиентов пока нет. Добавьте первого — и можно вносить часы.';
    const emptyBtn = $('.btn', empty);
    if (emptyBtn) emptyBtn.hidden = state.clients.length > 0;
  }

  /* ==================== Рендер: работы ==================== */
  function renderWorks() {
    markChips($('#worksPeriod'), 'period', state.worksPeriod);
    fillClientSelect($('#worksClient'), 'Все клиенты', state.worksClient);
    const q = state.worksQuery.trim().toLowerCase();

    let list = state.works.filter((w) => inPeriod(w.date, state.worksPeriod));
    if (state.worksClient) list = list.filter((w) => w.clientId === state.worksClient);
    if (q) {
      list = list.filter((w) => clientName(w.clientId).toLowerCase().includes(q) || str(w.note).toLowerCase().includes(q));
    }
    list.sort(sortByDateDesc);

    const hours = round2(list.reduce((sum, w) => sum + num(w.hours), 0));
    const amount = round2(list.reduce((sum, w) => sum + workAmount(w), 0));
    $('#worksSub').textContent = list.length
      ? list.length + ' ' + plural(list.length, ['работа', 'работы', 'работ']) + ' · ' + fmtHours(hours) + ' · ' + fmtMoney(amount)
      : 'Почасовка по дням';

    const groups = new Map();
    list.forEach((w) => {
      if (!groups.has(w.date)) groups.set(w.date, []);
      groups.get(w.date).push(w);
    });

    let html = '';
    groups.forEach((items, date) => {
      const dayHours = round2(items.reduce((sum, w) => sum + num(w.hours), 0));
      const dayAmount = round2(items.reduce((sum, w) => sum + workAmount(w), 0));
      html += '<div class="day-group">' +
        '<div class="day-head"><span>' + esc(fmtDayLabel(date)) + '</span><span>' + fmtHours(dayHours) + ' · ' + fmtMoney(dayAmount) + '</span></div>' +
        items.map((w) => {
          const cat = categoryById(w.category);
          const sub = (cat
            ? '<span class="cat-dot" style="background:' + cat.color + '"></span>' + esc(cat.label)
            : 'Без категории') + (w.note ? ' · ' + esc(w.note) : '');
          const time = timeRange(w.start, w.end);
          return '<div class="work-row">' +
            '<div class="row-main"><strong>' + esc(clientName(w.clientId)) + '</strong>' +
              '<span class="row-sub">' + sub + '</span></div>' +
            '<div class="row-meta"><b>' + fmtHours(w.hours) + '</b>' + (time ? '<span>' + esc(time) + '</span>' : '') + '</div>' +
            '<div class="row-amount">' + fmtMoney(workAmount(w)) + '</div>' +
            '<div class="row-actions">' + editBtn('edit-work', w.id, 'Редактировать работу') + trashBtn('delete-work', w.id, 'Удалить работу') + '</div>' +
          '</div>';
        }).join('') +
      '</div>';
    });

    $('#worksList').innerHTML = html;

    const empty = $('#worksEmpty');
    empty.hidden = list.length > 0;
    $('#worksEmptyText').textContent = state.works.length
      ? 'Ничего не найдено — измените период или фильтр.'
      : 'Работ пока нет. Внесите часы — сумма посчитается по ставке клиента.';
    const emptyBtn = $('.btn', empty);
    if (emptyBtn) emptyBtn.hidden = state.works.length > 0;
  }

  /* ==================== Рендер: деньги ==================== */
  function renderMoney() {
    markChips($('#moneyPeriod'), 'period', state.moneyPeriod);
    fillClientSelect($('#moneyClient'), 'Все клиенты', state.moneyClient);
    const q = state.moneyQuery.trim().toLowerCase();

    let list = state.payments.filter((p) => inPeriod(p.date, state.moneyPeriod));
    if (state.moneyClient) list = list.filter((p) => p.clientId === state.moneyClient);
    if (q) {
      list = list.filter((p) => clientName(p.clientId).toLowerCase().includes(q) ||
        str(p.note).toLowerCase().includes(q) ||
        str(METHODS[p.method] || '').toLowerCase().includes(q));
    }
    list.sort(sortByDateDesc);

    const total = round2(list.reduce((sum, p) => sum + num(p.amount), 0));
    $('#moneyTotal').hidden = list.length === 0;
    $('#moneyTotalValue').textContent = fmtMoney(total);

    $('#moneyList').innerHTML = list.map((p) => {
      const method = METHODS[p.method] || 'Оплата';
      const sub = method + (p.note ? ' · ' + esc(p.note) : '');
      return '<div class="money-row">' +
        '<div class="row-main"><strong>' + esc(clientName(p.clientId)) + '</strong>' +
          '<span class="row-sub">' + sub + '</span></div>' +
        '<div class="row-meta">' + fmtDate(p.date) + '</div>' +
        '<div class="row-amount pos">+' + fmtMoney(p.amount) + '</div>' +
        '<div class="row-actions">' + editBtn('edit-payment', p.id, 'Редактировать оплату') + trashBtn('delete-payment', p.id, 'Удалить оплату') + '</div>' +
      '</div>';
    }).join('');

    const empty = $('#moneyEmpty');
    empty.hidden = list.length > 0;
    $('#moneyEmptyText').textContent = state.payments.length
      ? 'Ничего не найдено — измените период или фильтр.'
      : 'Оплат пока нет. Внесите первую — баланс клиента обновится.';
    const emptyBtn = $('.btn', empty);
    if (emptyBtn) emptyBtn.hidden = state.payments.length > 0;
  }

  /* ==================== Рендер: карточка клиента ==================== */
  function renderDetail() {
    const client = clientById(state.detailId);
    if (!client) {
      state.detailId = null;
      return;
    }
    const stats = buildStats().get(client.id);
    const works = state.works.filter((w) => w.clientId === client.id).sort(sortByDateDesc);
    const payments = state.payments.filter((p) => p.clientId === client.id).sort(sortByDateDesc);
    const worksTotal = round2(works.reduce((sum, w) => sum + workAmount(w), 0));
    const paymentsTotal = round2(payments.reduce((sum, p) => sum + num(p.amount), 0));

    $('#detailTitle').textContent = client.name;
    $('#detailRate').textContent = fmtMoney(client.rate) + '/ч · ' + fmtHours(stats.hours);

    const balanceClass = stats.balance < -0.005 ? 'neg' : stats.balance > 0.005 ? 'pos' : '';
    const balanceLabel = stats.balance < -0.005 ? 'Долг' : stats.balance > 0.005 ? 'Аванс' : 'Баланс';

    let html = '<div class="detail-stats">' +
      '<div class="detail-stat"><span>Часы</span><b>' + fmtHours(stats.hours) + '</b></div>' +
      '<div class="detail-stat"><span>Заработано</span><b>' + fmtMoney(stats.earned) + '</b></div>' +
      '<div class="detail-stat"><span>Оплачено</span><b>' + fmtMoney(stats.paid) + '</b></div>' +
      '<div class="detail-stat"><span>' + balanceLabel + '</span><b class="' + balanceClass + '">' + fmtMoney(Math.abs(stats.balance)) + '</b></div>' +
    '</div>';

    if (client.phone || client.email) {
      html += '<div class="detail-contacts">';
      if (client.phone) {
        html += '<a class="detail-contact" href="tel:' + esc(str(client.phone).replace(/[^\d+]/g, '')) + '">' + ICO.phone + '<span>' + esc(client.phone) + '</span></a>';
      }
      if (client.email) {
        html += '<a class="detail-contact" href="mailto:' + esc(client.email) + '">' + ICO.mail + '<span>' + esc(client.email) + '</span></a>';
      }
      html += '</div>';
    }

    if (client.note) html += '<div class="detail-note">' + esc(client.note) + '</div>';

    const id = esc(client.id);
    html += '<div class="detail-actions">' +
      '<button class="btn btn-primary" type="button" data-action="client-work" data-id="' + id + '">+ Работа</button>' +
      '<button class="btn" type="button" data-action="client-pay" data-id="' + id + '">Оплата</button>' +
      '<button class="btn btn-ghost" type="button" data-action="edit-client" data-id="' + id + '">Редактировать</button>' +
      '<button class="btn btn-ghost danger-text" type="button" data-action="delete-client" data-id="' + id + '">Удалить</button>' +
    '</div>';

    html += '<section class="detail-section"><h4>Работы <span>' + works.length + ' · ' + fmtMoney(worksTotal) + '</span></h4>';
    html += works.length
      ? works.slice(0, 8).map((w) => {
        const cat = categoryById(w.category);
        const label = fmtDate(w.date) + ' · ' + fmtHours(w.hours) + (cat ? ' · ' + esc(cat.label) : '') + (w.note ? ' · ' + esc(w.note) : '');
        return '<div class="detail-line"><span class="dl-main">' + label + '</span><span class="dl-sum">' + fmtMoney(workAmount(w)) + '</span></div>';
      }).join('')
      : '<p class="detail-empty">Работ пока нет.</p>';
    html += '</section>';

    html += '<section class="detail-section"><h4>Оплаты <span>' + payments.length + ' · ' + fmtMoney(paymentsTotal) + '</span></h4>';
    html += payments.length
      ? payments.slice(0, 6).map((p) => {
        const label = fmtDate(p.date) + ' · ' + esc(METHODS[p.method] || 'Оплата') + (p.note ? ' · ' + esc(p.note) : '');
        return '<div class="detail-line"><span class="dl-main">' + label + '</span><span class="dl-sum pos">+' + fmtMoney(p.amount) + '</span></div>';
      }).join('')
      : '<p class="detail-empty">Оплат пока нет.</p>';
    html += '</section>';

    $('#detailBody').innerHTML = html;
  }

  /* ==================== Настройки: состояние ==================== */
  function updateSettingsUI() {
    const pinStatus = $('#pinStatus');
    if (pinStatus) {
      pinStatus.textContent = state.pin
        ? 'PIN включён — приложение спросит его при запуске.'
        : 'PIN не задан. Вход без пароля.';
    }
    const setup = $('#pinSetupBtn');
    if (setup) setup.textContent = state.pin ? 'Сменить PIN' : 'Задать PIN';
    if ($('#pinLockBtn')) $('#pinLockBtn').hidden = !state.pin;
    if ($('#pinRemoveBtn')) $('#pinRemoveBtn').hidden = !state.pin;
    if ($('#trashCount')) $('#trashCount').textContent = String(state.trash.length);
    if ($('#appVersion')) $('#appVersion').textContent = VERSION;
    if ($('#settingCurrency')) $('#settingCurrency').value = state.currency;
    if ($('#settingTheme')) $('#settingTheme').value = state.themeMode;
    if ($('#rateLabel')) $('#rateLabel').textContent = 'Ставка, ' + (CURRENCY_SYMBOL[state.currency] || '₽') + '/час *';
  }

  function renderTrash() {
    const box = $('#trashBody');
    if (!box) return;
    if (!state.trash.length) {
      box.innerHTML = '<div class="empty" style="padding:26px 10px"><div class="empty-art" aria-hidden="true">🗑</div><p>Корзина пуста.</p></div>';
      return;
    }
    box.innerHTML = state.trash.slice().reverse().map((item) => {
      let title = '';
      let details = '';
      if (item.type === 'client') {
        title = '👤 ' + esc(item.data.name);
        const wc = (item.works || []).length;
        const pc = (item.payments || []).length;
        details = wc + ' ' + plural(wc, ['работа', 'работы', 'работ'])+ ' · ' + pc + ' ' + plural(pc, ['оплата', 'оплаты', 'оплат']);
      } else if (item.type === 'work') {
        title = '⏱ Работа: ' + esc(item.data.note || clientName(item.data.clientId));
        details = clientName(item.data.clientId) + ' · ' + fmtDate(item.data.date) + ' · ' + fmtHours(item.data.hours);
      } else {
        title = '💰 Оплата: ' + fmtMoney(item.data.amount);
        details = clientName(item.data.clientId) + ' · ' + fmtDate(item.data.date);
      }
      return '<div class="trash-item">' +
        '<div class="trash-info"><strong>' + title + '</strong><span>' + details + '</span>' +
          '<time>' + new Date(item.removedAt).toLocaleString('ru-RU') + '</time></div>' +
        '<button class="btn btn-sm" type="button" data-action="restore-trash" data-id="' + esc(item.id) + '">Вернуть</button>' +
      '</div>';
    }).join('') +
    '<div class="modal-actions"><button class="btn btn-ghost" type="button" data-close>Закрыть</button>' +
    '<button class="btn btn-danger" type="button" data-action="empty-trash">Очистить</button></div>';
  }

  /* ==================== Рендер: конец ==================== */

  /* ==================== Модальные окна ==================== */
  let lastFocused = null;
  let confirmCallback = null;

  function openModal(id, focus) {
    const modal = typeof id === 'string' ? document.getElementById(id) : id;
    if (!modal) return;
    if (!modal.classList.contains('is-open')) lastFocused = document.activeElement;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    const card = $('.modal-card', modal);
    if (card) card.scrollTop = 0;
    if (focus) {
      setTimeout(() => {
        const el = $('input:not([type="hidden"]), select, textarea', card);
        if (el) {
          try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
        }
      }, 80);
    }
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    if (modal.id === 'detailModal') state.detailId = null;
    if (modal.id === 'confirmModal') confirmCallback = null;
    if (!$$('.modal.is-open').length) {
      document.body.classList.remove('modal-open');
      if (lastFocused && document.contains(lastFocused)) {
        try { lastFocused.focus({ preventScroll: true }); } catch (e) { /* без фокуса */ }
      }
      lastFocused = null;
    }
  }

  function closeAllModals() {
    $$('.modal.is-open').forEach((m) => closeModal(m));
  }

  function clearFormErrors(form) {
    $$('.err', form).forEach((el) => { el.hidden = true; });
    $$('.input.error', form).forEach((el) => el.classList.remove('error'));
  }

  function setFieldError(inputId, errorId, message) {
    const input = $('#' + inputId);
    const err = $('#' + errorId);
    if (input) input.classList.add('error');
    if (err) {
      if (message) err.textContent = message;
      err.hidden = false;
    }
  }

  /* ==================== Тосты и файлы ==================== */
  function toast(message, type) {
    const box = $('#toasts');
    if (!box) return;
    const el = document.createElement('div');
    el.className = 'toast ' + (type || '');
    el.textContent = message;
    box.appendChild(el);
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 220);
    }, 2800);
  }

  function downloadFile(name, text, type) {
    const blob = new Blob([text], { type: type || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function upsertLocal(key, obj) {
    const list = state[key];
    const i = list.findIndex((item) => item.id === obj.id);
    if (i >= 0) list[i] = obj; else list.push(obj);
  }

  /* ==================== Клиенты ==================== */
  function openClient(id) {
    const form = $('#clientForm');
    form.reset();
    clearFormErrors(form);
    $('#clientId').value = '';
    $('#clientModalTitle').textContent = id ? 'Клиент' : 'Новый клиент';
    updateSettingsUI();
    if (id) {
      const c = clientById(id);
      if (!c) return;
      $('#clientId').value = c.id;
      $('#clientName').value = c.name;
      $('#clientRate').value = c.rate;
      $('#clientPhone').value = c.phone || '';
      $('#clientEmail').value = c.email || '';
      $('#clientNote').value = c.note || '';
    }
    openModal('clientModal', true);
  }

  async function saveClient(event) {
    event.preventDefault();
    const form = event.currentTarget;
    clearFormErrors(form);

    const id = $('#clientId').value;
    const name = $('#clientName').value.trim();
    const rateRaw = $('#clientRate').value.trim();
    const rate = num(rateRaw);
    const email = $('#clientEmail').value.trim();
    const phone = $('#clientPhone').value.trim();
    const note = $('#clientNote').value.trim();
    let valid = true;

    if (!name) {
      setFieldError('clientName', 'clientNameErr', 'Введите имя');
      valid = false;
    }
    if (!rateRaw || !Number.isFinite(Number(rateRaw)) || rate < 0) {
      setFieldError('clientRate', 'clientRateErr', 'Укажите ставку числом');
      valid = false;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFieldError('clientEmail', 'clientEmailErr', 'Проверьте адрес');
      valid = false;
    }
    if (!valid) return;

    const now = new Date().toISOString();
    const old = id ? clientById(id) : null;
    const data = {
      id: id || uid(),
      name,
      rate: round2(rate),
      email,
      phone,
      note,
      createdAt: old && old.createdAt ? old.createdAt : now,
      updatedAt: now
    };

    try {
      await DB.put('clients', data);
      upsertLocal('clients', data);
      closeModal($('#clientModal'));
      toast(id ? 'Клиент обновлён' : 'Клиент добавлен', 'ok');
      renderAll();
    } catch (e) {
      console.error(e);
      toast('Не удалось сохранить клиента', 'error');
    }
  }

  function confirmDeleteClient(id) {
    const c = clientById(id);
    if (!c) return;
    const works = state.works.filter((w) => w.clientId === id).length;
    const payments = state.payments.filter((p) => p.clientId === id).length;
    askConfirm({
      title: 'Удалить клиента?',
      text: '<b>' + esc(c.name) + '</b> и связанные записи (' + works + ' ' +
        plural(works, ['работа', 'работы', 'работ']) + ', ' + payments + ' ' +
        plural(payments, ['оплата', 'оплаты', 'оплат']) + ') переместятся в корзину. Их можно вернуть.',
      okLabel: 'Удалить',
      onOk: () => removeClient(id)
    });
  }

  async function removeClient(id) {
    const client = clientById(id);
    if (!client) return;
    const works = state.works.filter((w) => w.clientId === id);
    const payments = state.payments.filter((p) => p.clientId === id);
    const entry = {
      id: uid(),
      type: 'client',
      data: client,
      works,
      payments,
      removedAt: new Date().toISOString()
    };
    try {
      await DB.put('trash', entry);
      await Promise.all([
        DB.remove('clients', id),
        ...works.map((w) => DB.remove('works', w.id)),
        ...payments.map((p) => DB.remove('payments', p.id))
      ]);
      state.clients = state.clients.filter((c) => c.id !== id);
      state.works = state.works.filter((w) => w.clientId !== id);
      state.payments = state.payments.filter((p) => p.clientId !== id);
      state.trash.push(entry);
      if (state.detailId === id) closeModal($('#detailModal'));
      renderAll();
      toast('Клиент в корзине');
    } catch (e) {
      console.error(e);
      toast('Не удалось удалить клиента', 'error');
    }
  }

  function openDetail(id) {
    if (!clientById(id)) return;
    state.detailId = id;
    renderDetail();
    openModal('detailModal', false);
  }

  /* ==================== Работы ==================== */
  function fillCategorySelect() {
    const select = $('#workCategory');
    if (!select || select.dataset.filled === '1') return;
    select.insertAdjacentHTML('beforeend', CATEGORIES.map((c) =>
      '<option value="' + c.id + '">' + esc(c.label) + '</option>'
    ).join(''));
    select.dataset.filled = '1';
  }

  function openWork(id, presetClientId) {
    const form = $('#workForm');
    fillCategorySelect();
    form.reset();
    clearFormErrors(form);
    state.editingWork = id || null;
    $('#workId').value = '';
    $('#workDate').value = todayISO();
    $('#workHours').value = '1';
    $('#workStart').value = '';
    $('#workEnd').value = '';
    $('#workCategory').value = '';
    $('#workNote').value = '';
    $('#workModalTitle').textContent = id ? 'Работа' : 'Новая работа';
    fillClientSelect($('#workClient'), 'Выберите клиента', presetClientId || '');

    if (id) {
      const w = state.works.find((item) => item.id === id);
      if (!w) return;
      state.editingWork = w.id;
      $('#workId').value = w.id;
      fillClientSelect($('#workClient'), 'Выберите клиента', w.clientId);
      $('#workDate').value = w.date || todayISO();
      $('#workHours').value = w.hours;
      $('#workStart').value = w.start || '';
      $('#workEnd').value = w.end || '';
      $('#workCategory').value = w.category || '';
      $('#workNote').value = w.note || '';
    }

    updateWorkPreview();
    markHourChips();
    openModal('workModal', true);
  }

  function updateWorkPreview() {
    const box = $('#workPreview');
    if (!box) return;
    const cid = $('#workClient').value;
    const client = clientById(cid);
    const hours = num($('#workHours').value);
    let rate = client ? num(client.rate) : 0;

    if (state.editingWork) {
      const w = state.works.find((item) => item.id === state.editingWork);
      if (w && w.clientId === cid && typeof w.rate === 'number') rate = w.rate;
    }

    if (!cid) {
      box.textContent = 'Выберите клиента, чтобы увидеть сумму';
      return;
    }
    box.textContent = 'К оплате: ' + fmtMoney(hours * rate) + (rate > 0 ? ' · ' + fmtMoney(rate) + '/ч' : '');
  }

  function markHourChips() {
    const value = num($('#workHours').value);
    $$('#hoursChips .chip').forEach((chip) => {
      chip.classList.toggle('is-active', num(chip.dataset.hours) === value);
    });
  }

  function syncHoursFromTimes() {
    const start = $('#workStart').value;
    const end = $('#workEnd').value;
    if (!start || !end) return;
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const minutes = (eh * 60 + em) - (sh * 60 + sm);
    if (minutes <= 0) return;
    const hours = Math.round(minutes / 15) / 4;
    if (hours > 0) {
      $('#workHours').value = String(hours);
      markHourChips();
      updateWorkPreview();
    }
  }

  async function saveWork(event) {
    event.preventDefault();
    const form = event.currentTarget;
    clearFormErrors(form);

    const id = $('#workId').value;
    const clientId = $('#workClient').value;
    const date = $('#workDate').value;
    const hours = num($('#workHours').value);
    let valid = true;

    if (!clientId) {
      setFieldError('workClient', 'workClientErr', 'Выберите клиента');
      valid = false;
    }
    if (!date) {
      $('#workDate').classList.add('error');
      valid = false;
    }
    if (!(hours > 0)) {
      setFieldError('workHours', 'workHoursErr', 'Укажите часы больше нуля');
      valid = false;
    }
    if (!valid) return;

    const client = clientById(clientId);
    const old = id ? state.works.find((w) => w.id === id) : null;
    let rate = client ? num(client.rate) : 0;
    if (old && old.clientId === clientId && typeof old.rate === 'number') rate = old.rate;

    const now = new Date().toISOString();
    const data = {
      id: id || uid(),
      clientId,
      date,
      hours: round2(hours),
      rate: round2(rate),
      start: $('#workStart').value,
      end: $('#workEnd').value,
      category: $('#workCategory').value,
      note: $('#workNote').value.trim(),
      createdAt: old && old.createdAt ? old.createdAt : now,
      updatedAt: now
    };

    try {
      await DB.put('works', data);
      upsertLocal('works', data);
      closeModal($('#workModal'));
      toast(id ? 'Работа обновлена' : 'Работа добавлена', 'ok');
      renderAll();
    } catch (e) {
      console.error(e);
      toast('Не удалось сохранить работу', 'error');
    }
  }

  function confirmDeleteWork(id) {
    const w = state.works.find((item) => item.id === id);
    if (!w) return;
    askConfirm({
      title: 'Удалить работу?',
      text: '<b>' + esc(clientName(w.clientId)) + '</b>, ' + fmtDate(w.date) + ', ' + fmtHours(w.hours) +
        ' на ' + fmtMoney(workAmount(w)) + '. Запись переместится в корзину.',
      okLabel: 'Удалить',
      onOk: async () => {
        const entry = { id: uid(), type: 'work', data: w, removedAt: new Date().toISOString() };
        try {
          await DB.put('trash', entry);
          await DB.remove('works', id);
          state.works = state.works.filter((item) => item.id !== id);
          state.trash.push(entry);
          renderAll();
          toast('Работа в корзине');
        } catch (e) {
          console.error(e);
          toast('Не удалось удалить работу', 'error');
        }
      }
    });
  }

  /* ==================== Оплаты ==================== */
  function openPayment(id, presetClientId) {
    const form = $('#paymentForm');
    form.reset();
    clearFormErrors(form);
    $('#paymentId').value = '';
    $('#paymentDate').value = todayISO();
    $('#paymentMethod').value = 'cash';
    $('#paymentNote').value = '';
    $('#paymentAmount').value = '';
    $('#paymentModalTitle').textContent = id ? 'Оплата' : 'Новая оплата';
    fillClientSelect($('#paymentClient'), 'Выберите клиента', presetClientId || '');

    if (id) {
      const p = state.payments.find((item) => item.id === id);
      if (!p) return;
      $('#paymentId').value = p.id;
      fillClientSelect($('#paymentClient'), 'Выберите клиента', p.clientId);
      $('#paymentAmount').value = p.amount;
      $('#paymentDate').value = p.date || todayISO();
      $('#paymentMethod').value = p.method || 'cash';
      $('#paymentNote').value = p.note || '';
    } else if (presetClientId) {
      const stats = buildStats().get(presetClientId);
      if (stats && stats.balance < -0.005) {
        $('#paymentAmount').value = String(round2(Math.abs(stats.balance)));
      }
    }

    openModal('paymentModal', true);
  }

  async function savePayment(event) {
    event.preventDefault();
    const form = event.currentTarget;
    clearFormErrors(form);

    const id = $('#paymentId').value;
    const clientId = $('#paymentClient').value;
    const amount = num($('#paymentAmount').value);
    const date = $('#paymentDate').value;
    let valid = true;

    if (!clientId) {
      setFieldError('paymentClient', 'paymentClientErr', 'Выберите клиента');
      valid = false;
    }
    if (!(amount > 0)) {
      setFieldError('paymentAmount', 'paymentAmountErr', 'Укажите сумму больше нуля');
      valid = false;
    }
    if (!date) {
      $('#paymentDate').classList.add('error');
      valid = false;
    }
    if (!valid) return;

    const old = id ? state.payments.find((p) => p.id === id) : null;
    const now = new Date().toISOString();
    const data = {
      id: id || uid(),
      clientId,
      amount: round2(amount),
      date,
      method: $('#paymentMethod').value,
      note: $('#paymentNote').value.trim(),
      createdAt: old && old.createdAt ? old.createdAt : now,
      updatedAt: now
    };

    try {
      await DB.put('payments', data);
      upsertLocal('payments', data);
      closeModal($('#paymentModal'));
      toast(id ? 'Оплата обновлена' : 'Оплата добавлена', 'ok');
      renderAll();
    } catch (e) {
      console.error(e);
      toast('Не удалось сохранить оплату', 'error');
    }
  }

  function confirmDeletePayment(id) {
    const p = state.payments.find((item) => item.id === id);
    if (!p) return;
    askConfirm({
      title: 'Удалить оплату?',
      text: 'Оплата <b>' + fmtMoney(p.amount) + '</b> — ' + esc(clientName(p.clientId)) + ', ' + fmtDate(p.date) +
        '. Запись переместится в корзину.',
      okLabel: 'Удалить',
      onOk: async () => {
        const entry = { id: uid(), type: 'payment', data: p, removedAt: new Date().toISOString() };
        try {
          await DB.put('trash', entry);
          await DB.remove('payments', id);
          state.payments = state.payments.filter((item) => item.id !== id);
          state.trash.push(entry);
          renderAll();
          toast('Оплата в корзине');
        } catch (e) {
          console.error(e);
          toast('Не удалось удалить оплату', 'error');
        }
      }
    });
  }

  /* ==================== Подтверждение ==================== */
  function askConfirm(options) {
    const opts = options || {};
    $('#confirmTitle').textContent = opts.title || 'Подтвердите';
    $('#confirmText').innerHTML = opts.text || '';
    const ok = $('#confirmOk');
    ok.textContent = opts.okLabel || 'Удалить';
    ok.className = 'btn ' + (opts.danger === false ? 'btn-primary' : 'btn-danger');
    confirmCallback = typeof opts.onOk === 'function' ? opts.onOk : null;
    openModal('confirmModal', false);
  }

  async function runConfirm() {
    const fn = confirmCallback;
    confirmCallback = null;
    if (!fn) return;
    try {
      await fn();
    } catch (e) {
      console.error(e);
      toast('Не получилось выполнить действие', 'error');
    }
    closeModal($('#confirmModal'));
  }

  /* ==================== Корзина ==================== */
  function openTrash() {
    renderTrash();
    openModal('trashModal', false);
  }

  async function restoreTrash(id) {
    const item = state.trash.find((t) => t.id === id);
    if (!item) return;
    try {
      if (item.type === 'client') {
        await DB.put('clients', item.data);
        upsertLocal('clients', item.data);
        for (const w of item.works || []) {
          await DB.put('works', w);
          upsertLocal('works', w);
        }
        for (const p of item.payments || []) {
          await DB.put('payments', p);
          upsertLocal('payments', p);
        }
      } else if (item.type === 'work') {
        if (!clientById(item.data.clientId)) {
          toast('Сначала восстановите клиента', 'error');
          return;
        }
        await DB.put('works', item.data);
        upsertLocal('works', item.data);
      } else if (item.type === 'payment') {
        if (!clientById(item.data.clientId)) {
          toast('Сначала восстановите клиента', 'error');
          return;
        }
        await DB.put('payments', item.data);
        upsertLocal('payments', item.data);
      }
      await DB.remove('trash', id);
      state.trash = state.trash.filter((t) => t.id !== id);
      renderTrash();
      renderAll();
      toast('Восстановлено', 'ok');
    } catch (e) {
      console.error(e);
      toast('Не удалось восстановить', 'error');
    }
  }

  function confirmEmptyTrash() {
    askConfirm({
      title: 'Очистить корзину?',
      text: 'Удалённые записи исчезнут навсегда. Это действие нельзя отменить.',
      okLabel: 'Очистить',
      onOk: async () => {
        await DB.clearStore('trash');
        state.trash = [];
        renderTrash();
        renderAll();
        toast('Корзина очищена');
      }
    });
  }

  /* ==================== Настройки и данные ==================== */
  async function changeCurrency(code) {
    if (!CURRENCIES.includes(code)) return;
    state.currency = code;
    try {
      await DB.setMeta('currency', code);
      renderAll();
      toast('Валюта изменена. Суммы не пересчитываются.');
    } catch (e) {
      console.error(e);
    }
  }

  function backupData() {
    const data = {
      app: 'fril-buh',
      version: 1,
      exportedAt: new Date().toISOString(),
      clients: state.clients,
      works: state.works,
      payments: state.payments,
      trash: state.trash,
      settings: { currency: state.currency, theme: state.themeMode }
    };
    downloadFile('fril-buh-backup-' + todayISO() + '.json', JSON.stringify(data, null, 2), 'application/json');
    toast('Бэкап скачан', 'ok');
  }

  function confirmClearAll() {
    askConfirm({
      title: 'Очистить все данные?',
      text: 'Удалятся все клиенты, работы, оплаты и корзина. Настройки и PIN сохранятся. Это действие нельзя отменить — сначала лучше скачать бэкап.',
      okLabel: 'Удалить всё',
      onOk: async () => {
        const meta = { currency: state.currency, theme: state.themeMode };
        if (state.pin) meta.pin = state.pin;
        await DB.replaceAll({ clients: [], works: [], payments: [], trash: [], meta });
        state.clients = [];
        state.works = [];
        state.payments = [];
        state.trash = [];
        state.detailId = null;
        closeAllModals();
        renderAll();
        toast('Все данные удалены');
      }
    });
  }

  function validISODate(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(str(value)) ? str(value) : todayISO();
  }

  function importBackup(data) {
    const now = new Date().toISOString();
    const clients = (Array.isArray(data.clients) ? data.clients : [])
      .filter((c) => c && typeof c === 'object')
      .map((c) => ({
        id: str(c.id) || uid(),
        name: str(c.name).trim() || 'Без имени',
        rate: round2(num(c.rate)),
        phone: str(c.phone),
        email: str(c.email),
        note: str(c.note),
        createdAt: c.createdAt || now,
        updatedAt: c.updatedAt || now
      }));
    const clientIds = new Set(clients.map((c) => c.id));

    const works = (Array.isArray(data.works) ? data.works : [])
      .filter((w) => w && typeof w === 'object' && clientIds.has(str(w.clientId)) && num(w.hours) > 0)
      .map((w) => ({
        id: str(w.id) || uid(),
        clientId: str(w.clientId),
        date: validISODate(w.date),
        hours: round2(num(w.hours)),
        rate: round2(num(w.rate)),
        start: str(w.start),
        end: str(w.end),
        category: categoryById(str(w.category)) ? str(w.category) : '',
        note: str(w.note),
        createdAt: w.createdAt || now,
        updatedAt: w.updatedAt || now
      }));

    const payments = (Array.isArray(data.payments) ? data.payments : [])
      .filter((p) => p && typeof p === 'object' && clientIds.has(str(p.clientId)) && num(p.amount) > 0)
      .map((p) => ({
        id: str(p.id) || uid(),
        clientId: str(p.clientId),
        amount: round2(num(p.amount)),
        date: validISODate(p.date),
        method: METHODS[str(p.method)] ? str(p.method) : 'other',
        note: str(p.note),
        createdAt: p.createdAt || now,
        updatedAt: p.updatedAt || now
      }));

    const trash = (Array.isArray(data.trash) ? data.trash : [])
      .filter((t) => t && typeof t === 'object' && t.data)
      .map((t) => ({
        id: str(t.id) || uid(),
        type: str(t.type) || 'work',
        data: t.data,
        works: Array.isArray(t.works) ? t.works : undefined,
        payments: Array.isArray(t.payments) ? t.payments : undefined,
        removedAt: t.removedAt || now
      }));

    const settings = data.settings && typeof data.settings === 'object' ? data.settings : {};
    const currency = CURRENCIES.includes(str(settings.currency)) ? str(settings.currency) : state.currency;
    const theme = ['auto', 'light', 'dark'].includes(str(settings.theme)) ? str(settings.theme) : state.themeMode;
    const meta = { currency, theme };
    if (state.pin) meta.pin = state.pin;

    return DB.replaceAll({ clients, works, payments, trash, meta }).then(() => {
      state.clients = clients;
      state.works = works;
      state.payments = payments;
      state.trash = trash;
      state.currency = currency;
      state.themeMode = theme;
      applyTheme();
      closeAllModals();
      renderAll();
      toast('Импортировано: ' + clients.length + ' ' + plural(clients.length, ['клиент', 'клиента', 'клиентов']), 'ok');
    });
  }

  async function handleImportFile(event) {
    const input = event.currentTarget;
    const file = input.files && input.files[0];
    input.value = '';
    if (!file) return;

    let data;
    try {
      data = JSON.parse(await file.text());
    } catch (e) {
      toast('Не удалось прочитать файл', 'error');
      return;
    }
    if (!data || !Array.isArray(data.clients) || !Array.isArray(data.works) || !Array.isArray(data.payments)) {
      toast('Это не похоже на бэкап Фрил-Буха', 'error');
      return;
    }

    askConfirm({
      title: 'Импорт бэкапа',
      text: 'В файле: <b>' + data.clients.length + '</b> ' + plural(data.clients.length, ['клиент', 'клиента', 'клиентов']) +
        ', <b>' + data.works.length + '</b> ' + plural(data.works.length, ['работа', 'работы', 'работ']) +
        ', <b>' + data.payments.length + '</b> ' + plural(data.payments.length, ['оплата', 'оплаты', 'оплат']) +
        '.<br><br>Текущие данные будут заменены. Продолжить?',
      okLabel: 'Импортировать',
      danger: true,
      onOk: () => importBackup(data)
    });
  }

  const csvCell = (value) => {
    const s = str(value);
    return /[";\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const csvNum = (n) => String(round2(num(n))).replace('.', ',');

  function downloadCSV(name, rows) {
    const text = '\uFEFF' + rows.map((row) => row.map(csvCell).join(';')).join('\r\n');
    downloadFile(name, text, 'text/csv;charset=utf-8');
  }

  function exportWorksCSV() {
    const rows = [['Клиент', 'Дата', 'Часы', 'Ставка', 'Сумма', 'Категория', 'Начало', 'Конец', 'Описание']];
    state.works.slice().sort((a, b) => String(a.date).localeCompare(String(b.date))).forEach((w) => {
      const cat = categoryById(w.category);
      rows.push([
        clientName(w.clientId), w.date, csvNum(w.hours), csvNum(workRate(w)), csvNum(workAmount(w)),
        cat ? cat.label : '', w.start || '', w.end || '', w.note || ''
      ]);
    });
    downloadCSV('fril-buh-raboty-' + todayISO() + '.csv', rows);
    toast('CSV с работами скачан', 'ok');
  }

  function exportPaymentsCSV() {
    const rows = [['Клиент', 'Дата', 'Сумма', 'Способ', 'Комментарий']];
    state.payments.slice().sort((a, b) => String(a.date).localeCompare(String(b.date))).forEach((p) => {
      rows.push([clientName(p.clientId), p.date, csvNum(p.amount), METHODS[p.method] || 'Другое', p.note || '']);
    });
    downloadCSV('fril-buh-oplaty-' + todayISO() + '.csv', rows);
    toast('CSV с оплатами скачан', 'ok');
  }

  /* ==================== PIN, тема, события ==================== */
  const PIN_FLAG = 'frilbuh.pin.on';
  let idleTimer = null;
  const themeMedia = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function applyTheme() {
    const mode = ['auto', 'light', 'dark'].includes(state.themeMode) ? state.themeMode : 'auto';
    const dark = mode === 'dark' || (mode === 'auto' && themeMedia && themeMedia.matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.documentElement.dataset.themeMode = mode;
    try { localStorage.setItem('frilbuh.theme', mode); } catch (e) { /* без localStorage */ }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = dark ? '#0d1211' : '#f4f6f5';
    if ($('#settingTheme')) $('#settingTheme').value = mode;
  }

  async function setThemeMode(mode) {
    if (!['auto', 'light', 'dark'].includes(mode)) return;
    state.themeMode = mode;
    applyTheme();
    try { await DB.setMeta('theme', mode); } catch (e) { console.error(e); }
  }

  function toggleTheme() {
    const isDark = document.documentElement.dataset.theme === 'dark';
    setThemeMode(isDark ? 'light' : 'dark');
  }

  function randomSalt() {
    const bytes = new Uint8Array(16);
    if (window.crypto && crypto.getRandomValues) {
      crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  async function hashPin(pin, salt) {
    const text = salt + ':' + pin;
    if (window.crypto && crypto.subtle && window.TextEncoder) {
      try {
        const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
        return Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
      } catch (e) { /* запасной вариант ниже */ }
    }
    let h1 = 0x811c9dc5;
    let h2 = 0x01000193;
    for (let i = 0; i < text.length; i++) {
      const c = text.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 16777619);
      h2 = Math.imul(h2 + c, 2246822519);
    }
    return 'fnv:' + (h1 >>> 0).toString(16) + (h2 >>> 0).toString(16);
  }

  async function verifyPin(pin) {
    if (!state.pin) return true;
    const hash = await hashPin(pin, state.pin.salt);
    return hash === state.pin.hash;
  }

  function showPinError(message) {
    const err = $('#pinErr');
    if (!err) return;
    err.textContent = message;
    err.hidden = false;
  }

  function openPinSetup() {
    const form = $('#pinForm');
    form.reset();
    clearFormErrors(form);
    openModal('pinModal', true);
  }

  async function savePin(event) {
    event.preventDefault();
    clearFormErrors($('#pinForm'));
    const pin = $('#pinNew').value.trim();
    const repeat = $('#pinRepeat').value.trim();
    if (!/^\d{4,8}$/.test(pin)) {
      showPinError('PIN — от 4 до 8 цифр');
      return;
    }
    if (pin !== repeat) {
      showPinError('PIN не совпадает');
      return;
    }
    try {
      const salt = randomSalt();
      const hash = await hashPin(pin, salt);
      state.pin = { salt, hash, createdAt: new Date().toISOString() };
      await DB.setMeta('pin', state.pin);
      try { localStorage.setItem(PIN_FLAG, '1'); } catch (e) { /* без localStorage */ }
      closeModal($('#pinModal'));
      updateSettingsUI();
      toast('PIN сохранён', 'ok');
    } catch (e) {
      console.error(e);
      showPinError('Не удалось сохранить PIN');
    }
  }

  function confirmRemovePin() {
    askConfirm({
      title: 'Убрать PIN?',
      text: 'Приложение будет открываться без кода. Данные останутся на устройстве.',
      okLabel: 'Убрать PIN',
      danger: false,
      onOk: async () => {
        try {
          await DB.remove('meta', 'pin');
          state.pin = null;
          try { localStorage.removeItem(PIN_FLAG); } catch (e) { /* без localStorage */ }
          updateSettingsUI();
          toast('PIN убран');
        } catch (e) {
          console.error(e);
          toast('Не удалось убрать PIN', 'error');
        }
      }
    });
  }

  function lockApp() {
    if (!state.pin || state.locked) return;
    state.locked = true;
    clearTimeout(idleTimer);
    closeAllModals();
    const screen = $('#lockScreen');
    if (!screen) return;
    screen.hidden = false;
    document.documentElement.dataset.lockPending = '1';
    $('#lockPin').value = '';
    $('#lockErr').hidden = true;
    setTimeout(() => {
      try { $('#lockPin').focus({ preventScroll: true }); } catch (e) { $('#lockPin').focus(); }
    }, 60);
  }

  function unlockApp() {
    state.locked = false;
    const screen = $('#lockScreen');
    if (screen) screen.hidden = true;
    delete document.documentElement.dataset.lockPending;
    resetIdle();
  }

  function clearLockPending() {
    delete document.documentElement.dataset.lockPending;
    const screen = $('#lockScreen');
    if (screen) screen.hidden = true;
  }

  function resetIdle() {
    clearTimeout(idleTimer);
    if (!state.pin || state.locked) return;
    idleTimer = setTimeout(() => { lockApp(); }, IDLE_LOCK_MS);
  }

  async function submitUnlock(event) {
    event.preventDefault();
    const input = $('#lockPin');
    const err = $('#lockErr');
    const button = $('#lockForm button[type="submit"]');
    const pin = input.value.trim();
    if (!pin) return;
    if (button) button.disabled = true;
    try {
      const ok = await verifyPin(pin);
      if (ok) {
        input.value = '';
        err.hidden = true;
        unlockApp();
      } else {
        err.hidden = false;
        input.value = '';
        const screen = $('#lockScreen');
        screen.classList.remove('shake');
        void screen.offsetWidth;
        screen.classList.add('shake');
        input.focus();
      }
    } catch (e) {
      console.error(e);
      err.hidden = false;
    } finally {
      if (button) button.disabled = false;
    }
  }

  function updateOnline() {
    const bar = $('#offlineBar');
    if (bar) bar.hidden = navigator.onLine;
  }

  /* ==================== Навигация ==================== */
  function setView(name, fromHash) {
    if (!['overview', 'clients', 'works', 'money'].includes(name)) name = 'overview';
    state.view = name;
    $$('.view').forEach((view) => view.classList.toggle('is-active', view.dataset.view === name));
    $$('.tabs-desktop .tab, .tabbar-btn').forEach((btn) => btn.classList.toggle('is-active', btn.dataset.view === name));
    if (!fromHash && location.hash !== '#' + name) {
      try { history.replaceState(null, '', '#' + name); } catch (e) { /* без history */ }
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function openSettings() {
    updateSettingsUI();
    openModal('settingsModal', false);
  }

  function closeDetailIfOpen() {
    if (state.detailId) closeModal($('#detailModal'));
  }

  /* ==================== Действия ==================== */
  function handleAction(action, id) {
    switch (action) {
      case 'new-work': openWork(); break;
      case 'new-payment': openPayment(); break;
      case 'new-client': openClient(); break;
      case 'detail': openDetail(id); break;
      case 'client-work': closeDetailIfOpen(); openWork(null, id); break;
      case 'client-pay': closeDetailIfOpen(); openPayment(null, id); break;
      case 'edit-client': closeDetailIfOpen(); openClient(id); break;
      case 'delete-client': confirmDeleteClient(id); break;
      case 'edit-work': openWork(id); break;
      case 'delete-work': confirmDeleteWork(id); break;
      case 'edit-payment': openPayment(id); break;
      case 'delete-payment': confirmDeletePayment(id); break;
      case 'show-debtors':
        state.clientsMode = 'debt';
        setView('clients');
        renderClients();
        break;
      case 'show-works': setView('works'); break;
      case 'backup': backupData(); break;
      case 'import': $('#importFile').click(); break;
      case 'csv-works': exportWorksCSV(); break;
      case 'csv-payments': exportPaymentsCSV(); break;
      case 'trash': openTrash(); break;
      case 'restore-trash': restoreTrash(id); break;
      case 'empty-trash': confirmEmptyTrash(); break;
      case 'clear-all': confirmClearAll(); break;
      default: break;
    }
  }

  /* ==================== События ==================== */
  const rerenderClients = debounce(renderClients, 180);
  const rerenderWorks = debounce(renderWorks, 180);
  const rerenderMoney = debounce(renderMoney, 180);

  function bindEvents() {
    document.addEventListener('click', (event) => {
      const closeBtn = event.target.closest('[data-close]');
      if (closeBtn) {
        const modal = closeBtn.closest('.modal');
        if (modal) closeModal(modal);
        return;
      }

      const viewBtn = event.target.closest('[data-view]');
      if (viewBtn && viewBtn.closest('.tabs-desktop, .tabbar')) {
        setView(viewBtn.dataset.view);
        return;
      }

      const jump = event.target.closest('[data-view-jump]');
      if (jump) {
        event.preventDefault();
        setView(jump.dataset.viewJump);
        return;
      }

      const actionBtn = event.target.closest('[data-action]');
      if (actionBtn) {
        event.preventDefault();
        handleAction(actionBtn.dataset.action, actionBtn.dataset.id);
        return;
      }

      if (event.target.classList && event.target.classList.contains('modal')) {
        closeModal(event.target);
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        if (state.locked) return;
        const open = $$('.modal.is-open');
        if (open.length) closeModal(open[open.length - 1]);
      }
    });

    ['click', 'keydown', 'touchstart'].forEach((name) => {
      document.addEventListener(name, () => resetIdle(), { passive: true });
    });

    $('#themeBtn').addEventListener('click', toggleTheme);
    $('#settingsBtn').addEventListener('click', openSettings);

    $('#overviewPeriod').addEventListener('click', (event) => {
      const btn = event.target.closest('[data-period]');
      if (!btn) return;
      state.overviewPeriod = btn.dataset.period;
      renderOverview();
    });
    $('#worksPeriod').addEventListener('click', (event) => {
      const btn = event.target.closest('[data-period]');
      if (!btn) return;
      state.worksPeriod = btn.dataset.period;
      renderWorks();
    });
    $('#moneyPeriod').addEventListener('click', (event) => {
      const btn = event.target.closest('[data-period]');
      if (!btn) return;
      state.moneyPeriod = btn.dataset.period;
      renderMoney();
    });
    $('#clientMode').addEventListener('click', (event) => {
      const btn = event.target.closest('[data-mode]');
      if (!btn) return;
      state.clientsMode = btn.dataset.mode;
      renderClients();
    });

    $('#clientSearch').addEventListener('input', (event) => {
      state.clientsQuery = event.target.value;
      rerenderClients();
    });
    $('#clientSort').addEventListener('change', (event) => {
      state.clientsSort = event.target.value;
      renderClients();
    });
    $('#worksClient').addEventListener('change', (event) => {
      state.worksClient = event.target.value;
      renderWorks();
    });
    $('#worksSearch').addEventListener('input', (event) => {
      state.worksQuery = event.target.value;
      rerenderWorks();
    });
    $('#moneyClient').addEventListener('change', (event) => {
      state.moneyClient = event.target.value;
      renderMoney();
    });
    $('#moneySearch').addEventListener('input', (event) => {
      state.moneyQuery = event.target.value;
      rerenderMoney();
    });

    $('#clientForm').addEventListener('submit', saveClient);
    $('#workForm').addEventListener('submit', saveWork);
    $('#paymentForm').addEventListener('submit', savePayment);
    $('#pinForm').addEventListener('submit', savePin);
    $('#lockForm').addEventListener('submit', submitUnlock);
    $('#confirmOk').addEventListener('click', runConfirm);

    $('#hoursChips').addEventListener('click', (event) => {
      const btn = event.target.closest('[data-hours]');
      if (!btn) return;
      $('#workHours').value = btn.dataset.hours;
      markHourChips();
      updateWorkPreview();
    });
    $('#workClient').addEventListener('change', updateWorkPreview);
    $('#workHours').addEventListener('input', () => {
      markHourChips();
      updateWorkPreview();
    });
    $('#workStart').addEventListener('change', syncHoursFromTimes);
    $('#workEnd').addEventListener('change', syncHoursFromTimes);

    $('#settingCurrency').addEventListener('change', (event) => changeCurrency(event.target.value));
    $('#settingTheme').addEventListener('change', (event) => setThemeMode(event.target.value));
    $('#pinSetupBtn').addEventListener('click', openPinSetup);
    $('#pinLockBtn').addEventListener('click', lockApp);
    $('#pinRemoveBtn').addEventListener('click', confirmRemovePin);
    $('#importFile').addEventListener('change', handleImportFile);

    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    window.addEventListener('scroll', () => {
      const bar = $('.topbar');
      if (bar) bar.classList.toggle('is-scrolled', window.scrollY > 4);
    }, { passive: true });

    window.addEventListener('hashchange', () => {
      const name = location.hash.slice(1);
      if (name && name !== state.view) setView(name, true);
    });

    if (themeMedia) {
      const onChange = () => { if (state.themeMode === 'auto') applyTheme(); };
      if (themeMedia.addEventListener) themeMedia.addEventListener('change', onChange);
      else if (themeMedia.addListener) themeMedia.addListener(onChange);
    }
  }

  /* ==================== Service worker ==================== */
  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    const secure = location.protocol === 'https:' ||
      location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if (!secure) return;

    const wasControlled = !!navigator.serviceWorker.controller;
    const bar = $('#updateBar');
    const btn = $('#updateBtn');
    let reloading = false;

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!wasControlled || reloading) return;
      reloading = true;
      location.reload();
    });

    if (btn) {
      btn.addEventListener('click', async () => {
        try {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg && reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          else location.reload();
        } catch (e) {
          location.reload();
        }
      });
    }

    navigator.serviceWorker.register('./sw.js').then((reg) => {
      const show = () => { if (bar && wasControlled) bar.hidden = false; };
      if (reg.waiting && navigator.serviceWorker.controller) show();
      reg.addEventListener('updatefound', () => {
        const worker = reg.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) show();
        });
      });
    }).catch((e) => {
      console.warn('[Фрил-Бух] Service worker не зарегистрирован:', e);
    });
  }

  /* ==================== Запуск ==================== */
  async function init() {
    try {
      await DB.init();
      const rows = await Promise.all([
        DB.getAll('clients'),
        DB.getAll('works'),
        DB.getAll('payments'),
        DB.getAll('trash'),
        DB.getAll('meta')
      ]);
      const meta = {};
      rows[4].forEach((row) => { meta[row.key] = row.value; });
      state.clients = rows[0];
      state.works = rows[1];
      state.payments = rows[2];
      state.trash = rows[3];
      state.currency = CURRENCIES.includes(meta.currency) ? meta.currency : 'RUB';
      state.themeMode = ['auto', 'light', 'dark'].includes(meta.theme)
        ? meta.theme
        : (localStorage.getItem('frilbuh.theme') || 'auto');
      state.pin = meta.pin && meta.pin.hash ? meta.pin : null;
    } catch (e) {
      console.error('[Фрил-Бух] Ошибка загрузки:', e);
      toast('Не удалось загрузить данные. Проверьте настройки браузера.', 'error');
    }

    applyTheme();
    bindEvents();
    fillCategorySelect();
    renderAll();

    const startView = location.hash.slice(1);
    setView(['overview', 'clients', 'works', 'money'].includes(startView) ? startView : 'overview', true);

    updateOnline();
    if (state.pin) {
      try { localStorage.setItem(PIN_FLAG, '1'); } catch (e) { /* без localStorage */ }
      lockApp();
    } else {
      try { localStorage.removeItem(PIN_FLAG); } catch (e) { /* без localStorage */ }
      clearLockPending();
    }

    registerSW();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
