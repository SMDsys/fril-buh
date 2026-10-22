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
  const VERSION = '2.0.0';
  const IDLE_LOCK_MS = 5 * 60 * 1000;
  const BACKUP_DAYS = 7;

  const CATEGORIES = [
    { id: 'dev', label: 'Разработка', color: '#0f766e' },
    { id: 'design', label: 'Дизайн', color: '#7c3aed' },
    { id: 'support', label: 'Поддержка', color: '#2563eb' },
    { id: 'consult', label: 'Консультация', color: '#d97706' },
    { id: 'repair', label: 'Ремонт', color: '#dc2626' },
    { id: 'other', label: 'Другое', color: '#64748b' }
  ];

  const EXPENSE_CATEGORIES = [
    { id: 'software', label: 'Софт и подписки' },
    { id: 'hosting', label: 'Хостинг и домены' },
    { id: 'equipment', label: 'Техника' },
    { id: 'tax', label: 'Налоги' },
    { id: 'education', label: 'Обучение' },
    { id: 'other', label: 'Другое' }
  ];

  const INVOICE_STATUS = {
    draft: 'Черновик',
    sent: 'Выставлен',
    paid: 'Оплачен'
  };

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
    mail: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="4.5" width="19" height="15" rx="2.4"/><path d="m3 6 9 7 9-7"/></svg>',
    copy: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
    print: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="7" rx="1"/></svg>'
  };

  /* ==================== Состояние ==================== */
  const state = {
    clients: [],
    projects: [],
    works: [],
    payments: [],
    expenses: [],
    invoices: [],
    trash: [],
    currency: 'RUB',
    themeMode: 'auto',
    pin: null,
    taxRate: 0,
    myName: '',
    myDetails: '',
    lastBackupAt: '',
    backupSnoozeUntil: '',
    storagePersisted: false,
    timer: null,
    view: 'overview',
    locked: false,
    overviewPeriod: 'month',
    clientsQuery: '',
    clientsMode: 'all',
    clientsSort: 'name',
    worksPeriod: 'month',
    worksClient: '',
    worksQuery: '',
    moneyKind: 'payments',
    moneyPeriod: 'month',
    moneyClient: '',
    moneyQuery: '',
    reportPeriod: 'month',
    weekStart: null,
    detailId: null,
    editingWork: null,
    editingPayment: null,
    pendingImport: null,
    pendingShortcut: ''
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

  const projectById = (id) => state.projects.find((p) => p.id === id) || null;
  const projectsForClient = (clientId) => state.projects.filter((p) => p.clientId === clientId);
  const projectDate = (p) => p.dueDate || p.startDate || str(p.createdAt).slice(0, 10) || todayISO();
  const isFixedWork = (work) => {
    if (work.billable === false) return true;
    const p = projectById(work.projectId);
    return !!(p && p.type === 'fixed');
  };
  const workBilledAmount = (work) => isFixedWork(work) ? 0 : workAmount(work);

  function projectEarned(project) {
    if (!project) return 0;
    if (project.type === 'fixed') return round2(num(project.budget));
    return round2(state.works
      .filter((w) => w.projectId === project.id)
      .reduce((sum, w) => sum + workAmount(w), 0));
  }

  function projectHours(project) {
    return round2(state.works
      .filter((w) => w.projectId === project.id)
      .reduce((sum, w) => sum + num(w.hours), 0));
  }

  function projectPaid(project) {
    return round2(state.payments
      .filter((p) => p.projectId === project.id)
      .reduce((sum, p) => sum + num(p.amount), 0));
  }

  function buildStats() {
    const map = new Map();
    state.clients.forEach((c) => map.set(c.id, { hours: 0, earned: 0, paid: 0, balance: 0 }));
    state.works.forEach((w) => {
      const s = map.get(w.clientId);
      if (!s) return;
      s.hours += num(w.hours);
      if (!isFixedWork(w)) s.earned += workAmount(w);
    });
    state.projects.forEach((p) => {
      if (p.type !== 'fixed') return;
      const s = map.get(p.clientId);
      if (s) s.earned += num(p.budget);
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

  function periodWorks(period) {
    return state.works.filter((w) => inPeriod(w.date, period) && !isFixedWork(w));
  }

  function periodProjects(period) {
    return state.projects.filter((p) => p.type === 'fixed' && inPeriod(projectDate(p), period));
  }

  function periodEarned(period) {
    const works = periodWorks(period).reduce((sum, w) => sum + workAmount(w), 0);
    const fixed = periodProjects(period).reduce((sum, p) => sum + num(p.budget), 0);
    return round2(works + fixed);
  }

  function periodExpenses(period) {
    return round2(state.expenses
      .filter((e) => inPeriod(e.date, period))
      .reduce((sum, e) => sum + num(e.amount), 0));
  }

  const taxAmount = (earned) => round2(Math.max(0, num(earned)) * Math.max(0, num(state.taxRate)) / 100);

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
  const copyBtn = (action, id, label) =>
    '<button class="icon-btn sm" type="button" data-action="' + action + '" data-id="' + esc(id) + '" aria-label="' + label + '" title="' + label + '">' + ICO.copy + '</button>';
  const printBtn = (action, id, label) =>
    '<button class="icon-btn sm" type="button" data-action="' + action + '" data-id="' + esc(id) + '" aria-label="' + label + '" title="' + label + '">' + ICO.print + '</button>';
  const trashBtn = (action, id, label) =>
    '<button class="icon-btn sm danger" type="button" data-action="' + action + '" data-id="' + esc(id) + '" aria-label="' + label + '" title="' + label + '">' + ICO.trash + '</button>';

  function renderAll() {
    renderOverview();
    renderClients();
    renderWorks();
    renderMoney();
    renderReports();
    updateSettingsUI();
    renderBackupBanner();
    if (state.detailId) renderDetail();
  }

  /* ==================== Рендер: обзор ==================== */
  function renderOverview() {
    markChips($('#overviewPeriod'), 'period', state.overviewPeriod);

    const stats = buildStats();
    const works = state.works.filter((w) => inPeriod(w.date, state.overviewPeriod));
    const billableWorks = periodWorks(state.overviewPeriod);
    const fixedProjects = periodProjects(state.overviewPeriod);
    const payments = state.payments.filter((p) => inPeriod(p.date, state.overviewPeriod));
    const earned = periodEarned(state.overviewPeriod);
    const paid = round2(payments.reduce((sum, p) => sum + num(p.amount), 0));
    const hours = round2(works.reduce((sum, w) => sum + num(w.hours), 0));
    const expenses = periodExpenses(state.overviewPeriod);
    const tax = taxAmount(earned);
    const net = round2(earned - expenses - tax);

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
    const workCount = billableWorks.length + fixedProjects.length;
    $('#statEarnedHint').textContent = workCount + ' ' + plural(workCount, ['работа', 'работы', 'работ']);
    $('#statPaid').textContent = fmtMoney(paid);
    $('#statPaidHint').textContent = payments.length + ' ' + plural(payments.length, ['платёж', 'платежа', 'платежей']);
    $('#statHours').textContent = fmtHours(hours);
    $('#statHoursHint').textContent = 'за период';

    $('#finEarned').textContent = fmtMoney(earned);
    $('#finExpenses').textContent = fmtMoney(expenses);
    $('#finTax').textContent = fmtMoney(tax);
    $('#finTaxRate').textContent = state.taxRate > 0 ? '(' + num(state.taxRate) + '%)' : '';
    $('#finNet').textContent = fmtMoney(net);
    $('#finNet').classList.toggle('neg', net < -0.005);
    $('#finTaxRow').hidden = !(state.taxRate > 0);

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
          '<span class="debtor-amount">' + (isFixedWork(w) ? 'фикс' : fmtMoney(workAmount(w))) + '</span>' +
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
    const amount = round2(list.reduce((sum, w) => sum + workBilledAmount(w), 0));
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
      const dayAmount = round2(items.reduce((sum, w) => sum + workBilledAmount(w), 0));
      html += '<div class="day-group">' +
        '<div class="day-head"><span>' + esc(fmtDayLabel(date)) + '</span><span>' + fmtHours(dayHours) + ' · ' + fmtMoney(dayAmount) + '</span></div>' +
        items.map((w) => {
          const cat = categoryById(w.category);
          const project = projectById(w.projectId);
          const fixed = isFixedWork(w);
          const sub = (cat
            ? '<span class="cat-dot" style="background:' + cat.color + '"></span>' + esc(cat.label)
            : 'Без категории') +
            (project ? ' · ' + esc(project.name) : '') +
            (w.note ? ' · ' + esc(w.note) : '');
          const time = timeRange(w.start, w.end);
          return '<div class="work-row">' +
            '<div class="row-main"><strong>' + esc(clientName(w.clientId)) + '</strong>' +
              '<span class="row-sub">' + sub + '</span></div>' +
            '<div class="row-meta"><b>' + fmtHours(w.hours) + '</b>' + (time ? '<span>' + esc(time) + '</span>' : '') + '</div>' +
            '<div class="row-amount' + (fixed ? ' row-fixed' : '') + '">' + (fixed ? 'фикс' : fmtMoney(workAmount(w))) + '</div>' +
            '<div class="row-actions">' + copyBtn('duplicate-work', w.id, 'Повторить работу') + editBtn('edit-work', w.id, 'Редактировать работу') + trashBtn('delete-work', w.id, 'Удалить работу') + '</div>' +
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
  function expenseCategory(id) {
    return EXPENSE_CATEGORIES.find((c) => c.id === id) || null;
  }

  function renderMoney() {
    markChips($('#moneyKind'), 'kind', state.moneyKind);
    markChips($('#moneyPeriod'), 'period', state.moneyPeriod);
    const isExpenses = state.moneyKind === 'expenses';
    const q = state.moneyQuery.trim().toLowerCase();
    const addBtn = $('#moneyAddBtn');
    if (addBtn) {
      addBtn.dataset.action = isExpenses ? 'new-expense' : 'new-payment';
      addBtn.textContent = isExpenses ? '+ Расход' : '+ Оплата';
    }
    const clientSelect = $('#moneyClient');
    if (clientSelect) clientSelect.hidden = isExpenses;
    fillClientSelect(clientSelect, 'Все клиенты', state.moneyClient);
    const search = $('#moneySearch');
    if (search) search.placeholder = isExpenses ? 'Поиск по комментарию' : 'Поиск по комментарию';

    if (isExpenses) {
      let list = state.expenses.filter((e) => inPeriod(e.date, state.moneyPeriod));
      if (q) {
        list = list.filter((e) => {
          const cat = expenseCategory(e.category);
          return str(e.note).toLowerCase().includes(q) || (cat ? cat.label.toLowerCase() : '').includes(q);
        });
      }
      list.sort(sortByDateDesc);
      const total = round2(list.reduce((sum, e) => sum + num(e.amount), 0));
      $('#moneySub').textContent = list.length
        ? list.length + ' ' + plural(list.length, ['расход', 'расхода', 'расходов']) + ' · ' + fmtMoney(total)
        : (state.expenses.length ? 'Нет расходов за выбранный период' : 'Расходы на работу');
      $('#moneyTotal').hidden = list.length === 0;
      $('#moneyTotalLabel').textContent = 'Расходы за период';
      $('#moneyTotalValue').textContent = fmtMoney(total);
      $('#moneyList').innerHTML = list.map((e) => {
        const cat = expenseCategory(e.category);
        const sub = (cat ? cat.label : 'Другое') + (e.note ? ' · ' + esc(e.note) : '');
        return '<div class="money-row">' +
          '<div class="row-main"><strong>' + esc(cat ? cat.label : 'Расход') + '</strong>' +
            '<span class="row-sub">' + (e.note ? esc(e.note) : 'Без комментария') + '</span></div>' +
          '<div class="row-meta">' + fmtDate(e.date) + '</div>' +
          '<div class="row-amount neg">−' + fmtMoney(e.amount) + '</div>' +
          '<div class="row-actions">' + editBtn('edit-expense', e.id, 'Редактировать расход') + trashBtn('delete-expense', e.id, 'Удалить расход') + '</div>' +
        '</div>';
      }).join('');
      const empty = $('#moneyEmpty');
      empty.hidden = list.length > 0;
      $('#moneyEmptyText').textContent = state.expenses.length
        ? 'Ничего не найдено — измените период.'
        : 'Расходов пока нет. Добавьте хостинг, подписки или технику.';
      const emptyBtn = $('.btn', empty);
      if (emptyBtn) {
        emptyBtn.hidden = state.expenses.length > 0;
        emptyBtn.dataset.action = 'new-expense';
        emptyBtn.textContent = 'Добавить расход';
      }
      return;
    }

    let list = state.payments.filter((p) => inPeriod(p.date, state.moneyPeriod));
    if (state.moneyClient) list = list.filter((p) => p.clientId === state.moneyClient);
    if (q) {
      list = list.filter((p) => clientName(p.clientId).toLowerCase().includes(q) ||
        str(p.note).toLowerCase().includes(q) ||
        str(METHODS[p.method] || '').toLowerCase().includes(q));
    }
    list.sort(sortByDateDesc);

    const total = round2(list.reduce((sum, p) => sum + num(p.amount), 0));
    $('#moneySub').textContent = list.length
      ? list.length + ' ' + plural(list.length, ['оплата', 'оплаты', 'оплат']) + ' · ' + fmtMoney(total)
      : (state.payments.length ? 'Нет оплат за выбранный период' : 'Оплаты от клиентов');
    $('#moneyTotal').hidden = list.length === 0;
    $('#moneyTotalLabel').textContent = 'Итого за период';
    $('#moneyTotalValue').textContent = fmtMoney(total);

    $('#moneyList').innerHTML = list.map((p) => {
      const method = METHODS[p.method] || 'Оплата';
      const project = projectById(p.projectId);
      const sub = method + (project ? ' · ' + esc(project.name) : '') + (p.note ? ' · ' + esc(p.note) : '');
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
    if (emptyBtn) {
      emptyBtn.hidden = state.payments.length > 0;
      emptyBtn.dataset.action = 'new-payment';
      emptyBtn.textContent = 'Внести оплату';
    }
  }

  /* ==================== Рендер: отчёты ==================== */
  function monthKey(iso) {
    return str(iso).slice(0, 7);
  }

  function monthLabel(key) {
    const parts = key.split('-').map(Number);
    if (parts.length !== 2 || parts.some(Number.isNaN)) return key;
    return new Date(parts[0], parts[1] - 1, 1).toLocaleDateString('ru-RU', { month: 'short' });
  }

  function monthInPeriod(dateISO, period) {
    if (period === 'all') return true;
    return inPeriod(dateISO, period);
  }

  function renderReports() {
    markChips($('#reportsPeriod'), 'period', state.reportPeriod);
    const period = state.reportPeriod;
    const earned = periodEarned(period);
    const payments = state.payments.filter((p) => inPeriod(p.date, period));
    const paid = round2(payments.reduce((sum, p) => sum + num(p.amount), 0));
    const expenses = periodExpenses(period);
    const tax = taxAmount(earned);
    const net = round2(earned - expenses - tax);
    const works = state.works.filter((w) => inPeriod(w.date, period));
    const hours = round2(works.reduce((sum, w) => sum + num(w.hours), 0));
    const billableWorks = works.filter((w) => !isFixedWork(w));
    const billableHours = round2(billableWorks.reduce((sum, w) => sum + num(w.hours), 0));
    const billableEarned = round2(billableWorks.reduce((sum, w) => sum + workAmount(w), 0));
    const avg = billableHours > 0 ? round2(billableEarned / billableHours) : 0;
    const periods = { month: 'этот месяц', prev: 'прошлый месяц', all: 'всё время' };
    $('#reportsSub').textContent = 'Доходы, расходы и часы — ' + (periods[period] || periods.month);

    $('#reportSummary').innerHTML =
      '<div class="report-kpi"><span>Заработано</span><b>' + fmtMoney(earned) + '</b></div>' +
      '<div class="report-kpi"><span>Оплачено</span><b class="pos">' + fmtMoney(paid) + '</b></div>' +
      '<div class="report-kpi"><span>Расходы</span><b class="neg">' + fmtMoney(expenses) + '</b></div>' +
      '<div class="report-kpi"><span>Налог' + (state.taxRate > 0 ? ' ' + state.taxRate + '%' : '') + '</span><b class="neg">' + fmtMoney(tax) + '</b></div>' +
      '<div class="report-kpi"><span>Чистыми</span><b class="' + (net < 0 ? 'neg' : 'pos') + '">' + fmtMoney(net) + '</b></div>' +
      '<div class="report-kpi"><span>Средняя ставка</span><b>' + (avg ? fmtMoney(avg) + '/ч' : '—') + '</b></div>' +
      '<div class="report-kpi"><span>Часы</span><b>' + fmtHours(hours) + '</b></div>';

    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(d.getFullYear() + '-' + pad(d.getMonth() + 1));
    }
    const rows = months.map((key) => {
      const monthWorks = state.works.filter((w) => monthKey(w.date) === key && !isFixedWork(w));
      const fixed = state.projects.filter((p) => p.type === 'fixed' && monthKey(projectDate(p)) === key);
      const e = round2(monthWorks.reduce((sum, w) => sum + workAmount(w), 0) +
        fixed.reduce((sum, p) => sum + num(p.budget), 0));
      const p = round2(state.payments.filter((x) => monthKey(x.date) === key).reduce((sum, x) => sum + num(x.amount), 0));
      const ex = round2(state.expenses.filter((x) => monthKey(x.date) === key).reduce((sum, x) => sum + num(x.amount), 0));
      return { key, e, p, ex };
    });
    const max = Math.max(1, ...rows.flatMap((r) => [r.e, r.p, r.ex]));
    const bar = (value, cls, label) => value > 0
      ? '<i class="bar ' + cls + '" style="height:' + Math.max(2, Math.round(value / max * 100)) + '%" title="' + label + ' ' + fmtMoney(value) + '"></i>'
      : '';
    $('#reportChart').innerHTML = rows.map((r) => (
      '<div class="chart-col">' +
        '<div class="chart-bars">' +
          bar(r.e, 'earned', 'Заработано') +
          bar(r.p, 'paid', 'Оплачено') +
          bar(r.ex, 'expense', 'Расходы') +
        '</div>' +
        '<span class="chart-label">' + esc(monthLabel(r.key)) + '</span>' +
      '</div>'
    )).join('');

    const stats = buildStats();
    const fixedForPeriod = periodProjects(period);
    const clientRows = state.clients
      .map((c) => {
        const cw = works.filter((w) => w.clientId === c.id);
        const cEarned = round2(
          cw.filter((w) => !isFixedWork(w)).reduce((sum, w) => sum + workAmount(w), 0) +
          fixedForPeriod.filter((p) => p.clientId === c.id).reduce((sum, p) => sum + num(p.budget), 0)
        );
        const cPaid = round2(payments.filter((p) => p.clientId === c.id).reduce((sum, p) => sum + num(p.amount), 0));
        const cHours = round2(cw.reduce((sum, w) => sum + num(w.hours), 0));
        return { c, s: stats.get(c.id), earned: cEarned, paid: cPaid, hours: cHours };
      })
      .filter((row) => row.earned > 0 || row.paid > 0 || row.hours > 0)
      .sort((a, b) => b.earned - a.earned)
      .slice(0, 8);
    const maxEarned = Math.max(1, ...clientRows.map((r) => r.earned));
    $('#reportClients').innerHTML = clientRows.length
      ? clientRows.map(({ c, s, earned: cEarned, hours: cHours }) => (
        '<div class="report-line">' +
          '<div class="report-line-main"><span>' + esc(c.name) + '</span>' +
            '<small>' + fmtHours(cHours) + ' · долг ' + (s.balance < -0.005 ? fmtMoney(Math.abs(s.balance)) : '0 ₽') + '</small>' +
            '<i class="report-bar" style="width:' + Math.max(2, Math.round(cEarned / maxEarned * 100)) + '%"></i></div>' +
          '<b>' + fmtMoney(cEarned) + '</b>' +
        '</div>'
      )).join('')
      : '<p class="detail-empty">Пока нет данных.</p>';

    const catMap = new Map();
    works.forEach((w) => {
      if (isFixedWork(w)) return;
      const cat = categoryById(w.category);
      const key = cat ? cat.id : 'none';
      if (!catMap.has(key)) catMap.set(key, {
        label: cat ? cat.label : 'Без категории', color: cat ? cat.color : '#64748b', hours: 0, amount: 0
      });
      const row = catMap.get(key);
      row.hours += num(w.hours);
      row.amount += workAmount(w);
    });
    const fixedInPeriod = periodProjects(period);
    if (fixedInPeriod.length) {
      catMap.set('fixed', {
        label: 'Фикс-проекты', color: '#0f766e', hours: 0,
        amount: round2(fixedInPeriod.reduce((sum, p) => sum + num(p.budget), 0))
      });
    }
    const catRows = Array.from(catMap.values()).sort((a, b) => b.amount - a.amount);
    const maxCat = Math.max(1, ...catRows.map((r) => r.amount));
    $('#reportCategories').innerHTML = catRows.length
      ? catRows.map((r) => (
        '<div class="report-line">' +
          '<div class="report-line-main"><span><i class="cat-dot" style="background:' + r.color + '"></i>' + esc(r.label) + '</span>' +
            '<small>' + fmtHours(round2(r.hours)) + '</small>' +
            '<i class="report-bar" style="width:' + Math.max(2, Math.round(r.amount / maxCat * 100)) + '%;background:' + r.color + '"></i></div>' +
          '<b>' + fmtMoney(r.amount) + '</b>' +
        '</div>'
      )).join('')
      : '<p class="detail-empty">Пока нет работ.</p>';

    const buckets = { '0–30': 0, '31–60': 0, '61+': 0 };
    state.clients.forEach((c) => {
      const s = stats.get(c.id);
      if (!s || s.balance >= -0.005) return;
      const clientWorks = state.works.filter((w) => w.clientId === c.id).sort((a, b) => String(a.date).localeCompare(String(b.date)));
      const oldest = clientWorks.length ? clientWorks[0].date : null;
      const days = oldest ? Math.max(0, Math.floor((Date.now() - parseISO(oldest).getTime()) / 86400000)) : 0;
      const key = days <= 30 ? '0–30' : days <= 60 ? '31–60' : '61+';
      buckets[key] += Math.abs(s.balance);
    });
    const totalDebt = round2(buckets['0–30'] + buckets['31–60'] + buckets['61+']);
    $('#reportAging').innerHTML = totalDebt > 0
      ? '<div class="aging-grid">' + Object.keys(buckets).map((k) => (
        '<div class="aging-item"><span>' + k + ' дней</span><b>' + fmtMoney(buckets[k]) + '</b></div>'
      )).join('') + '</div>'
      : '<p class="detail-empty">Долгов нет — красота.</p>';
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
    const projects = projectsForClient(client.id);
    const invoices = state.invoices.filter((i) => i.clientId === client.id).sort(sortByDateDesc);
    const worksTotal = round2(works.reduce((sum, w) => sum + workBilledAmount(w), 0));
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
      '<button class="btn" type="button" data-action="new-project" data-id="' + id + '">Проект</button>' +
      '<button class="btn" type="button" data-action="new-invoice" data-id="' + id + '">Счёт</button>' +
      '<button class="btn btn-ghost" type="button" data-action="edit-client" data-id="' + id + '">Редактировать</button>' +
      '<button class="btn btn-ghost danger-text" type="button" data-action="delete-client" data-id="' + id + '">Удалить</button>' +
    '</div>';

    html += '<section class="detail-section"><h4>Проекты <span>' + projects.length + '</span></h4>';
    html += projects.length
      ? projects.map((p) => {
        const type = p.type === 'fixed' ? 'фикс' : 'почасовой';
        const amount = p.type === 'fixed' ? fmtMoney(p.budget) : fmtMoney(projectEarned(p));
        return '<div class="detail-line detail-line-actions">' +
          '<span class="dl-main"><b>' + esc(p.name) + '</b> · ' + type +
            (p.status === 'done' ? ' · завершён' : '') + '</span>' +
          '<span class="dl-sum">' + amount + '</span>' +
          editBtn('edit-project', p.id, 'Редактировать проект') +
          trashBtn('delete-project', p.id, 'Удалить проект') +
        '</div>';
      }).join('')
      : '<p class="detail-empty">Проектов пока нет. Можно вести и без них.</p>';
    html += '</section>';

    html += '<section class="detail-section"><h4>Работы <span>' + works.length + ' · ' + fmtMoney(worksTotal) + '</span></h4>';
    html += works.length
      ? works.slice(0, 8).map((w) => {
        const cat = categoryById(w.category);
        const project = projectById(w.projectId);
        const label = fmtDate(w.date) + ' · ' + fmtHours(w.hours) +
          (cat ? ' · ' + esc(cat.label) : '') +
          (project ? ' · ' + esc(project.name) : '') +
          (w.note ? ' · ' + esc(w.note) : '');
        return '<div class="detail-line"><span class="dl-main">' + label + '</span><span class="dl-sum' + (isFixedWork(w) ? ' muted-sum' : '') + '">' +
          (isFixedWork(w) ? 'фикс' : fmtMoney(workAmount(w))) + '</span></div>';
      }).join('')
      : '<p class="detail-empty">Работ пока нет.</p>';
    html += '</section>';

    html += '<section class="detail-section"><h4>Оплаты <span>' + payments.length + ' · ' + fmtMoney(paymentsTotal) + '</span></h4>';
    html += payments.length
      ? payments.slice(0, 6).map((p) => {
        const project = projectById(p.projectId);
        const label = fmtDate(p.date) + ' · ' + esc(METHODS[p.method] || 'Оплата') +
          (project ? ' · ' + esc(project.name) : '') +
          (p.note ? ' · ' + esc(p.note) : '');
        return '<div class="detail-line"><span class="dl-main">' + label + '</span><span class="dl-sum pos">+' + fmtMoney(p.amount) + '</span></div>';
      }).join('')
      : '<p class="detail-empty">Оплат пока нет.</p>';
    html += '</section>';

    html += '<section class="detail-section"><h4>Счета <span>' + invoices.length + '</span></h4>';
    html += invoices.length
      ? invoices.map((inv) => (
        '<div class="detail-line detail-line-actions">' +
          '<span class="dl-main"><b>' + esc(inv.number) + '</b> · ' + fmtDate(inv.date) + ' · ' +
            esc(INVOICE_STATUS[inv.status] || 'Черновик') + '</span>' +
          '<span class="dl-sum">' + fmtMoney(inv.total) + '</span>' +
          printBtn('print-invoice', inv.id, 'Печать счёта') +
          trashBtn('delete-invoice', inv.id, 'Удалить счёт') +
        '</div>'
      )).join('')
      : '<p class="detail-empty">Счетов пока нет.</p>';
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
    if ($('#settingTaxRate')) $('#settingTaxRate').value = state.taxRate || '';
    if ($('#settingMyName')) $('#settingMyName').value = state.myName || '';
    if ($('#settingMyDetails')) $('#settingMyDetails').value = state.myDetails || '';
    if ($('#rateLabel')) $('#rateLabel').textContent = 'Ставка, ' + (CURRENCY_SYMBOL[state.currency] || '₽') + '/час *';
    if ($('#projectBudgetLabel')) {
      $('#projectBudgetLabel').textContent = 'Бюджет, ' + (CURRENCY_SYMBOL[state.currency] || '₽');
    }
    const backupStatus = $('#backupStatus');
    if (backupStatus) {
      backupStatus.textContent = state.lastBackupAt
        ? 'Последний бэкап: ' + new Date(state.lastBackupAt).toLocaleString('ru-RU')
        : 'Бэкап ещё не делали.';
    }
    const storage = $('#storageStatus');
    if (storage) {
      storage.textContent = state.storagePersisted
        ? 'Постоянное хранилище включено — браузер не удалит данные при нехватке места.'
        : 'Постоянное хранилище не включено. Браузер может очистить данные при нехватке места.';
    }
    if ($('#persistBtn')) $('#persistBtn').hidden = state.storagePersisted || !canPersist();
    updateTimerUI();
  }

  function canPersist() {
    return !!(navigator.storage && typeof navigator.storage.persist === 'function');
  }

  async function refreshPersistStatus() {
    if (!navigator.storage || typeof navigator.storage.persisted !== 'function') return;
    try { state.storagePersisted = await navigator.storage.persisted(); } catch (e) { /* без статуса */ }
  }

  async function requestPersist() {
    if (!canPersist()) return;
    try {
      state.storagePersisted = await navigator.storage.persist();
      updateSettingsUI();
      toast(state.storagePersisted ? 'Постоянное хранилище включено' : 'Браузер не дал включить постоянное хранилище', state.storagePersisted ? 'ok' : 'error');
    } catch (e) {
      console.error(e);
      toast('Не удалось включить постоянное хранилище', 'error');
    }
  }

  function daysSince(iso) {
    if (!iso) return Infinity;
    const t = new Date(iso).getTime();
    if (!Number.isFinite(t)) return Infinity;
    return Math.floor((Date.now() - t) / 86400000);
  }

  function renderBackupBanner() {
    const banner = $('#backupBanner');
    if (!banner) return;
    const hasData = state.clients.length || state.works.length || state.payments.length ||
      state.expenses.length || state.invoices.length || state.projects.length;
    if (!hasData) { banner.hidden = true; return; }
    const snoozed = state.backupSnoozeUntil && state.backupSnoozeUntil >= todayISO();
    const days = daysSince(state.lastBackupAt);
    banner.hidden = snoozed || days < BACKUP_DAYS;
    if (banner.hidden) return;
    const text = $('#backupBannerText');
    if (text) {
      text.textContent = state.lastBackupAt
        ? 'Последний бэкап ' + days + ' ' + plural(days, ['день', 'дня', 'дней']) + ' назад. Скачайте свежую копию.'
        : 'Данные хранятся только в этом браузере. Скачайте первую копию.';
    }
  }

  function snoozeBackup() {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    state.backupSnoozeUntil = toISO(d);
    DB.setMeta('backupSnoozeUntil', state.backupSnoozeUntil).catch(console.error);
    renderBackupBanner();
    toast('Напомним через 3 дня');
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
      } else if (item.type === 'project') {
        title = '📁 Проект: ' + esc(item.data.name);
        details = clientName(item.data.clientId) + ' · ' + (item.data.type === 'fixed' ? fmtMoney(item.data.budget) : 'почасовой');
      } else if (item.type === 'expense') {
        const cat = expenseCategory(item.data.category);
        title = '🧾 Расход: ' + fmtMoney(item.data.amount);
        details = fmtDate(item.data.date) + ' · ' + (cat ? cat.label : 'Другое');
      } else if (item.type === 'invoice') {
        title = '📄 Счёт: ' + esc(item.data.number);
        details = clientName(item.data.clientId) + ' · ' + fmtMoney(item.data.total);
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
    /* Последнее открытое окно должно быть выше остальных. */
    if (modal.parentNode === document.body) document.body.appendChild(modal);
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
  function toast(message, type, action) {
    const box = $('#toasts');
    if (!box) return;
    const el = document.createElement('div');
    el.className = 'toast ' + (type || '');
    const text = document.createElement('span');
    text.textContent = message;
    el.appendChild(text);
    if (action && action.label && typeof action.onClick === 'function') {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'toast-action';
      btn.textContent = action.label;
      btn.addEventListener('click', () => {
        action.onClick();
        el.remove();
      });
      el.appendChild(btn);
    }
    box.appendChild(el);
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 220);
    }, action ? 7000 : 2800);
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

  function ensureClient() {
    if (state.clients.length) return true;
    toast('Сначала добавьте клиента');
    openClient();
    return false;
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
    const projects = state.projects.filter((p) => p.clientId === id).length;
    const invoices = state.invoices.filter((i) => i.clientId === id).length;
    askConfirm({
      title: 'Удалить клиента?',
      text: '<b>' + esc(c.name) + '</b> и связанные записи (' + works + ' ' +
        plural(works, ['работа', 'работы', 'работ']) + ', ' + payments + ' ' +
        plural(payments, ['оплата', 'оплаты', 'оплат']) + ', ' + projects + ' ' +
        plural(projects, ['проект', 'проекта', 'проектов']) + ', ' + invoices + ' ' +
        plural(invoices, ['счёт', 'счёта', 'счетов']) + ') переместятся в корзину. Их можно вернуть.',
      okLabel: 'Удалить',
      onOk: () => removeClient(id)
    });
  }

  async function removeClient(id) {
    const client = clientById(id);
    if (!client) return;
    const works = state.works.filter((w) => w.clientId === id);
    const payments = state.payments.filter((p) => p.clientId === id);
    const projects = state.projects.filter((p) => p.clientId === id);
    const invoices = state.invoices.filter((i) => i.clientId === id);
    const entry = {
      id: uid(),
      type: 'client',
      data: client,
      works,
      payments,
      projects,
      invoices,
      removedAt: new Date().toISOString()
    };
    try {
      await DB.put('trash', entry);
      await Promise.all([
        DB.remove('clients', id),
        ...works.map((w) => DB.remove('works', w.id)),
        ...payments.map((p) => DB.remove('payments', p.id)),
        ...projects.map((p) => DB.remove('projects', p.id)),
        ...invoices.map((i) => DB.remove('invoices', i.id))
      ]);
      state.clients = state.clients.filter((c) => c.id !== id);
      state.works = state.works.filter((w) => w.clientId !== id);
      state.payments = state.payments.filter((p) => p.clientId !== id);
      state.projects = state.projects.filter((p) => p.clientId !== id);
      state.invoices = state.invoices.filter((i) => i.clientId !== id);
      state.trash.push(entry);
      if (state.detailId === id) closeModal($('#detailModal'));
      renderAll();
      toast('Клиент в корзине', '', { label: 'Вернуть', onClick: () => restoreTrash(entry.id) });
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
    if (!id && !ensureClient()) return;
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
    fillProjectSelect($('#workProject'), presetClientId || '', '', 'Без проекта');

    if (id) {
      const w = state.works.find((item) => item.id === id);
      if (!w) return;
      state.editingWork = w.id;
      $('#workId').value = w.id;
      fillClientSelect($('#workClient'), 'Выберите клиента', w.clientId);
      fillProjectSelect($('#workProject'), w.clientId, w.projectId, 'Без проекта');
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
    const project = projectById($('#workProject').value);
    if (project && project.type === 'fixed') {
      box.textContent = 'Входит в фикс-проект «' + project.name + '» — сумма не меняется';
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
    const project = projectById($('#workProject').value);
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
      projectId: $('#workProject').value,
      billable: !(project && project.type === 'fixed'),
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

  async function duplicateWork(id) {
    const source = state.works.find((w) => w.id === id);
    if (!source) return;
    const client = clientById(source.clientId);
    if (!client) return;
    const now = new Date().toISOString();
    const data = {
      id: uid(),
      clientId: source.clientId,
      date: todayISO(),
      hours: round2(num(source.hours)),
      rate: round2(num(client.rate)),
      start: '',
      end: '',
      projectId: source.projectId || '',
      billable: source.billable !== false,
      category: source.category || '',
      note: source.note || '',
      createdAt: now,
      updatedAt: now
    };
    try {
      await DB.put('works', data);
      upsertLocal('works', data);
      renderAll();
      toast('Работа добавлена на сегодня', 'ok', {
        label: 'Изменить',
        onClick: () => openWork(data.id)
      });
    } catch (e) {
      console.error(e);
      toast('Не удалось повторить работу', 'error');
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
          toast('Работа в корзине', '', { label: 'Вернуть', onClick: () => restoreTrash(entry.id) });
        } catch (e) {
          console.error(e);
          toast('Не удалось удалить работу', 'error');
        }
      }
    });
  }

  /* ==================== Оплаты ==================== */
  function openPayment(id, presetClientId) {
    if (!id && !ensureClient()) return;
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
    fillProjectSelect($('#paymentProject'), presetClientId || '', '', 'Без проекта');

    if (id) {
      const p = state.payments.find((item) => item.id === id);
      if (!p) return;
      $('#paymentId').value = p.id;
      fillClientSelect($('#paymentClient'), 'Выберите клиента', p.clientId);
      fillProjectSelect($('#paymentProject'), p.clientId, p.projectId, 'Без проекта');
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
      projectId: $('#paymentProject').value,
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
          toast('Оплата в корзине', '', { label: 'Вернуть', onClick: () => restoreTrash(entry.id) });
        } catch (e) {
          console.error(e);
          toast('Не удалось удалить оплату', 'error');
        }
      }
    });
  }

  /* ==================== Проекты ==================== */
  function fillProjectSelect(select, clientId, value, placeholder) {
    if (!select) return;
    const list = clientId ? projectsForClient(clientId) : [];
    const field = select.closest('.field');
    if (field) field.hidden = !clientId || list.length === 0;
    select.innerHTML = '<option value="">' + esc(placeholder || 'Без проекта') + '</option>' +
      list.map((p) => '<option value="' + esc(p.id) + '">' + esc(p.name) + (p.type === 'fixed' ? ' · фикс' : '') + '</option>').join('');
    select.value = value || '';
    if (select.value !== (value || '')) select.value = '';
  }

  function openProject(id, presetClientId) {
    if (!id && !ensureClient()) return;
    const form = $('#projectForm');
    form.reset();
    clearFormErrors(form);
    $('#projectId').value = '';
    $('#projectModalTitle').textContent = id ? 'Проект' : 'Новый проект';
    fillClientSelect($('#projectClient'), 'Выберите клиента', presetClientId || '');
    $('#projectType').value = 'hourly';
    $('#projectBudget').value = '';
    $('#projectStart').value = todayISO();
    $('#projectDue').value = '';
    $('#projectStatus').value = 'active';
    $('#projectNote').value = '';
    if (id) {
      const p = projectById(id);
      if (!p) return;
      $('#projectId').value = p.id;
      fillClientSelect($('#projectClient'), 'Выберите клиента', p.clientId);
      $('#projectName').value = p.name || '';
      $('#projectType').value = p.type || 'hourly';
      $('#projectBudget').value = p.budget || '';
      $('#projectStart').value = p.startDate || '';
      $('#projectDue').value = p.dueDate || '';
      $('#projectStatus').value = p.status || 'active';
      $('#projectNote').value = p.note || '';
    }
    updateProjectTypeUI();
    openModal('projectModal', true);
  }

  function updateProjectTypeUI() {
    const type = $('#projectType').value;
    const fixed = type === 'fixed';
    if ($('#projectBudgetLabel')) {
      $('#projectBudgetLabel').textContent = (fixed ? 'Сумма, ' : 'Ориентир, ') + (CURRENCY_SYMBOL[state.currency] || '₽');
    }
    if ($('#projectHint')) {
      $('#projectHint').textContent = fixed
        ? 'Фиксированный проект добавляет бюджет в доход. Часы по нему идут только для статистики.'
        : 'Почасовой проект считает доход по часам и ставке клиента.';
    }
  }

  async function saveProject(event) {
    event.preventDefault();
    const form = event.currentTarget;
    clearFormErrors(form);
    const id = $('#projectId').value;
    const clientId = $('#projectClient').value;
    const name = $('#projectName').value.trim();
    const type = $('#projectType').value === 'fixed' ? 'fixed' : 'hourly';
    const budget = num($('#projectBudget').value);
    let valid = true;
    if (!clientId) {
      setFieldError('projectClient', 'projectClientErr', 'Выберите клиента');
      valid = false;
    }
    if (!name) {
      setFieldError('projectName', 'projectNameErr', 'Введите название');
      valid = false;
    }
    if (type === 'fixed' && !(budget > 0)) {
      setFieldError('projectBudget', 'projectBudgetErr', 'Укажите сумму проекта');
      valid = false;
    }
    if (!valid) return;
    const old = id ? projectById(id) : null;
    const now = new Date().toISOString();
    const data = {
      id: id || uid(),
      clientId,
      name,
      type,
      budget: round2(budget),
      startDate: $('#projectStart').value,
      dueDate: $('#projectDue').value,
      status: $('#projectStatus').value,
      note: $('#projectNote').value.trim(),
      createdAt: old && old.createdAt ? old.createdAt : now,
      updatedAt: now
    };
    try {
      await DB.put('projects', data);
      upsertLocal('projects', data);
      if (old && old.type !== data.type) {
        const linked = state.works.filter((w) => w.projectId === data.id);
        linked.forEach((w) => { w.billable = data.type !== 'fixed'; });
        await Promise.all(linked.map((w) => DB.put('works', w)));
      }
      closeModal($('#projectModal'));
      toast(id ? 'Проект обновлён' : 'Проект добавлен', 'ok');
      renderAll();
    } catch (e) {
      console.error(e);
      toast('Не удалось сохранить проект', 'error');
    }
  }

  function confirmDeleteProject(id) {
    const p = projectById(id);
    if (!p) return;
    const works = state.works.filter((w) => w.projectId === id).length;
    askConfirm({
      title: 'Удалить проект?',
      text: '<b>' + esc(p.name) + '</b> будет убран. ' + (works ? 'Записи работ останутся в истории. ' : '') +
        (p.type === 'fixed' ? 'Фиксированная сумма исчезнет из дохода. ' : '') + 'Проект можно вернуть из корзины.',
      okLabel: 'Удалить',
      onOk: async () => {
        const entry = { id: uid(), type: 'project', data: p, removedAt: new Date().toISOString() };
        try {
          const linked = p.type === 'fixed' ? state.works.filter((w) => w.projectId === id) : [];
          linked.forEach((w) => { w.billable = false; });
          await Promise.all(linked.map((w) => DB.put('works', w)));
          await DB.put('trash', entry);
          await DB.remove('projects', id);
          state.projects = state.projects.filter((x) => x.id !== id);
          state.trash.push(entry);
          renderAll();
          toast('Проект в корзине', '', { label: 'Вернуть', onClick: () => restoreTrash(entry.id) });
        } catch (e) {
          console.error(e);
          toast('Не удалось удалить проект', 'error');
        }
      }
    });
  }

  /* ==================== Расходы ==================== */
  function fillExpenseCategories() {
    const select = $('#expenseCategory');
    if (!select || select.dataset.filled === '1') return;
    select.innerHTML = EXPENSE_CATEGORIES.map((c) => '<option value="' + c.id + '">' + esc(c.label) + '</option>').join('');
    select.dataset.filled = '1';
  }

  function openExpense(id) {
    const form = $('#expenseForm');
    form.reset();
    clearFormErrors(form);
    fillExpenseCategories();
    $('#expenseId').value = '';
    $('#expenseDate').value = todayISO();
    $('#expenseAmount').value = '';
    $('#expenseCategory').value = 'software';
    $('#expenseNote').value = '';
    $('#expenseModalTitle').textContent = id ? 'Расход' : 'Новый расход';
    if (id) {
      const e = state.expenses.find((x) => x.id === id);
      if (!e) return;
      $('#expenseId').value = e.id;
      $('#expenseDate').value = e.date || todayISO();
      $('#expenseAmount').value = e.amount;
      $('#expenseCategory').value = e.category || 'other';
      $('#expenseNote').value = e.note || '';
    }
    openModal('expenseModal', true);
  }

  async function saveExpense(event) {
    event.preventDefault();
    const form = event.currentTarget;
    clearFormErrors(form);
    const id = $('#expenseId').value;
    const date = $('#expenseDate').value;
    const amount = num($('#expenseAmount').value);
    if (!(amount > 0)) {
      setFieldError('expenseAmount', 'expenseAmountErr', 'Укажите сумму больше нуля');
      return;
    }
    if (!date) {
      $('#expenseDate').classList.add('error');
      return;
    }
    const old = id ? state.expenses.find((e) => e.id === id) : null;
    const now = new Date().toISOString();
    const data = {
      id: id || uid(),
      date,
      amount: round2(amount),
      category: $('#expenseCategory').value,
      note: $('#expenseNote').value.trim(),
      createdAt: old && old.createdAt ? old.createdAt : now,
      updatedAt: now
    };
    try {
      await DB.put('expenses', data);
      upsertLocal('expenses', data);
      closeModal($('#expenseModal'));
      toast(id ? 'Расход обновлён' : 'Расход добавлен', 'ok');
      renderAll();
    } catch (e) {
      console.error(e);
      toast('Не удалось сохранить расход', 'error');
    }
  }

  function confirmDeleteExpense(id) {
    const ex = state.expenses.find((e) => e.id === id);
    if (!ex) return;
    askConfirm({
      title: 'Удалить расход?',
      text: 'Расход <b>' + fmtMoney(ex.amount) + '</b> от ' + fmtDate(ex.date) + ' переместится в корзину.',
      okLabel: 'Удалить',
      onOk: async () => {
        const entry = { id: uid(), type: 'expense', data: ex, removedAt: new Date().toISOString() };
        try {
          await DB.put('trash', entry);
          await DB.remove('expenses', id);
          state.expenses = state.expenses.filter((x) => x.id !== id);
          state.trash.push(entry);
          renderAll();
          toast('Расход в корзине', '', { label: 'Вернуть', onClick: () => restoreTrash(entry.id) });
        } catch (e) {
          console.error(e);
          toast('Не удалось удалить расход', 'error');
        }
      }
    });
  }

  /* ==================== Счета ==================== */
  function nextInvoiceNumber() {
    const year = new Date().getFullYear();
    let max = 0;
    state.invoices.forEach((inv) => {
      const m = /^СЧ-\d{4}-(\d+)$/.exec(str(inv.number));
      if (m) max = Math.max(max, Number(m[1]));
    });
    return 'СЧ-' + year + '-' + String(max + 1).padStart(3, '0');
  }

  function invoiceLines(clientId, period) {
    const lines = [];
    state.works
      .filter((w) => w.clientId === clientId && inPeriod(w.date, period) && !isFixedWork(w))
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))
      .forEach((w) => {
        const cat = categoryById(w.category);
        const project = projectById(w.projectId);
        const desc = [cat ? cat.label : '', project ? project.name : '', w.note || ''].filter(Boolean).join(' · ') || 'Работа';
        lines.push({ date: w.date, desc, hours: round2(num(w.hours)), amount: workAmount(w) });
      });
    state.projects
      .filter((p) => p.clientId === clientId && p.type === 'fixed' && inPeriod(projectDate(p), period))
      .forEach((p) => {
        if (num(p.budget) > 0) {
          lines.push({ date: projectDate(p), desc: 'Проект: ' + p.name, hours: 0, amount: round2(num(p.budget)) });
        }
      });
    return lines;
  }

  function updateInvoicePreview() {
    const clientId = $('#invoiceClient').value;
    const period = $('#invoicePeriod').value;
    const lines = clientId ? invoiceLines(clientId, period) : [];
    const total = round2(lines.reduce((sum, l) => sum + num(l.amount), 0));
    if ($('#invoiceNumberPreview')) $('#invoiceNumberPreview').textContent = nextInvoiceNumber() + ' · ' + INVOICE_STATUS[$('#invoiceStatus').value];
    const box = $('#invoicePreview');
    if (!box) return;
    if (!clientId) {
      box.innerHTML = '<span class="muted">Выберите клиента — покажем позиции счёта.</span>';
      return;
    }
    if (!lines.length) {
      box.innerHTML = '<span class="muted">За выбранный период нет работ. Счёт будет пустым.</span>';
      return;
    }
    box.innerHTML = '<div class="invoice-preview-head"><span>Позиций: ' + lines.length + '</span><b>' + fmtMoney(total) + '</b></div>' +
      '<div class="invoice-preview-lines">' +
      lines.slice(0, 4).map((l) => '<div><span>' + esc(l.desc) + '</span><b>' + fmtMoney(l.amount) + '</b></div>').join('') +
      (lines.length > 4 ? '<div class="muted">и ещё ' + (lines.length - 4) + '…</div>' : '') +
      '</div>';
  }

  function openInvoice(clientId) {
    if (!ensureClient()) return;
    const form = $('#invoiceForm');
    form.reset();
    clearFormErrors(form);
    fillClientSelect($('#invoiceClient'), 'Выберите клиента', clientId || '');
    $('#invoicePeriod').value = 'month';
    $('#invoiceDate').value = todayISO();
    const due = new Date();
    due.setDate(due.getDate() + 7);
    $('#invoiceDue').value = toISO(due);
    $('#invoiceStatus').value = 'draft';
    $('#invoiceNote').value = '';
    $('#invoiceNumberPreview').textContent = nextInvoiceNumber();
    updateInvoicePreview();
    openModal('invoiceModal', true);
  }

  async function saveInvoice(event) {
    event.preventDefault();
    const clientId = $('#invoiceClient').value;
    if (!clientId) {
      setFieldError('invoiceClient', 'invoiceClientErr', 'Выберите клиента');
      return;
    }
    const period = $('#invoicePeriod').value;
    const lines = invoiceLines(clientId, period);
    if (!lines.length) {
      toast('За выбранный период нет работ для счёта', 'error');
      return;
    }
    const total = round2(lines.reduce((sum, l) => sum + num(l.amount), 0));
    const now = new Date().toISOString();
    const data = {
      id: uid(),
      number: nextInvoiceNumber(),
      clientId,
      date: $('#invoiceDate').value || todayISO(),
      dueDate: $('#invoiceDue').value,
      period,
      status: $('#invoiceStatus').value,
      total,
      note: $('#invoiceNote').value.trim(),
      items: lines,
      createdAt: now,
      updatedAt: now
    };
    try {
      await DB.put('invoices', data);
      state.invoices.push(data);
      closeModal($('#invoiceModal'));
      renderAll();
      toast('Счёт ' + data.number + ' создан', 'ok');
      setTimeout(() => printInvoice(data.id), 120);
    } catch (e) {
      console.error(e);
      toast('Не удалось создать счёт', 'error');
    }
  }

  function invoiceHtml(invoice) {
    const client = clientById(invoice.clientId);
    const myName = state.myName || 'Фрил-Бух';
    const rows = (invoice.items || []).map((l) => (
      '<tr><td>' + fmtDate(l.date) + '</td><td>' + esc(l.desc) + '</td><td class="num">' +
        (l.hours ? fmtHours(l.hours) : '—') + '</td><td class="num">' + fmtMoney(l.amount) + '</td></tr>'
    )).join('');
    return '<div class="invoice-print">' +
      '<div class="invoice-print-head"><div><h1>Счёт ' + esc(invoice.number) + '</h1>' +
        '<p>от ' + fmtDate(invoice.date) + (invoice.dueDate ? ' · оплатить до ' + fmtDate(invoice.dueDate) : '') + '</p></div>' +
        '<div class="invoice-print-me"><strong>' + esc(myName) + '</strong>' +
          (state.myDetails ? '<p>' + esc(state.myDetails).replace(/\n/g, '<br>') + '</p>' : '') + '</div></div>' +
      '<div class="invoice-print-parties"><div><span>Исполнитель</span><b>' + esc(myName) + '</b></div>' +
        '<div><span>Клиент</span><b>' + esc(client ? client.name : 'Клиент') + '</b>' +
          (client && client.email ? '<p>' + esc(client.email) + '</p>' : '') + '</div></div>' +
      '<table class="invoice-table"><thead><tr><th>Дата</th><th>Описание</th><th class="num">Часы</th><th class="num">Сумма</th></tr></thead>' +
        '<tbody>' + rows + '</tbody></table>' +
      '<div class="invoice-total"><span>Итого</span><b>' + fmtMoney(invoice.total) + '</b></div>' +
      (invoice.note ? '<p class="invoice-note">' + esc(invoice.note) + '</p>' : '') +
      '<p class="invoice-foot">Счёт сформирован в «Фрил-Бух» · ' + fmtDate(invoice.date) + '</p>' +
    '</div>';
  }

  function printInvoice(id) {
    const invoice = state.invoices.find((i) => i.id === id);
    if (!invoice) return;
    const area = $('#printArea');
    if (!area) return;
    area.innerHTML = invoiceHtml(invoice);
    setTimeout(() => {
      try { window.print(); } catch (e) { console.error(e); }
    }, 100);
  }

  function confirmDeleteInvoice(id) {
    const inv = state.invoices.find((i) => i.id === id);
    if (!inv) return;
    askConfirm({
      title: 'Удалить счёт?',
      text: 'Счёт <b>' + esc(inv.number) + '</b> на ' + fmtMoney(inv.total) + ' будет удалён. Работы и оплаты останутся.',
      okLabel: 'Удалить',
      onOk: async () => {
        const entry = { id: uid(), type: 'invoice', data: inv, removedAt: new Date().toISOString() };
        try {
          await DB.put('trash', entry);
          await DB.remove('invoices', id);
          state.invoices = state.invoices.filter((i) => i.id !== id);
          state.trash.push(entry);
          renderAll();
          toast('Счёт в корзине', '', { label: 'Вернуть', onClick: () => restoreTrash(entry.id) });
        } catch (e) {
          console.error(e);
          toast('Не удалось удалить счёт', 'error');
        }
      }
    });
  }

  /* ==================== Быстрое заполнение недели ==================== */
  function mondayOf(date) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - day);
    return d;
  }

  function openWeek() {
    if (!ensureClient()) return;
    const base = state.weekStart ? parseISO(state.weekStart) : mondayOf(new Date());
    state.weekStart = toISO(base);
    fillClientSelect($('#weekClient'), 'Выберите клиента', state.worksClient || '');
    if ($('#weekClientErr')) $('#weekClientErr').hidden = true;
    renderWeek();
    openModal('weekModal', true);
  }

  function shiftWeek(delta) {
    const base = state.weekStart ? parseISO(state.weekStart) : mondayOf(new Date());
    state.weekStart = toISO(addDays(base, delta * 7));
    renderWeek();
  }

  function renderWeek() {
    const box = $('#weekDays');
    if (!box) return;
    const start = state.weekStart ? parseISO(state.weekStart) : mondayOf(new Date());
    const end = addDays(start, 6);
    const label = start.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) + ' — ' +
      end.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    if ($('#weekLabel')) $('#weekLabel').textContent = label;
    const clientId = $('#weekClient') ? $('#weekClient').value : '';
    const names = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    box.innerHTML = names.map((name, i) => {
      const date = addDays(start, i);
      const iso = toISO(date);
      const existing = clientId
        ? round2(state.works.filter((w) => w.clientId === clientId && w.date === iso).reduce((sum, w) => sum + num(w.hours), 0))
        : 0;
      return '<label class=\"week-day\">' +
        '<span class=\"week-day-name\">' + name + '<small>' + date.getDate() + '.' + pad(date.getMonth() + 1) + '</small></span>' +
        '<input class=\"input week-input\" type=\"number\" min=\"0\" max=\"24\" step=\"0.25\" inputmode=\"decimal\" placeholder=\"0\" data-week-day=\"' + i + '\" data-date=\"' + iso + '\" />' +
        (existing ? '<em class=\"week-existing\">уже ' + fmtHours(existing) + '</em>' : '') +
      '</label>';
    }).join('');
    updateWeekPreview();
  }

  function updateWeekPreview() {
    const client = clientById($('#weekClient') ? $('#weekClient').value : '');
    const rate = client ? num(client.rate) : 0;
    let hours = 0;
    $$('[data-week-day]').forEach((input) => { hours += num(input.value); });
    hours = round2(hours);
    if ($('#weekPreview')) {
      $('#weekPreview').textContent = fmtHours(hours) + ' · ' + fmtMoney(hours * rate) +
        (rate > 0 ? ' · ' + fmtMoney(rate) + '/ч' : '');
    }
  }

  async function saveWeek(event) {
    event.preventDefault();
    const clientId = $('#weekClient').value;
    if (!clientId) {
      setFieldError('weekClient', 'weekClientErr', 'Выберите клиента');
      return;
    }
    const client = clientById(clientId);
    if (!client) return;
    const now = new Date().toISOString();
    const rows = [];
    $$('[data-week-day]').forEach((input) => {
      const hours = round2(num(input.value));
      if (!(hours > 0)) return;
      rows.push({
        id: uid(),
        clientId,
        date: input.dataset.date,
        hours: Math.min(24, hours),
        rate: round2(num(client.rate)),
        start: '',
        end: '',
        projectId: '',
        billable: true,
        category: '',
        note: 'Заполнение недели',
        createdAt: now,
        updatedAt: now
      });
    });
    if (!rows.length) {
      toast('Введите часы хотя бы за один день', 'error');
      return;
    }
    try {
      await Promise.all(rows.map((row) => DB.put('works', row)));
      rows.forEach((row) => state.works.push(row));
      closeModal($('#weekModal'));
      renderAll();
      toast('Добавлено ' + rows.length + ' ' + plural(rows.length, ['запись', 'записи', 'записей']), 'ok');
    } catch (e) {
      console.error(e);
      toast('Не удалось добавить часы', 'error');
    }
  }

  /* ==================== Таймер ==================== */
  let timerTicker = null;

  function elapsedSeconds() {
    if (!state.timer || !state.timer.startedAt) return 0;
    const started = new Date(state.timer.startedAt).getTime();
    if (!Number.isFinite(started)) return 0;
    return Math.max(0, Math.floor((Date.now() - started) / 1000));
  }

  function fmtElapsed(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return pad(h) + ':' + pad(m) + ':' + pad(s);
  }

  function startTimerTicker() {
    clearInterval(timerTicker);
    timerTicker = null;
    if (!state.timer) return;
    timerTicker = setInterval(updateTimerUI, 1000);
  }

  function updateTimerUI() {
    const chip = $('#timerChip');
    const btn = $('#timerBtn');
    if (chip) {
      chip.hidden = !state.timer;
      if (state.timer) chip.textContent = fmtElapsed(elapsedSeconds());
    }
    if (btn) {
      btn.classList.toggle('is-running', !!state.timer);
      btn.title = state.timer ? 'Таймер идёт — откройте, чтобы остановить' : 'Таймер';
      btn.setAttribute('aria-label', state.timer ? 'Остановить таймер' : 'Таймер');
    }
    const idle = $('#timerIdle');
    const running = $('#timerRunning');
    if (idle) idle.hidden = !!state.timer;
    if (running) running.hidden = !state.timer;
    if (state.timer) {
      if ($('#timerDisplay')) $('#timerDisplay').textContent = fmtElapsed(elapsedSeconds());
      if ($('#timerRunningClient')) $('#timerRunningClient').textContent = clientName(state.timer.clientId);
      if ($('#timerRunningNote')) $('#timerRunningNote').textContent = state.timer.note || '';
    }
  }

  function openTimer() {
    if (!state.timer && !ensureClient()) return;
    fillClientSelect($('#timerClient'), 'Выберите клиента', state.timer ? state.timer.clientId : '');
    if ($('#timerClientErr')) $('#timerClientErr').hidden = true;
    updateTimerUI();
    openModal('timerModal', !state.timer);
  }

  async function startTimer(event) {
    event.preventDefault();
    const clientId = $('#timerClient').value;
    if (!clientId) {
      setFieldError('timerClient', 'timerClientErr', 'Выберите клиента');
      return;
    }
    state.timer = {
      clientId,
      note: $('#timerNote').value.trim(),
      startedAt: new Date().toISOString()
    };
    try {
      await DB.setMeta('timer', state.timer);
      closeModal($('#timerModal'));
      updateTimerUI();
      startTimerTicker();
      toast('Таймер запущен', 'ok');
    } catch (e) {
      console.error(e);
      toast('Не удалось запустить таймер', 'error');
    }
  }

  async function cancelTimer() {
    state.timer = null;
    clearInterval(timerTicker);
    timerTicker = null;
    try { await DB.remove('meta', 'timer'); } catch (e) { console.error(e); }
    updateTimerUI();
    closeModal($('#timerModal'));
    toast('Таймер отменён');
  }

  async function stopTimer() {
    const timer = state.timer;
    if (!timer) return;
    const started = new Date(timer.startedAt);
    const now = new Date();
    const minutes = Math.max(15, Math.round((now.getTime() - started.getTime()) / 60000 / 15) * 15);
    const hours = round2(minutes / 60);
    state.timer = null;
    clearInterval(timerTicker);
    timerTicker = null;
    try { await DB.remove('meta', 'timer'); } catch (e) { console.error(e); }
    closeModal($('#timerModal'));
    updateTimerUI();
    openWork(null, timer.clientId);
    $('#workDate').value = toISO(started);
    $('#workStart').value = pad(started.getHours()) + ':' + pad(started.getMinutes());
    $('#workEnd').value = pad(now.getHours()) + ':' + pad(now.getMinutes());
    $('#workHours').value = String(hours);
    $('#workNote').value = timer.note || '';
    markHourChips();
    updateWorkPreview();
    toast('Проверьте часы и сохраните');
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
        for (const p of item.projects || []) {
          await DB.put('projects', p);
          upsertLocal('projects', p);
        }
        for (const i of item.invoices || []) {
          await DB.put('invoices', i);
          upsertLocal('invoices', i);
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
      } else if (item.type === 'project') {
        if (!clientById(item.data.clientId)) {
          toast('Сначала восстановите клиента', 'error');
          return;
        }
        await DB.put('projects', item.data);
        upsertLocal('projects', item.data);
      } else if (item.type === 'expense') {
        await DB.put('expenses', item.data);
        upsertLocal('expenses', item.data);
      } else if (item.type === 'invoice') {
        if (!clientById(item.data.clientId)) {
          toast('Сначала восстановите клиента', 'error');
          return;
        }
        await DB.put('invoices', item.data);
        upsertLocal('invoices', item.data);
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

  async function changeTaxRate(value) {
    const rate = Math.min(50, Math.max(0, num(value)));
    state.taxRate = round2(rate);
    try {
      await DB.setMeta('taxRate', state.taxRate);
      renderAll();
      toast(state.taxRate > 0 ? 'Налог: ' + state.taxRate + '%' : 'Налог отключён');
    } catch (e) {
      console.error(e);
    }
  }

  async function saveProfile(key, value) {
    state[key] = str(value);
    try { await DB.setMeta(key, state[key]); } catch (e) { console.error(e); }
  }

  function backupData() {
    const data = {
      app: 'fril-buh',
      version: 2,
      exportedAt: new Date().toISOString(),
      clients: state.clients,
      projects: state.projects,
      works: state.works,
      payments: state.payments,
      expenses: state.expenses,
      invoices: state.invoices,
      trash: state.trash,
      settings: {
        currency: state.currency,
        theme: state.themeMode,
        taxRate: state.taxRate,
        myName: state.myName,
        myDetails: state.myDetails
      }
    };
    downloadFile('fril-buh-backup-' + todayISO() + '.json', JSON.stringify(data, null, 2), 'application/json');
    state.lastBackupAt = new Date().toISOString();
    DB.setMeta('lastBackupAt', state.lastBackupAt).catch(console.error);
    renderBackupBanner();
    updateSettingsUI();
    toast('Бэкап скачан', 'ok');
  }

  function confirmClearAll() {
    askConfirm({
      title: 'Очистить все данные?',
      text: 'Удалятся клиенты, проекты, работы, оплаты, расходы, счета и корзина. Настройки и PIN сохранятся. Это действие нельзя отменить — сначала лучше скачать бэкап.',
      okLabel: 'Удалить всё',
      onOk: async () => {
        const meta = {
          currency: state.currency,
          theme: state.themeMode,
          taxRate: state.taxRate,
          myName: state.myName,
          myDetails: state.myDetails
        };
        if (state.pin) meta.pin = state.pin;
        await DB.replaceAll({
          clients: [], projects: [], works: [], payments: [], expenses: [], invoices: [], trash: [], meta
        });
        state.clients = [];
        state.projects = [];
        state.works = [];
        state.payments = [];
        state.expenses = [];
        state.invoices = [];
        state.trash = [];
        state.timer = null;
        state.detailId = null;
        closeAllModals();
        updateTimerUI();
        renderAll();
        toast('Все данные удалены');
      }
    });
  }

  function validISODate(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(str(value)) ? str(value) : todayISO();
  }

  function normalizeBackup(raw) {
    if (!raw || typeof raw !== 'object') throw new Error('bad backup');
    const arr = (value) => Array.isArray(value) ? value : [];
    const now = new Date().toISOString();
    const clientIds = new Set();
    const clients = [];
    arr(raw.clients).forEach((c) => {
      if (!c || typeof c !== 'object') return;
      let id = str(c.id) || uid();
      if (clientIds.has(id)) return;
      clientIds.add(id);
      clients.push({
        id,
        name: str(c.name).trim() || 'Без имени',
        rate: round2(num(c.rate)),
        phone: str(c.phone),
        email: str(c.email),
        note: str(c.note),
        createdAt: c.createdAt || now,
        updatedAt: c.updatedAt || now
      });
    });

    const projectIds = new Set();
    const projects = [];
    arr(raw.projects).forEach((p) => {
      if (!p || typeof p !== 'object' || !clientIds.has(str(p.clientId))) return;
      let id = str(p.id) || uid();
      if (projectIds.has(id)) return;
      projectIds.add(id);
      projects.push({
        id,
        clientId: str(p.clientId),
        name: str(p.name).trim() || 'Проект',
        type: p.type === 'fixed' ? 'fixed' : 'hourly',
        budget: round2(num(p.budget)),
        startDate: str(p.startDate),
        dueDate: str(p.dueDate),
        status: p.status === 'done' ? 'done' : 'active',
        note: str(p.note),
        createdAt: p.createdAt || now,
        updatedAt: p.updatedAt || now
      });
    });

    const works = arr(raw.works)
      .filter((w) => w && typeof w === 'object' && clientIds.has(str(w.clientId)) && num(w.hours) > 0)
      .map((w) => ({
        id: str(w.id) || uid(),
        clientId: str(w.clientId),
        date: validISODate(w.date),
        hours: round2(num(w.hours)),
        rate: round2(num(w.rate)),
        start: str(w.start),
        end: str(w.end),
        projectId: projectIds.has(str(w.projectId)) ? str(w.projectId) : '',
        billable: w.billable !== false,
        category: categoryById(str(w.category)) ? str(w.category) : '',
        note: str(w.note),
        createdAt: w.createdAt || now,
        updatedAt: w.updatedAt || now
      }));

    const payments = arr(raw.payments)
      .filter((p) => p && typeof p === 'object' && clientIds.has(str(p.clientId)) && num(p.amount) > 0)
      .map((p) => ({
        id: str(p.id) || uid(),
        clientId: str(p.clientId),
        amount: round2(num(p.amount)),
        date: validISODate(p.date),
        method: METHODS[str(p.method)] ? str(p.method) : 'other',
        projectId: projectIds.has(str(p.projectId)) ? str(p.projectId) : '',
        note: str(p.note),
        createdAt: p.createdAt || now,
        updatedAt: p.updatedAt || now
      }));

    const expenses = arr(raw.expenses)
      .filter((e) => e && typeof e === 'object' && num(e.amount) > 0)
      .map((e) => ({
        id: str(e.id) || uid(),
        date: validISODate(e.date),
        amount: round2(num(e.amount)),
        category: EXPENSE_CATEGORIES.some((c) => c.id === str(e.category)) ? str(e.category) : 'other',
        note: str(e.note),
        createdAt: e.createdAt || now,
        updatedAt: e.updatedAt || now
      }));

    const invoices = arr(raw.invoices)
      .filter((i) => i && typeof i === 'object' && clientIds.has(str(i.clientId)))
      .map((i) => {
        const items = arr(i.items)
          .filter((line) => line && typeof line === 'object')
          .map((line) => ({
            date: validISODate(line.date),
            desc: str(line.desc) || 'Работа',
            hours: round2(num(line.hours)),
            amount: round2(num(line.amount))
          }));
        const total = round2(items.reduce((sum, line) => sum + num(line.amount), 0) || num(i.total));
        return {
          id: str(i.id) || uid(),
          number: str(i.number) || 'СЧ',
          clientId: str(i.clientId),
          date: validISODate(i.date),
          dueDate: str(i.dueDate),
          period: ['month', 'prev', 'all'].includes(str(i.period)) ? str(i.period) : 'all',
          status: INVOICE_STATUS[str(i.status)] ? str(i.status) : 'draft',
          total,
          note: str(i.note),
          items,
          createdAt: i.createdAt || now,
          updatedAt: i.updatedAt || now
        };
      });

    const trash = arr(raw.trash)
      .filter((t) => t && typeof t === 'object' && t.data)
      .map((t) => ({
        id: str(t.id) || uid(),
        type: str(t.type) || 'work',
        data: t.data,
        works: Array.isArray(t.works) ? t.works : undefined,
        payments: Array.isArray(t.payments) ? t.payments : undefined,
        removedAt: t.removedAt || now
      }));

    const settings = raw.settings && typeof raw.settings === 'object' ? raw.settings : {};
    const currency = CURRENCIES.includes(str(settings.currency)) ? str(settings.currency) : state.currency;
    const theme = ['auto', 'light', 'dark'].includes(str(settings.theme)) ? str(settings.theme) : state.themeMode;
    const taxRate = Math.min(50, Math.max(0, num(settings.taxRate)));

    return {
      clients, projects, works, payments, expenses, invoices, trash,
      settings: {
        currency,
        theme,
        taxRate,
        myName: str(settings.myName),
        myDetails: str(settings.myDetails)
      }
    };
  }

  async function replaceAllData(data) {
    const s = data.settings || {};
    const meta = {
      currency: s.currency,
      theme: s.theme,
      taxRate: s.taxRate,
      myName: s.myName,
      myDetails: s.myDetails
    };
    if (state.pin) meta.pin = state.pin;
    if (state.lastBackupAt) meta.lastBackupAt = state.lastBackupAt;
    if (state.backupSnoozeUntil) meta.backupSnoozeUntil = state.backupSnoozeUntil;

    await DB.replaceAll({
      clients: data.clients,
      projects: data.projects,
      works: data.works,
      payments: data.payments,
      expenses: data.expenses,
      invoices: data.invoices,
      trash: data.trash,
      meta
    });

    state.clients = data.clients;
    state.projects = data.projects;
    state.works = data.works;
    state.payments = data.payments;
    state.expenses = data.expenses;
    state.invoices = data.invoices;
    state.trash = data.trash;
    state.currency = s.currency;
    state.themeMode = s.theme;
    state.taxRate = s.taxRate;
    state.myName = s.myName;
    state.myDetails = s.myDetails;
    state.timer = null;
    try { await DB.remove('meta', 'timer'); } catch (e) { /* уже нет */ }
    applyTheme();
    updateSettingsUI();
    updateTimerUI();
  }

  async function mergeImportData(data) {
    const added = { clients: 0, projects: 0, works: 0, payments: 0, expenses: 0, invoices: 0, trash: 0 };
    const pending = [];
    const clientIdMap = new Map();
    const projectIdMap = new Map();
    const clientKey = (c) => str(c.name).trim().toLowerCase() + '|' + round2(num(c.rate));
    const existingClients = new Map(state.clients.map((c) => [clientKey(c), c]));

    data.clients.forEach((c) => {
      let target = state.clients.find((x) => x.id === c.id);
      if (!target) target = existingClients.get(clientKey(c));
      if (target) {
        clientIdMap.set(c.id, target.id);
        return;
      }
      const row = Object.assign({}, c, { id: state.clients.some((x) => x.id === c.id) ? uid() : c.id });
      state.clients.push(row);
      existingClients.set(clientKey(row), row);
      clientIdMap.set(c.id, row.id);
      pending.push(['clients', row]);
      added.clients += 1;
    });

    data.projects.forEach((p) => {
      const clientId = clientIdMap.get(p.clientId) || p.clientId;
      if (!clientById(clientId)) return;
      const target = state.projects.find((x) => x.id === p.id) ||
        state.projects.find((x) => x.clientId === clientId && x.name === p.name && x.type === p.type);
      if (target) {
        projectIdMap.set(p.id, target.id);
        return;
      }
      const row = Object.assign({}, p, {
        id: state.projects.some((x) => x.id === p.id) ? uid() : p.id,
        clientId
      });
      state.projects.push(row);
      projectIdMap.set(p.id, row.id);
      pending.push(['projects', row]);
      added.projects += 1;
    });

    data.works.forEach((w) => {
      const clientId = clientIdMap.get(w.clientId) || w.clientId;
      if (!clientById(clientId)) return;
      const signature = [clientId, w.date, round2(num(w.hours)), str(w.note), w.category || ''].join('|');
      const exists = state.works.some((x) => [x.clientId, x.date, round2(num(x.hours)), str(x.note), x.category || ''].join('|') === signature);
      if (exists) return;
      const row = Object.assign({}, w, {
        id: state.works.some((x) => x.id === w.id) ? uid() : w.id,
        clientId,
        projectId: w.projectId ? (projectIdMap.get(w.projectId) || '') : ''
      });
      state.works.push(row);
      pending.push(['works', row]);
      added.works += 1;
    });

    data.payments.forEach((p) => {
      const clientId = clientIdMap.get(p.clientId) || p.clientId;
      if (!clientById(clientId)) return;
      const signature = [clientId, p.date, round2(num(p.amount)), p.method, str(p.note)].join('|');
      const exists = state.payments.some((x) => [x.clientId, x.date, round2(num(x.amount)), x.method, str(x.note)].join('|') === signature);
      if (exists) return;
      const row = Object.assign({}, p, {
        id: state.payments.some((x) => x.id === p.id) ? uid() : p.id,
        clientId,
        projectId: p.projectId ? (projectIdMap.get(p.projectId) || '') : ''
      });
      state.payments.push(row);
      pending.push(['payments', row]);
      added.payments += 1;
    });

    data.expenses.forEach((e) => {
      const signature = [e.date, round2(num(e.amount)), e.category, str(e.note)].join('|');
      const exists = state.expenses.some((x) => [x.date, round2(num(x.amount)), x.category, str(x.note)].join('|') === signature);
      if (exists) return;
      const row = Object.assign({}, e, { id: state.expenses.some((x) => x.id === e.id) ? uid() : e.id });
      state.expenses.push(row);
      pending.push(['expenses', row]);
      added.expenses += 1;
    });

    data.invoices.forEach((inv) => {
      const clientId = clientIdMap.get(inv.clientId) || inv.clientId;
      if (!clientById(clientId)) return;
      const exists = state.invoices.some((x) => x.id === inv.id || x.number === inv.number);
      if (exists) return;
      const row = Object.assign({}, inv, {
        id: state.invoices.some((x) => x.id === inv.id) ? uid() : inv.id,
        clientId
      });
      state.invoices.push(row);
      pending.push(['invoices', row]);
      added.invoices += 1;
    });

    data.trash.forEach((t) => {
      if (state.trash.some((x) => x.id === t.id)) return;
      state.trash.push(t);
      pending.push(['trash', t]);
      added.trash += 1;
    });

    await Promise.all(pending.map(([store, row]) => DB.put(store, row)));
    return added;
  }

  async function handleImportFile(event) {
    const input = event.currentTarget;
    const file = input.files && input.files[0];
    input.value = '';
    if (!file) return;

    let raw;
    try {
      raw = JSON.parse(await file.text());
    } catch (e) {
      toast('Не удалось прочитать файл', 'error');
      return;
    }

    let data;
    try {
      data = normalizeBackup(raw);
    } catch (e) {
      toast('Это не похоже на бэкап Фрил-Буха', 'error');
      return;
    }
    if (!data.clients.length && !data.works.length && !data.payments.length && !data.expenses.length && !data.invoices.length) {
      toast('В файле нет данных для импорта', 'error');
      return;
    }
    state.pendingImport = { fileName: file.name, data };
    renderImportPreview();
    openModal('importModal', false);
  }

  function renderImportPreview() {
    const box = $('#importInfo');
    if (!box || !state.pendingImport) return;
    const d = state.pendingImport.data;
    const row = (label, n) => '<div class="import-count"><span>' + label + '</span><b>' + n + '</b></div>';
    box.innerHTML = '<p class="muted import-file">' + esc(state.pendingImport.fileName) + '</p>' +
      '<div class="import-counts">' +
        row('Клиенты', d.clients.length) +
        row('Проекты', d.projects.length) +
        row('Работы', d.works.length) +
        row('Оплаты', d.payments.length) +
        row('Расходы', d.expenses.length) +
        row('Счета', d.invoices.length) +
      '</div>' +
      '<p class="hint">Сейчас в приложении: ' + state.clients.length + ' клиентов, ' + state.works.length + ' работ, ' +
        state.payments.length + ' оплат, ' + state.expenses.length + ' расходов.</p>';
  }

  async function applyImport() {
    if (!state.pendingImport) return;
    const mode = ($('input[name="importMode"]:checked') || {}).value || 'merge';
    const btn = $('#importApply');
    if (btn) btn.disabled = true;
    try {
      if (mode === 'replace') {
        await replaceAllData(state.pendingImport.data);
        toast('Данные заменены из бэкапа', 'ok');
      } else {
        const added = await mergeImportData(state.pendingImport.data);
        toast('Добавлено: ' + added.clients + ' клиентов, ' + added.works + ' работ, ' + added.payments + ' оплат', 'ok');
      }
      state.pendingImport = null;
      closeModal($('#importModal'));
      renderAll();
    } catch (e) {
      console.error(e);
      toast('Не удалось импортировать бэкап', 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
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
    const rows = [['Клиент', 'Дата', 'Часы', 'Ставка', 'Сумма', 'Категория', 'Проект', 'Начало', 'Конец', 'Описание']];
    state.works.slice().sort((a, b) => String(a.date).localeCompare(String(b.date))).forEach((w) => {
      const cat = categoryById(w.category);
      const project = projectById(w.projectId);
      rows.push([
        clientName(w.clientId), w.date, csvNum(w.hours), csvNum(workRate(w)), csvNum(workBilledAmount(w)),
        cat ? cat.label : '', project ? project.name : '', w.start || '', w.end || '', w.note || ''
      ]);
    });
    downloadCSV('fril-buh-raboty-' + todayISO() + '.csv', rows);
    toast('CSV с работами скачан', 'ok');
  }

  function exportPaymentsCSV() {
    const rows = [['Клиент', 'Дата', 'Сумма', 'Способ', 'Проект', 'Комментарий']];
    state.payments.slice().sort((a, b) => String(a.date).localeCompare(String(b.date))).forEach((p) => {
      const project = projectById(p.projectId);
      rows.push([clientName(p.clientId), p.date, csvNum(p.amount), METHODS[p.method] || 'Другое', project ? project.name : '', p.note || '']);
    });
    downloadCSV('fril-buh-oplaty-' + todayISO() + '.csv', rows);
    toast('CSV с оплатами скачан', 'ok');
  }

  function exportExpensesCSV() {
    const rows = [['Дата', 'Сумма', 'Категория', 'Комментарий']];
    state.expenses.slice().sort((a, b) => String(a.date).localeCompare(String(b.date))).forEach((e) => {
      const cat = expenseCategory(e.category);
      rows.push([e.date, csvNum(e.amount), cat ? cat.label : 'Другое', e.note || '']);
    });
    downloadCSV('fril-buh-rashody-' + todayISO() + '.csv', rows);
    toast('CSV с расходами скачан', 'ok');
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
    if (state.pendingShortcut) {
      const shortcut = state.pendingShortcut;
      state.pendingShortcut = '';
      setTimeout(() => runShortcut(shortcut), 120);
    }
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
    if (!['overview', 'clients', 'works', 'money', 'reports'].includes(name)) name = 'overview';
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
  function runShortcut(name) {
    if (!name) return;
    if (name === 'new-work') openWork();
    else if (name === 'new-payment') openPayment();
    else if (name === 'new-client') openClient();
    else if (name === 'new-expense') openExpense();
    else if (name === 'timer') openTimer();
    else if (name === 'week') { setView('works'); openWeek(); }
    else if (name === 'reports') setView('reports');
  }

  function handleAction(action, id) {
    switch (action) {
      case 'new-work': openWork(); break;
      case 'new-payment': openPayment(); break;
      case 'new-client': openClient(); break;
      case 'new-expense': openExpense(); break;
      case 'edit-expense': openExpense(id); break;
      case 'delete-expense': confirmDeleteExpense(id); break;
      case 'new-project': openProject(null, id); break;
      case 'edit-project': openProject(id); break;
      case 'delete-project': confirmDeleteProject(id); break;
      case 'new-invoice': openInvoice(id); break;
      case 'print-invoice': printInvoice(id); break;
      case 'delete-invoice': confirmDeleteInvoice(id); break;
      case 'week-fill': openWeek(); break;
      case 'timer-cancel': cancelTimer(); break;
      case 'timer-stop': stopTimer(); break;
      case 'duplicate-work': duplicateWork(id); break;
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
      case 'snooze-backup': snoozeBackup(); break;
      case 'import': $('#importFile').click(); break;
      case 'csv-works': exportWorksCSV(); break;
      case 'csv-payments': exportPaymentsCSV(); break;
      case 'csv-expenses': exportExpensesCSV(); break;
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

      const weekBtn = event.target.closest('[data-week]');
      if (weekBtn) {
        shiftWeek(Number(weekBtn.dataset.week) || 0);
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
        return;
      }

      const open = $$('.modal.is-open');
      if (open.length) {
        if (event.key === 'Tab') {
          const modal = open[open.length - 1];
          const focusable = $$('a[href], button:not([disabled]), input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])', modal)
            .filter((el) => el.offsetParent !== null);
          if (!focusable.length) return;
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }
        return;
      }
      if (state.locked) return;
      const tag = (document.activeElement && document.activeElement.tagName || '').toLowerCase();
      if (['input', 'select', 'textarea'].includes(tag) || (document.activeElement && document.activeElement.isContentEditable)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === 'n') { event.preventDefault(); openWork(); }
      else if (key === 'p') { event.preventDefault(); openPayment(); }
      else if (key === 'c') { event.preventDefault(); openClient(); }
      else if (key === 't') { event.preventDefault(); openTimer(); }
      else if (key === '/') {
        event.preventDefault();
        const map = { clients: '#clientSearch', works: '#worksSearch', money: '#moneySearch' };
        if (map[state.view]) {
          const input = $(map[state.view]);
          if (input) input.focus();
        } else {
          setView('clients');
          setTimeout(() => { const input = $('#clientSearch'); if (input) input.focus(); }, 40);
        }
      }
    });

    ['click', 'keydown', 'touchstart'].forEach((name) => {
      document.addEventListener(name, () => resetIdle(), { passive: true });
    });

    $('#themeBtn').addEventListener('click', toggleTheme);
    $('#settingsBtn').addEventListener('click', openSettings);
    $('#timerBtn').addEventListener('click', openTimer);
    $('#persistBtn').addEventListener('click', requestPersist);
    $('#importApply').addEventListener('click', applyImport);
    $('#timerForm').addEventListener('submit', startTimer);
    $('#weekForm').addEventListener('submit', saveWeek);
    $('#projectForm').addEventListener('submit', saveProject);
    $('#expenseForm').addEventListener('submit', saveExpense);
    $('#invoiceForm').addEventListener('submit', saveInvoice);
    $('#projectType').addEventListener('change', updateProjectTypeUI);

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
    $('#moneyKind').addEventListener('click', (event) => {
      const btn = event.target.closest('[data-kind]');
      if (!btn) return;
      state.moneyKind = btn.dataset.kind === 'expenses' ? 'expenses' : 'payments';
      renderMoney();
    });
    $('#reportsPeriod').addEventListener('click', (event) => {
      const btn = event.target.closest('[data-period]');
      if (!btn) return;
      state.reportPeriod = btn.dataset.period;
      renderReports();
    });
    $('#weekClient').addEventListener('change', renderWeek);
    $('#weekDays').addEventListener('input', updateWeekPreview);
    $('#invoiceClient').addEventListener('change', updateInvoicePreview);
    $('#invoicePeriod').addEventListener('change', updateInvoicePreview);
    $('#invoiceStatus').addEventListener('change', updateInvoicePreview);
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
    $('#workClient').addEventListener('change', (event) => {
      fillProjectSelect($('#workProject'), event.target.value, '', 'Без проекта');
      updateWorkPreview();
    });
    $('#workProject').addEventListener('change', updateWorkPreview);
    $('#paymentClient').addEventListener('change', (event) => {
      fillProjectSelect($('#paymentProject'), event.target.value, '', 'Без проекта');
    });
    $('#workHours').addEventListener('input', () => {
      markHourChips();
      updateWorkPreview();
    });
    $('#workStart').addEventListener('change', syncHoursFromTimes);
    $('#workEnd').addEventListener('change', syncHoursFromTimes);

    $('#settingCurrency').addEventListener('change', (event) => changeCurrency(event.target.value));
    $('#settingTheme').addEventListener('change', (event) => setThemeMode(event.target.value));
    $('#settingTaxRate').addEventListener('change', (event) => changeTaxRate(event.target.value));
    $('#settingMyName').addEventListener('change', (event) => saveProfile('myName', event.target.value));
    $('#settingMyDetails').addEventListener('change', (event) => saveProfile('myDetails', event.target.value));
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
      if (!reg) return;
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
        DB.getAll('projects'),
        DB.getAll('works'),
        DB.getAll('payments'),
        DB.getAll('expenses'),
        DB.getAll('invoices'),
        DB.getAll('trash'),
        DB.getAll('meta')
      ]);
      const meta = {};
      rows[7].forEach((row) => { meta[row.key] = row.value; });
      state.clients = rows[0];
      state.projects = rows[1];
      state.works = rows[2];
      state.payments = rows[3];
      state.expenses = rows[4];
      state.invoices = rows[5];
      state.trash = rows[6];
      state.currency = CURRENCIES.includes(meta.currency) ? meta.currency : 'RUB';
      state.themeMode = ['auto', 'light', 'dark'].includes(meta.theme)
        ? meta.theme
        : (localStorage.getItem('frilbuh.theme') || 'auto');
      state.pin = meta.pin && meta.pin.hash ? meta.pin : null;
      state.taxRate = Math.min(50, Math.max(0, num(meta.taxRate)));
      state.myName = str(meta.myName);
      state.myDetails = str(meta.myDetails);
      state.lastBackupAt = str(meta.lastBackupAt);
      state.backupSnoozeUntil = str(meta.backupSnoozeUntil);
      state.timer = meta.timer && meta.timer.clientId && meta.timer.startedAt ? meta.timer : null;
    } catch (e) {
      console.error('[Фрил-Бух] Ошибка загрузки:', e);
      toast('Не удалось загрузить данные. Проверьте настройки браузера.', 'error');
    }

    applyTheme();
    bindEvents();
    fillCategorySelect();
    fillExpenseCategories();
    await refreshPersistStatus();
    if (!state.storagePersisted && canPersist()) {
      try { state.storagePersisted = await navigator.storage.persist(); } catch (e) { /* без статуса */ }
    }
    renderAll();
    startTimerTicker();

    const startView = location.hash.slice(1);
    setView(['overview', 'clients', 'works', 'money', 'reports'].includes(startView) ? startView : 'overview', true);

    updateOnline();
    state.pendingShortcut = (new URLSearchParams(location.search).get('action') || '').trim();
    if (state.pin) {
      try { localStorage.setItem(PIN_FLAG, '1'); } catch (e) { /* без localStorage */ }
      lockApp();
    } else {
      try { localStorage.removeItem(PIN_FLAG); } catch (e) { /* без localStorage */ }
      clearLockPending();
      if (state.pendingShortcut) {
        const shortcut = state.pendingShortcut;
        state.pendingShortcut = '';
        setTimeout(() => runShortcut(shortcut), 120);
      }
    }

    registerSW();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
