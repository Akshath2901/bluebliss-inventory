// apps/inventory/seed.js
// Run: node seed.js
// Seeds Firebase with test data + creates first admin user

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, setDoc, doc } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
  apiKey:            'AIzaSyBE013NRiCGJqPa-SEPbu-GDMFVNZf24Lc',
  authDomain:        'bluebliss-813db.firebaseapp.com',
  projectId:         'bluebliss-813db',
  storageBucket:     'bluebliss-813db.firebasestorage.app',
  messagingSenderId: '125399707723',
  appId:             '1:125399707723:web:73e4414c4ef8a5ac87ddce',
};

const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);

const INGREDIENTS = [
  { name:'Chicken Patty',  category:'Proteins',   unit:'pcs', currentStock:132, minThreshold:30, maxStock:200, costPerUnit:45,  supplierId:'', averageUsage:0, isActive:true },
  { name:'Lettuce',        category:'Vegetables', unit:'kg',  currentStock:3,   minThreshold:5,  maxStock:20,  costPerUnit:80,  supplierId:'', averageUsage:0, isActive:true },
  { name:'Burger Bun',     category:'Bakery',     unit:'pcs', currentStock:89,  minThreshold:40, maxStock:200, costPerUnit:8,   supplierId:'', averageUsage:0, isActive:true },
  { name:'Mutton Patty',   category:'Proteins',   unit:'pcs', currentStock:0,   minThreshold:20, maxStock:100, costPerUnit:90,  supplierId:'', averageUsage:0, isActive:true },
  { name:'Cheese Slice',   category:'Dairy',      unit:'pcs', currentStock:56,  minThreshold:20, maxStock:150, costPerUnit:15,  supplierId:'', averageUsage:0, isActive:true },
  { name:'Tomato',         category:'Vegetables', unit:'kg',  currentStock:8,   minThreshold:3,  maxStock:25,  costPerUnit:40,  supplierId:'', averageUsage:0, isActive:true },
  { name:'Tandoori Sauce', category:'Condiments', unit:'L',   currentStock:4,   minThreshold:5,  maxStock:20,  costPerUnit:120, supplierId:'', averageUsage:0, isActive:true },
  { name:'Pizza Base',     category:'Bakery',     unit:'pcs', currentStock:45,  minThreshold:20, maxStock:100, costPerUnit:25,  supplierId:'', averageUsage:0, isActive:true },
  { name:'Mozzarella',     category:'Dairy',      unit:'kg',  currentStock:12,  minThreshold:5,  maxStock:30,  costPerUnit:280, supplierId:'', averageUsage:0, isActive:true },
  { name:'Onion',          category:'Vegetables', unit:'kg',  currentStock:15,  minThreshold:5,  maxStock:40,  costPerUnit:30,  supplierId:'', averageUsage:0, isActive:true },
];

const SUPPLIERS = [
  { name:'Fresh Farms',         contact:'Ravi Kumar', phone:'98765 43210', email:'ravi@freshfarms.in',   category:'Proteins',   ingredients:['Chicken Patty','Mutton Patty'], leadTimeDays:1, rating:4.8, paymentTerms:'Net 7',            notes:'Call before 10am' },
  { name:'Green Valley',        contact:'Sunita Rao', phone:'91234 56789', email:'sunita@greenvalley.in',category:'Vegetables', ingredients:['Lettuce','Tomato','Onion'],      leadTimeDays:1, rating:4.5, paymentTerms:'Net 14',           notes:'WhatsApp orders preferred' },
  { name:'Bake House',          contact:'Ahmed Khan', phone:'87654 32109', email:'ahmed@bakehouse.in',   category:'Bakery',     ingredients:['Burger Bun','Pizza Base'],       leadTimeDays:2, rating:4.2, paymentTerms:'Cash on delivery', notes:'Minimum 100 pcs' },
  { name:'Dairy Direct',        contact:'Meera Sharma',phone:'76543 21098',email:'meera@dairydirect.in', category:'Dairy',      ingredients:['Cheese Slice','Mozzarella'],     leadTimeDays:1, rating:4.6, paymentTerms:'Net 7',            notes:'Early morning delivery' },
  { name:'Spice Route',         contact:'Farhan Ali', phone:'65432 10987', email:'farhan@spiceroute.in', category:'Condiments', ingredients:['Tandoori Sauce'],                leadTimeDays:3, rating:4.0, paymentTerms:'Net 30',           notes:'Bulk 10% discount' },
];

async function seed() {
  console.log('Seeding Firebase...');

  // Create owner account
  try {
    const cred = await createUserWithEmailAndPassword(auth, 'admin@bluebliss.in', 'BlueBliss@2026');
    await setDoc(doc(db, 'users', cred.user.uid), {
      name:      'Admin',
      email:     'admin@bluebliss.in',
      role:      'owner',
      active:    true,
      createdAt: new Date(),
    });
    console.log('Owner created: admin@bluebliss.in / BlueBliss@2026');
  } catch (e) {
    console.log('Owner may already exist:', e.message);
  }

  // Seed ingredients
  for (const ing of INGREDIENTS) {
    await addDoc(collection(db, 'inventory_ingredients'), {
      ...ing, createdAt: new Date(), updatedAt: new Date(), updatedBy: 'seed',
    });
  }
  console.log('Ingredients seeded:', INGREDIENTS.length);

  // Seed suppliers
  for (const sup of SUPPLIERS) {
    await addDoc(collection(db, 'inventory_suppliers'), {
      ...sup, totalOrders:0, totalSpent:0, lastOrder:null, createdAt: new Date(),
    });
  }
  console.log('Suppliers seeded:', SUPPLIERS.length);

  console.log('Done. Login: admin@bluebliss.in / BlueBliss@2026');
  process.exit(0);
}

seed().catch(console.error);