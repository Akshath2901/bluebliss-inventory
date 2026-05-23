// apps/inventory/src/lib/firebase.js
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc, query, orderBy, serverTimestamp, getDoc, getDocs, where } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const cfg = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = getApps().length ? getApps()[0] : initializeApp(cfg);
export const db   = getFirestore(app);
export const auth = getAuth(app);

/* ── INGREDIENTS ── */
export const subscribeIngredients = (cb) => {
  const q = query(collection(db, 'inventory_ingredients'), orderBy('name'));
  return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
};

export const addIngredient = (data, staffId) =>
  addDoc(collection(db, 'inventory_ingredients'), {
    ...data,
    currentStock: parseFloat(data.currentStock) || 0,
    minThreshold: parseFloat(data.minThreshold) || 10,
    maxStock:     parseFloat(data.maxStock) || 100,
    costPerUnit:  parseFloat(data.costPerUnit) || 0,
    averageUsage: 0, isActive: true, supplierId: '',
    updatedBy: staffId || 'user',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

export const updateIngredient = (id, data) =>
  updateDoc(doc(db, 'inventory_ingredients', id), { ...data, updatedAt: serverTimestamp() });

export const deleteIngredient = (id) =>
  deleteDoc(doc(db, 'inventory_ingredients', id));

export const updateStock = async (id, newStock, reason, staffId) => {
  const snap = await getDoc(doc(db, 'inventory_ingredients', id));
  const prev = snap.data();
  await updateDoc(doc(db, 'inventory_ingredients', id), {
    currentStock: parseFloat(newStock),
    updatedAt: serverTimestamp(),
    updatedBy: staffId || 'user',
  });
  await addDoc(collection(db, 'inventory_usage_logs'), {
    ingredientId: id,
    ingredientName: prev.name,
    unit: prev.unit,
    type: 'manual_update',
    quantityBefore: prev.currentStock,
    quantityChange: parseFloat(newStock) - prev.currentStock,
    quantityAfter: parseFloat(newStock),
    reason: reason || 'Manual update',
    staffId: staffId || 'user',
    timestamp: serverTimestamp(),
  });
};

/* ── USAGE LOGS ── */
export const subscribeUsageLogs = (cb, days = 30) => {
  const q = query(collection(db, 'inventory_usage_logs'), orderBy('timestamp', 'desc'));
  return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
};

export const logUsage = (data, staffId) =>
  addDoc(collection(db, 'inventory_usage_logs'), {
    ...data,
    type: 'manual_deduction',
    staffId: staffId || 'user',
    timestamp: serverTimestamp(),
  });

/* ── WASTE LOGS ── */
export const subscribeWasteLogs = (cb) => {
  const q = query(collection(db, 'inventory_waste_logs'), orderBy('timestamp', 'desc'));
  return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
};

export const logWaste = (data, staffId) =>
  addDoc(collection(db, 'inventory_waste_logs'), {
    ...data,
    cost: parseFloat(data.quantity) * parseFloat(data.costPerUnit || 0),
    staffId: staffId || 'user',
    timestamp: serverTimestamp(),
  });

/* ── PURCHASE ORDERS ── */
export const subscribePurchaseOrders = (cb) => {
  const q = query(collection(db, 'inventory_purchase_orders'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
};

export const createPO = async (data, staffId) => {
  const snap  = await getDocs(collection(db, 'inventory_purchase_orders'));
  const count = snap.size + 1;
  const year  = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  return addDoc(collection(db, 'inventory_purchase_orders'), {
    ...data,
    poNumber: 'PO-' + year + month + '-' + String(count).padStart(3, '0'),
    status: 'draft',
    createdBy: staffId || 'user',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    receivedAt: null,
  });
};

export const updatePOStatus = (id, status) =>
  updateDoc(doc(db, 'inventory_purchase_orders', id), {
    status,
    updatedAt: serverTimestamp(),
    ...(status === 'received' ? { receivedAt: serverTimestamp() } : {}),
  });

/* ── SUPPLIERS ── */
export const subscribeSuppliers = (cb) => {
  const q = query(collection(db, 'inventory_suppliers'), orderBy('name'));
  return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
};

export const addSupplier = (data) =>
  addDoc(collection(db, 'inventory_suppliers'), { ...data, createdAt: serverTimestamp() });

export const updateSupplier = (id, data) =>
  updateDoc(doc(db, 'inventory_suppliers', id), { ...data, updatedAt: serverTimestamp() });

export const deleteSupplier = (id) =>
  deleteDoc(doc(db, 'inventory_suppliers', id));

/* ── STAFF ── */
export const subscribeStaff = (cb) => {
  const q = query(collection(db, 'inventory_staff'), orderBy('name'));
  return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
};

export const addStaff = (data) =>
  addDoc(collection(db, 'inventory_staff'), { ...data, createdAt: serverTimestamp() });

export const updateStaff = (id, data) =>
  updateDoc(doc(db, 'inventory_staff', id), { ...data, updatedAt: serverTimestamp() });

export const deleteStaff = (id) =>
  deleteDoc(doc(db, 'inventory_staff', id));