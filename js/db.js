/* Фрил-Бух — хранилище: IndexedDB с запасным вариантом в localStorage. */
window.DB = (() => {
  const NAME = 'frilbuh-db';
  const VERSION = 1;
  const LS_KEY = 'frilbuh.data.v1';
  const STORES = ['clients', 'works', 'payments', 'trash', 'meta'];

  let db = null;
  let mode = 'idb';

  function emptyData() {
    return { clients: [], works: [], payments: [], trash: [], meta: {} };
  }

  function openIDB() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) return reject(new Error('IndexedDB недоступен'));
      const req = indexedDB.open(NAME, VERSION);
      req.onupgradeneeded = () => {
        const d = req.result;
        if (!d.objectStoreNames.contains('clients')) d.createObjectStore('clients', { keyPath: 'id' });
        if (!d.objectStoreNames.contains('works')) d.createObjectStore('works', { keyPath: 'id' });
        if (!d.objectStoreNames.contains('payments')) d.createObjectStore('payments', { keyPath: 'id' });
        if (!d.objectStoreNames.contains('trash')) d.createObjectStore('trash', { keyPath: 'id' });
        if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta', { keyPath: 'key' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('Не удалось открыть базу'));
      req.onblocked = () => reject(new Error('База занята другой вкладкой'));
    });
  }

  function tx(store, kind, fn) {
    return new Promise((resolve, reject) => {
      let t;
      try { t = db.transaction(store, kind); }
      catch (e) { return reject(e); }
      let result;
      try {
        /* Для одной операции передаём objectStore, для набора — саму транзакцию. */
        const target = Array.isArray(store) ? t : t.objectStore(store);
        const req = fn(target);
        if (req) req.onsuccess = () => { result = req.result; };
      } catch (e) { return reject(e); }
      t.oncomplete = () => resolve(result);
      t.onerror = () => reject(t.error || new Error('Ошибка транзакции'));
      t.onabort = () => reject(t.error || new Error('Транзакция прервана'));
    });
  }

  function lsRead() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      const data = raw ? JSON.parse(raw) : null;
      if (!data || typeof data !== 'object') return emptyData();
      STORES.forEach((s) => {
        if (s === 'meta') {
          if (!data.meta || typeof data.meta !== 'object' || Array.isArray(data.meta)) data.meta = {};
        } else if (!Array.isArray(data[s])) {
          data[s] = [];
        }
      });
      return data;
    } catch (e) {
      return emptyData();
    }
  }

  function lsWrite(data) {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(data));
    } catch (e) {
      const err = new Error('Не хватает места для сохранения. Скачайте бэкап и очистите данные.');
      err.code = 'STORAGE_FULL';
      throw err;
    }
  }

  async function init() {
    try {
      db = await openIDB();
      mode = 'idb';
    } catch (e) {
      console.warn('[Фрил-Бух] IndexedDB недоступен, использую localStorage:', e);
      mode = 'ls';
    }
    return mode;
  }

  async function getAll(store) {
    if (!STORES.includes(store)) throw new Error('Неизвестное хранилище: ' + store);
    if (mode === 'idb') {
      const rows = await tx(store, 'readonly', (s) => s.getAll());
      return Array.isArray(rows) ? rows : [];
    }
    const data = lsRead();
    if (store === 'meta') {
      return Object.keys(data.meta).map((key) => ({ key, value: data.meta[key] }));
    }
    return data[store];
  }

  async function put(store, obj) {
    if (!STORES.includes(store)) throw new Error('Неизвестное хранилище: ' + store);
    if (mode === 'idb') {
      await tx(store, 'readwrite', (s) => s.put(obj));
      return obj;
    }
    const data = lsRead();
    if (store === 'meta') {
      data.meta[obj.key] = obj.value;
    } else {
      const i = data[store].findIndex((row) => row.id === obj.id);
      if (i >= 0) data[store][i] = obj; else data[store].push(obj);
    }
    lsWrite(data);
    return obj;
  }

  async function putMany(store, list) {
    if (!Array.isArray(list) || !list.length) return;
    if (!STORES.includes(store)) throw new Error('Неизвестное хранилище: ' + store);
    if (mode === 'idb') {
      await tx(store, 'readwrite', (s) => { list.forEach((row) => s.put(row)); });
      return;
    }
    const data = lsRead();
    list.forEach((row) => {
      if (store === 'meta') {
        data.meta[row.key] = row.value;
      } else {
        const i = data[store].findIndex((item) => item.id === row.id);
        if (i >= 0) data[store][i] = row; else data[store].push(row);
      }
    });
    lsWrite(data);
  }

  async function remove(store, id) {
    if (!STORES.includes(store)) throw new Error('Неизвестное хранилище: ' + store);
    if (mode === 'idb') {
      await tx(store, 'readwrite', (s) => s.delete(id));
      return;
    }
    const data = lsRead();
    if (store === 'meta') delete data.meta[id];
    else data[store] = data[store].filter((row) => row.id !== id);
    lsWrite(data);
  }

  async function clearStore(store) {
    if (!STORES.includes(store)) throw new Error('Неизвестное хранилище: ' + store);
    if (mode === 'idb') {
      await tx(store, 'readwrite', (s) => s.clear());
      return;
    }
    const data = lsRead();
    if (store === 'meta') data.meta = {}; else data[store] = [];
    lsWrite(data);
  }

  async function clearAll() {
    if (mode === 'idb') {
      await tx(STORES, 'readwrite', (t) => { STORES.forEach((s) => t.objectStore(s).clear()); });
      return;
    }
    lsWrite(emptyData());
  }

  async function replaceAll(payload) {
    const data = {
      clients: Array.isArray(payload.clients) ? payload.clients : [],
      works: Array.isArray(payload.works) ? payload.works : [],
      payments: Array.isArray(payload.payments) ? payload.payments : [],
      trash: Array.isArray(payload.trash) ? payload.trash : [],
      meta: payload.meta && typeof payload.meta === 'object' && !Array.isArray(payload.meta) ? payload.meta : {}
    };

    if (mode === 'idb') {
      await tx(STORES, 'readwrite', (t) => {
        STORES.forEach((s) => t.objectStore(s).clear());
        data.clients.forEach((row) => t.objectStore('clients').put(row));
        data.works.forEach((row) => t.objectStore('works').put(row));
        data.payments.forEach((row) => t.objectStore('payments').put(row));
        data.trash.forEach((row) => t.objectStore('trash').put(row));
        Object.keys(data.meta).forEach((key) => t.objectStore('meta').put({ key, value: data.meta[key] }));
      });
      return;
    }

    const meta = {};
    Object.keys(data.meta).forEach((key) => { meta[key] = data.meta[key]; });
    lsWrite({ clients: data.clients, works: data.works, payments: data.payments, trash: data.trash, meta });
  }

  async function getMeta(key) {
    const rows = await getAll('meta');
    const hit = rows.find((row) => row.key === key);
    return hit ? hit.value : undefined;
  }

  async function setMeta(key, value) {
    return put('meta', { key, value });
  }

  return {
    init, getAll, put, putMany, remove, clearStore, clearAll, replaceAll,
    getMeta, setMeta,
    get mode() { return mode; }
  };
})();
