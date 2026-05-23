import React, { useState } from "react";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, addDoc, setDoc, doc, getDocs, deleteDoc } from "firebase/firestore";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
const app  = getApps().length ? getApps()[0] : initializeApp(cfg);
const db   = getFirestore(app);
const auth = getAuth(app);

const INGREDIENTS = [
  { name:"Chicken Patty",  category:"Proteins",   unit:"pcs", currentStock:132, minThreshold:30,  maxStock:200, costPerUnit:45  },
  { name:"Lettuce",        category:"Vegetables", unit:"kg",  currentStock:3,   minThreshold:5,   maxStock:20,  costPerUnit:80  },
  { name:"Burger Bun",     category:"Bakery",     unit:"pcs", currentStock:89,  minThreshold:40,  maxStock:200, costPerUnit:8   },
  { name:"Mutton Patty",   category:"Proteins",   unit:"pcs", currentStock:0,   minThreshold:20,  maxStock:100, costPerUnit:90  },
  { name:"Cheese Slice",   category:"Dairy",      unit:"pcs", currentStock:56,  minThreshold:20,  maxStock:150, costPerUnit:15  },
  { name:"Tomato",         category:"Vegetables", unit:"kg",  currentStock:8,   minThreshold:3,   maxStock:25,  costPerUnit:40  },
  { name:"Tandoori Sauce", category:"Condiments", unit:"L",   currentStock:4,   minThreshold:5,   maxStock:20,  costPerUnit:120 },
  { name:"Pizza Base",     category:"Bakery",     unit:"pcs", currentStock:45,  minThreshold:20,  maxStock:100, costPerUnit:25  },
  { name:"Mozzarella",     category:"Dairy",      unit:"kg",  currentStock:12,  minThreshold:5,   maxStock:30,  costPerUnit:280 },
  { name:"Onion",          category:"Vegetables", unit:"kg",  currentStock:15,  minThreshold:5,   maxStock:40,  costPerUnit:30  },
];

const SUPPLIERS = [
  { name:"Fresh Farms",  contact:"Ravi Kumar",   phone:"98765 43210", email:"ravi@freshfarms.in",    category:"Proteins",   ingredients:["Chicken Patty","Mutton Patty"], leadTimeDays:1, rating:4.8, paymentTerms:"Net 7",   notes:"Call before 10am",        totalOrders:24, totalSpent:186000 },
  { name:"Green Valley", contact:"Sunita Rao",   phone:"91234 56789", email:"sunita@greenvalley.in", category:"Vegetables", ingredients:["Lettuce","Tomato","Onion"],    leadTimeDays:1, rating:4.5, paymentTerms:"Net 14",  notes:"WhatsApp preferred",      totalOrders:18, totalSpent:72000  },
  { name:"Bake House",   contact:"Ahmed Khan",   phone:"87654 32109", email:"ahmed@bakehouse.in",    category:"Bakery",     ingredients:["Burger Bun","Pizza Base"],      leadTimeDays:2, rating:4.2, paymentTerms:"COD",     notes:"Min 100 pcs",             totalOrders:15, totalSpent:61500  },
  { name:"Dairy Direct", contact:"Meera Sharma", phone:"76543 21098", email:"meera@dairydirect.in",  category:"Dairy",      ingredients:["Cheese Slice","Mozzarella"],    leadTimeDays:1, rating:4.6, paymentTerms:"Net 7",   notes:"Early morning delivery",  totalOrders:20, totalSpent:148000 },
  { name:"Spice Route",  contact:"Farhan Ali",   phone:"65432 10987", email:"farhan@spiceroute.in",  category:"Condiments", ingredients:["Tandoori Sauce"],               leadTimeDays:3, rating:4.0, paymentTerms:"Net 30",  notes:"Bulk 10% discount",       totalOrders:8,  totalSpent:38400  },
];

const STAFF = [
  { name:"Rahul Sharma",   role:"Head Chef",     department:"Kitchen",        phone:"98765 43210", shift:"Morning (6am-2pm)",    baseSalary:25000, joinDate:"Jan 2024", status:"active",   bankAccount:"HDFC ****4521" },
  { name:"Priya Nair",     role:"Sous Chef",     department:"Kitchen",        phone:"87654 32109", shift:"Afternoon (2pm-10pm)", baseSalary:18000, joinDate:"Mar 2024", status:"active",   bankAccount:"SBI  ****7832" },
  { name:"Arjun Reddy",    role:"Kitchen Staff", department:"Kitchen",        phone:"76543 21098", shift:"Morning (6am-2pm)",    baseSalary:12000, joinDate:"Jun 2024", status:"active",   bankAccount:"ICICI****2341" },
  { name:"Sunita Verma",   role:"Cashier",       department:"Front of House", phone:"65432 10987", shift:"Full Day (9am-6pm)",   baseSalary:14000, joinDate:"Feb 2024", status:"active",   bankAccount:"AXIS ****9812" },
  { name:"Mohammed Irfan", role:"Delivery",      department:"Delivery",       phone:"54321 09876", shift:"Afternoon (2pm-10pm)", baseSalary:11000, joinDate:"Aug 2024", status:"active",   bankAccount:"BOI  ****5521" },
  { name:"Kavita Singh",   role:"Cleaner",       department:"Housekeeping",   phone:"43210 98765", shift:"Morning (6am-2pm)",    baseSalary:9000,  joinDate:"Sep 2024", status:"active",   bankAccount:"PNB  ****3341" },
  { name:"Ravi Kumar",     role:"Manager",       department:"Management",     phone:"32109 87654", shift:"Full Day (9am-6pm)",   baseSalary:35000, joinDate:"Dec 2023", status:"active",   bankAccount:"HDFC ****8812" },
  { name:"Fatima Begum",   role:"Kitchen Staff", department:"Kitchen",        phone:"21098 76543", shift:"Night (10pm-6am)",     baseSalary:13000, joinDate:"Oct 2024", status:"on-leave", bankAccount:"SBI  ****4431" },
];

async function clearCol(name) {
  const snap = await getDocs(collection(db, name));
  await Promise.all(snap.docs.map(d => deleteDoc(doc(db, name, d.id))));
}

export default function SeedPage() {
  const [log,     setLog]     = useState([]);
  const [running, setRunning] = useState(false);
  const [done,    setDone]    = useState(false);

  const addLog = msg => setLog(p => [...p, msg]);

  const runSeed = async () => {
    setRunning(true); setLog([]); setDone(false);
    try {
      // Admin user
      try {
        const cred = await createUserWithEmailAndPassword(auth, "admin@bluebliss.in", "BlueBliss@2026");
        await setDoc(doc(db, "users", cred.user.uid), { name:"Admin", email:"admin@bluebliss.in", role:"owner", active:true, createdAt:new Date().toISOString() });
        addLog("Admin user created");
      } catch(e) {
        addLog(e.code === "auth/email-already-in-use" ? "Admin already exists" : "Auth: " + e.message);
      }

      // Ingredients
      addLog("Clearing ingredients...");
      await clearCol("inventory_ingredients");
      for (const item of INGREDIENTS) {
        await addDoc(collection(db, "inventory_ingredients"), { ...item, averageUsage:0, isActive:true, supplierId:"", updatedBy:"seed", createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() });
      }
      addLog("Seeded " + INGREDIENTS.length + " ingredients");

      // Suppliers
      addLog("Clearing suppliers...");
      await clearCol("inventory_suppliers");
      for (const sup of SUPPLIERS) {
        await addDoc(collection(db, "inventory_suppliers"), { ...sup, lastOrder:null, createdAt:new Date().toISOString() });
      }
      addLog("Seeded " + SUPPLIERS.length + " suppliers");

      // Staff
      addLog("Clearing staff...");
      await clearCol("inventory_staff");
      for (const s of STAFF) {
        await addDoc(collection(db, "inventory_staff"), { ...s, attendance:90, createdAt:new Date().toISOString() });
      }
      addLog("Seeded " + STAFF.length + " staff members");

      addLog("");
      addLog("DONE. Firebase is ready.");
      addLog("Login: admin@bluebliss.in / BlueBliss@2026");
      setDone(true);
    } catch(e) {
      addLog("ERROR: " + e.message);
    }
    setRunning(false);
  };

  return (
    <div style={{ padding:"40px", fontFamily:"var(--font-main)", maxWidth:600 }}>
      <p style={{ fontSize:10, fontWeight:600, letterSpacing:"0.08em", color:"var(--inv-text-muted)", marginBottom:6, textTransform:"uppercase" }}>Setup</p>
      <h1 style={{ fontSize:22, fontWeight:700, color:"var(--inv-text)", marginBottom:6 }}>Database Seed</h1>
      <p style={{ fontSize:13, color:"var(--inv-text-muted)", marginBottom:24 }}>Populate Firestore with initial data. Safe to run multiple times — clears existing data first.</p>

      <button onClick={runSeed} disabled={running}
        style={{ padding:"11px 24px", background:done?"#15803D":"var(--inv-primary)", border:"none", borderRadius:10, color:"#fff", fontSize:14, fontWeight:600, cursor:running?"not-allowed":"pointer", opacity:running?0.7:1, marginBottom:20 }}>
        {running ? "Seeding..." : done ? "Seeded Successfully" : "Run Seed"}
      </button>

      {log.length > 0 && (
        <div style={{ background:"var(--inv-surface)", border:"1px solid var(--inv-border)", borderRadius:12, padding:"16px 20px" }}>
          {log.map((line, i) => (
            <p key={i} style={{ fontFamily:"var(--font-mono)", fontSize:12, color: line.startsWith("ERROR") ? "var(--inv-red)" : line.startsWith("DONE") || line.includes("Login") ? "var(--inv-primary)" : "var(--inv-text-dim)", margin:"3px 0" }}>
              {line || <br/>}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}