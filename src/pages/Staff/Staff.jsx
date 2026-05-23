import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './Staff.css';

/* ─── Constants ─────────────────────────────────────────────── */
const ROLES       = ['Kitchen Staff','Head Chef','Sous Chef','Cashier','Delivery','Manager','Cleaner'];
const SHIFTS      = ['Morning (6am–2pm)','Afternoon (2pm–10pm)','Night (10pm–6am)','Full Day (9am–6pm)'];
const DEPARTMENTS = ['Kitchen','Front of House','Delivery','Management','Housekeeping'];
const MONTHS      = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const ATT_STATES  = ['—','P','A','H'];
const ATT_LABELS  = {'P':'Present','A':'Absent','H':'Half Day','—':'—'};

const now = () => {
  const d = new Date();
  return {
    date: d.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}),
    time: d.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}),
    ts:   d.toISOString(),
  };
};

/* ─── Initial Data ───────────────────────────────────────────── */
const INIT_STAFF = [
  { id:1, name:'Rahul Sharma',   role:'Head Chef',     department:'Kitchen',        phone:'98765 43210', shift:'Morning (6am–2pm)',     baseSalary:25000, joinDate:'Jan 2024', status:'active',   bankAccount:'HDFC ****4521' },
  { id:2, name:'Priya Nair',     role:'Sous Chef',     department:'Kitchen',        phone:'87654 32109', shift:'Afternoon (2pm–10pm)',  baseSalary:18000, joinDate:'Mar 2024', status:'active',   bankAccount:'SBI  ****7832' },
  { id:3, name:'Arjun Reddy',    role:'Kitchen Staff', department:'Kitchen',        phone:'76543 21098', shift:'Morning (6am–2pm)',     baseSalary:12000, joinDate:'Jun 2024', status:'active',   bankAccount:'ICICI****2341' },
  { id:4, name:'Sunita Verma',   role:'Cashier',       department:'Front of House', phone:'65432 10987', shift:'Full Day (9am–6pm)',    baseSalary:14000, joinDate:'Feb 2024', status:'active',   bankAccount:'AXIS ****9812' },
  { id:5, name:'Mohammed Irfan', role:'Delivery',      department:'Delivery',       phone:'54321 09876', shift:'Afternoon (2pm–10pm)', baseSalary:11000, joinDate:'Aug 2024', status:'active',   bankAccount:'BOI  ****5521' },
  { id:6, name:'Kavita Singh',   role:'Cleaner',       department:'Housekeeping',   phone:'43210 98765', shift:'Morning (6am–2pm)',     baseSalary:9000,  joinDate:'Sep 2024', status:'active',   bankAccount:'PNB  ****3341' },
  { id:7, name:'Ravi Kumar',     role:'Manager',       department:'Management',     phone:'32109 87654', shift:'Full Day (9am–6pm)',    baseSalary:35000, joinDate:'Dec 2023', status:'active',   bankAccount:'HDFC ****8812' },
  { id:8, name:'Fatima Begum',   role:'Kitchen Staff', department:'Kitchen',        phone:'21098 76543', shift:'Night (10pm–6am)',      baseSalary:13000, joinDate:'Oct 2024', status:'on-leave', bankAccount:'SBI  ****4431' },
];

// salary transactions — each has full timestamp + running balance
const INIT_TRANSACTIONS = {
  1: [
    { id:1, type:'advance',   amount:5000,  reason:'Medical emergency', date:'May 1, 2026',  time:'10:23 AM', balance:20000, settledOn:null    },
    { id:2, type:'advance',   amount:2000,  reason:'Personal',          date:'Apr 15, 2026', time:'02:15 PM', balance:23000, settledOn:'Apr 30' },
    { id:3, type:'deduction', amount:500,   reason:'Late arrival',      date:'May 3, 2026',  time:'09:00 AM', balance:null,  settledOn:null    },
    { id:4, type:'payment',   amount:23000, reason:'April salary paid', date:'Apr 30, 2026', time:'06:00 PM', balance:0,     settledOn:'Apr 30' },
  ],
  2: [
    { id:1, type:'advance',   amount:4000, reason:'House rent',         date:'May 5, 2026',  time:'11:30 AM', balance:14000, settledOn:null },
    { id:2, type:'payment',   amount:18000,reason:'April salary paid',  date:'Apr 30, 2026', time:'06:00 PM', balance:0,     settledOn:'Apr 30' },
  ],
  3: [
    { id:1, type:'deduction', amount:300, reason:'Uniform damage',      date:'May 8, 2026',  time:'08:45 AM', balance:null, settledOn:null },
    { id:2, type:'payment',   amount:12000,reason:'April salary paid',  date:'Apr 30, 2026', time:'06:00 PM', balance:0,    settledOn:'Apr 30' },
  ],
  4: [
    { id:1, type:'advance',   amount:3000, reason:'Personal loan',      date:'May 2, 2026',  time:'03:00 PM', balance:11000, settledOn:null },
  ],
  5: [
    { id:1, type:'payment',   amount:11000,reason:'April salary paid',  date:'Apr 30, 2026', time:'06:00 PM', balance:0,    settledOn:'Apr 30' },
  ],
  6: [
    { id:1, type:'advance',   amount:2000, reason:'Emergency',          date:'May 10, 2026', time:'04:15 PM', balance:7000,  settledOn:null },
  ],
  7: [], 8: [
    { id:1, type:'advance',   amount:5000, reason:'Medical',            date:'Apr 20, 2026', time:'12:00 PM', balance:8000,  settledOn:null },
  ],
};

// shift schedule per staff  { staffId: [ { from, to, shift, note } ] }
const INIT_SHIFTS = {
  1: [
    { id:1, from:'May 1',  to:'May 15', shift:'Morning (6am–2pm)',    note:'Regular rotation', assignedOn:'Apr 28, 2026 10:00 AM' },
    { id:2, from:'May 16', to:'May 31', shift:'Afternoon (2pm–10pm)', note:'Swap with Arjun',  assignedOn:'May 10, 2026 09:00 AM' },
  ],
  2: [
    { id:1, from:'May 1',  to:'May 31', shift:'Afternoon (2pm–10pm)', note:'Fixed shift',      assignedOn:'Apr 28, 2026 10:00 AM' },
  ],
  3: [
    { id:1, from:'May 1',  to:'May 15', shift:'Morning (6am–2pm)',    note:'',                 assignedOn:'Apr 28, 2026 10:00 AM' },
    { id:2, from:'May 16', to:'May 31', shift:'Night (10pm–6am)',     note:'Rotation',         assignedOn:'May 10, 2026 09:00 AM' },
  ],
};

// attendance grid  { staffId: { 'May': { '1':'P', '2':'A', ... } } }
const INIT_ATTENDANCE = {
  1: { May: { '1':'P','2':'P','3':'P','4':'A','5':'P','6':'P','7':'P','8':'H','9':'P','10':'P','11':'P','12':'P' } },
  2: { May: { '1':'P','2':'P','3':'H','4':'P','5':'P','6':'A','7':'P','8':'P','9':'P','10':'P','11':'P','12':'P' } },
  3: { May: { '1':'P','2':'A','3':'P','4':'P','5':'P','6':'P','7':'H','8':'P','9':'P','10':'P','11':'P','12':'P' } },
  4: { May: { '1':'P','2':'P','3':'P','4':'P','5':'P','6':'P','7':'P','8':'P','9':'P','10':'P','11':'P','12':'P' } },
  5: { May: { '1':'P','2':'P','3':'P','4':'A','5':'P','6':'P','7':'P','8':'A','9':'P','10':'P','11':'P','12':'P' } },
  6: { May: { '1':'A','2':'P','3':'P','4':'P','5':'H','6':'P','7':'P','8':'P','9':'A','10':'P','11':'P','12':'P' } },
  7: { May: { '1':'P','2':'P','3':'P','4':'P','5':'P','6':'P','7':'P','8':'P','9':'P','10':'P','11':'P','12':'P' } },
  8: { May: { '1':'P','2':'A','3':'A','4':'A','5':'A','6':'A','7':'A','8':'A','9':'A','10':'A','11':'A','12':'A' } },
};

const PAYROLL_TREND = [
  {month:'Jan',payroll:132000},{month:'Feb',payroll:135000},
  {month:'Mar',payroll:133000},{month:'Apr',payroll:138000},
  {month:'May',payroll:141000},
];

/* ─── Helpers ────────────────────────────────────────────────── */
const calcSalary = (staffId, baseSalary, transactions) => {
  const txns = transactions[staffId] || [];
  const pendingAdvances = txns.filter(t=>t.type==='advance'&&!t.settledOn).reduce((s,t)=>s+t.amount,0);
  const totalDeductions = txns.filter(t=>t.type==='deduction').reduce((s,t)=>s+t.amount,0);
  const netPayable      = baseSalary - pendingAdvances - totalDeductions;
  const isPaid          = txns.some(t=>t.type==='payment'&&t.date.includes('May'));
  return { pendingAdvances, totalDeductions, netPayable, isPaid };
};

const getDaysInMonth = (month, year) => new Date(year, month+1, 0).getDate();

const getAttSummary = (attData) => {
  const vals = Object.values(attData||{});
  return { P: vals.filter(v=>v==='P').length, A: vals.filter(v=>v==='A').length, H: vals.filter(v=>v==='H').length };
};

function ChartTip({active,payload,label}) {
  if(!active||!payload?.length) return null;
  return <div className="sf-tip"><p className="sf-tip-lbl">{label}</p>{payload.map((p,i)=><p key={i} style={{color:p.color,fontWeight:700,fontSize:12,margin:'2px 0'}}>₹{p.value.toLocaleString('en-IN')}</p>)}</div>;
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */
export default function Staff() {
  const [staff,        setStaff]        = useState(INIT_STAFF);
  const [transactions, setTransactions] = useState(INIT_TRANSACTIONS);
  const [shifts,       setShifts]       = useState(INIT_SHIFTS);
  const [attendance,   setAttendance]   = useState(INIT_ATTENDANCE);
  const [activeTab,    setActiveTab]    = useState('staff');
  const [search,       setSearch]       = useState('');
  const [filterRole,   setFilterRole]   = useState('all');
  const [filterDept,   setFilterDept]   = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy,       setSortBy]       = useState('name');
  const [sortDir,      setSortDir]      = useState('asc');
  const [toast,        setToast]        = useState('');
  const [showModal,    setShowModal]    = useState(false);
  const [editingId,    setEditingId]    = useState(null);
  const [showSalary,   setShowSalary]   = useState(null);
  const [showShift,    setShowShift]    = useState(null);
  const [txnForm,      setTxnForm]      = useState({type:'advance',amount:'',reason:'',date:'',time:''});
  const [shiftForm,    setShiftForm]    = useState({from:'',to:'',shift:SHIFTS[0],note:''});
  const [attMonth,     setAttMonth]     = useState('May');
  const [attYear,      setAttYear]      = useState(2026);
  const [form, setForm] = useState({name:'',role:'Kitchen Staff',department:'Kitchen',phone:'',shift:SHIFTS[0],baseSalary:'',joinDate:'',bankAccount:'',status:'active'});

  const showToast = msg => { setToast(msg); setTimeout(()=>setToast(''),3000); };

  /* ── Staff CRUD ── */
  const handleSaveStaff = () => {
    if(!form.name.trim()||!form.baseSalary){showToast('Fill name and salary');return;}
    if(editingId) {
      setStaff(p=>p.map(s=>s.id===editingId?{...s,...form,baseSalary:parseInt(form.baseSalary),id:editingId}:s));
      showToast('Staff updated');
    } else {
      const id=Date.now();
      setStaff(p=>[...p,{...form,id,baseSalary:parseInt(form.baseSalary)}]);
      setTransactions(p=>({...p,[id]:[]}));
      setAttendance(p=>({...p,[id]:{}}));
      showToast('Staff member added');
    }
    setShowModal(false); setEditingId(null);
  };

  const handleDelete = id => {
    if(!window.confirm('Remove this staff member?'))return;
    setStaff(p=>p.filter(s=>s.id!==id));
    showToast('Staff removed');
  };

  /* ── Transaction (advance / deduction / payment) ── */
  const handleAddTransaction = (staffId) => {
    if(!txnForm.amount||parseFloat(txnForm.amount)<=0){showToast('Enter valid amount');return;}
    const member = staff.find(s=>s.id===staffId);
    const calc   = calcSalary(staffId, member.baseSalary, transactions);
    const t = now();
    const newTxn = {
      id:       Date.now(),
      type:     txnForm.type,
      amount:   parseFloat(txnForm.amount),
      reason:   txnForm.reason||txnForm.type,
      date:     txnForm.date||t.date,
      time:     txnForm.time||t.time,
      balance:  txnForm.type==='advance' ? calc.netPayable - parseFloat(txnForm.amount) : null,
      settledOn:txnForm.type==='payment' ? (txnForm.date||t.date) : null,
    };
    setTransactions(p=>({...p,[staffId]:[...(p[staffId]||[]),newTxn]}));
    setTxnForm({type:'advance',amount:'',reason:'',date:'',time:''});
    setShowSalary(null);
    showToast(txnForm.type==='advance'?'Advance recorded':txnForm.type==='deduction'?'Deduction recorded':'Salary payment recorded');
  };

  /* ── Shift assignment ── */
  const handleAddShift = (staffId) => {
    if(!shiftForm.from||!shiftForm.to){showToast('Enter date range');return;}
    const t = now();
    const newShift = { id:Date.now(), ...shiftForm, assignedOn:`${t.date} ${t.time}` };
    setShifts(p=>({...p,[staffId]:[...(p[staffId]||[]),newShift]}));
    setShiftForm({from:'',to:'',shift:SHIFTS[0],note:''});
    setShowShift(null);
    showToast('Shift assigned');
  };

  /* ── Attendance ── */
  const cycleAtt = (staffId, day) => {
    setAttendance(p=>{
      const curr = p[staffId]?.[attMonth]?.[day] || '—';
      const next = ATT_STATES[(ATT_STATES.indexOf(curr)+1)%ATT_STATES.length];
      return { ...p, [staffId]:{ ...(p[staffId]||{}), [attMonth]:{ ...(p[staffId]?.[attMonth]||{}), [day]:next } } };
    });
  };

  const markAll = (day, value) => {
    setAttendance(p=>{
      const updated = {...p};
      staff.forEach(s=>{
        updated[s.id] = { ...(updated[s.id]||{}), [attMonth]:{ ...(updated[s.id]?.[attMonth]||{}), [day]:value } };
      });
      return updated;
    });
  };

  const exportAttendance = () => {
    const days = Array.from({length:getDaysInMonth(MONTHS.indexOf(attMonth),attYear)},(_,i)=>String(i+1));
    const header = ['Staff','Role',...days.map(d=>d+' '+attMonth.slice(0,3)),'Present','Absent','Half Day'];
    const rows = staff.map(s=>{
      const monthAtt = attendance[s.id]?.[attMonth]||{};
      const summary  = getAttSummary(monthAtt);
      return [s.name,s.role,...days.map(d=>monthAtt[d]||'—'),summary.P,summary.A,summary.H];
    });
    const blob=new Blob([[header,...rows].map(r=>r.join(',')).join('\n')],{type:'text/csv'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);
    a.download=`BlueBliss-Attendance-${attMonth}-${attYear}.csv`;a.click();
    showToast('Attendance exported');
  };

  const exportPayroll = () => {
    const rows=[['Name','Role','Base Salary','Advances','Deductions','Net Payable','Status'],...staff.map(s=>{
      const c=calcSalary(s.id,s.baseSalary,transactions);
      return[s.name,s.role,s.baseSalary,c.pendingAdvances,c.totalDeductions,c.netPayable,c.isPaid?'Paid':'Pending'];
    })];
    const blob=new Blob([rows.map(r=>r.join(',')).join('\n')],{type:'text/csv'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);
    a.download=`BlueBliss-Payroll-${attMonth}-${attYear}.csv`;a.click();
    showToast('Payroll report exported');
  };

  /* ── Filtering ── */
  const handleSort = col=>{ if(sortBy===col)setSortDir(d=>d==='asc'?'desc':'asc');else{setSortBy(col);setSortDir('asc');} };

  const filtered = useMemo(()=>{
    let list=[...staff];
    if(search.trim()) list=list.filter(s=>s.name.toLowerCase().includes(search.toLowerCase())||s.role.toLowerCase().includes(search.toLowerCase()));
    if(filterRole!=='all')   list=list.filter(s=>s.role===filterRole);
    if(filterDept!=='all')   list=list.filter(s=>s.department===filterDept);
    if(filterStatus!=='all') list=list.filter(s=>s.status===filterStatus);
    list.sort((a,b)=>{let va=a[sortBy],vb=b[sortBy];if(typeof va==='string'){va=va.toLowerCase();vb=vb.toLowerCase();}return sortDir==='asc'?(va>vb?1:-1):(va<vb?1:-1);});
    return list;
  },[staff,search,filterRole,filterDept,filterStatus,sortBy,sortDir]);

  const totalPayroll   = staff.reduce((s,m)=>{const c=calcSalary(m.id,m.baseSalary,transactions);return s+c.netPayable;},0);
  const totalAdvances  = Object.entries(transactions).reduce((s,[id,txns])=>s+txns.filter(t=>t.type==='advance'&&!t.settledOn).reduce((x,t)=>x+t.amount,0),0);
  const pendingPayments= staff.filter(s=>!calcSalary(s.id,s.baseSalary,transactions).isPaid).length;

  const attDays = Array.from({length:getDaysInMonth(MONTHS.indexOf(attMonth),attYear)},(_,i)=>String(i+1));
  const SI = ({col})=>(<span className={'sf-si'+(sortBy===col?' sf-si-on':'')}>{sortBy===col?(sortDir==='asc'?'↑':'↓'):'↕'}</span>);

  /* ═══════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════ */
  return (
    <div className="sf-page">
      {toast&&<div className="sf-toast">{toast}</div>}

      {/* Header */}
      <div className="sf-header">
        <div><p className="sf-eyebrow">Workforce Management</p><h1 className="sf-title">Staff Management</h1><p className="sf-sub">Salaries · Attendance · Shifts · HR Operations</p></div>
        <div className="sf-hactions">
          <button className="sf-btn-exp" onClick={exportPayroll}>📊 Payroll CSV</button>
          <button className="sf-btn-add" onClick={()=>{setEditingId(null);setForm({name:'',role:'Kitchen Staff',department:'Kitchen',phone:'',shift:SHIFTS[0],baseSalary:'',joinDate:'',bankAccount:'',status:'active'});setShowModal(true);}}>+ Add Staff</button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="sf-stats">
        {[
          {l:'Total Staff',      v:staff.length,    a:'primary', i:'👥'},
          {l:'Active',           v:staff.filter(s=>s.status==='active').length, a:'green', i:'✅'},
          {l:'On Leave',         v:staff.filter(s=>s.status==='on-leave').length, a:'orange', i:'🏖️'},
          {l:'Pending Salaries', v:pendingPayments, a:'red',     i:'💳'},
          {l:'Total Advances',   v:'₹'+Math.round(totalAdvances/1000)+'k', a:'gold', i:'💸'},
          {l:'Net Payroll',      v:'₹'+Math.round(totalPayroll/1000)+'k',  a:'blue', i:'💰'},
        ].map((s,i)=>(
          <div key={i} className={'sf-stat sf-stat-'+s.a} style={{animationDelay:i*.07+'s'}}>
            <span className="sf-stat-icon">{s.i}</span>
            <p className="sf-stat-val">{s.v}</p>
            <p className="sf-stat-label">{s.l}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="sf-tabs">
        {[{k:'staff',l:'👥 Staff List'},{k:'attendance',l:'📋 Attendance Sheet'},{k:'shifts',l:'🔄 Shift Schedule'},{k:'salary',l:'💰 Salary & Advances'},{k:'analytics',l:'📊 Analytics'}].map(t=>(
          <button key={t.k} className={'sf-tab'+(activeTab===t.k?' active':'')} onClick={()=>setActiveTab(t.k)}>{t.l}</button>
        ))}
      </div>

      {/* ══════════ TAB: STAFF LIST ══════════ */}
      {activeTab==='staff'&&(
        <>
          <div className="sf-controls">
            <input className="sf-search" placeholder="🔍 Search name or role…" value={search} onChange={e=>setSearch(e.target.value)}/>
            <select className="sf-sel" value={filterRole}   onChange={e=>setFilterRole(e.target.value)}>
              <option value="all">All Roles</option>{ROLES.map(r=><option key={r}>{r}</option>)}
            </select>
            <select className="sf-sel" value={filterDept}   onChange={e=>setFilterDept(e.target.value)}>
              <option value="all">All Departments</option>{DEPARTMENTS.map(d=><option key={d}>{d}</option>)}
            </select>
            <div className="sf-ftabs">
              {[{k:'all',l:'All'},{k:'active',l:'Active'},{k:'on-leave',l:'On Leave'}].map(f=>(
                <button key={f.k} className={'sf-ftab'+(filterStatus===f.k?' active':'')} onClick={()=>setFilterStatus(f.k)}>{f.l}</button>
              ))}
            </div>
          </div>

          <div className="sf-table-card">
            <div className="sf-table-wrap">
              <table className="sf-table">
                <thead><tr>
                  <th className="sf-th-s" onClick={()=>handleSort('name')}>Staff<SI col="name"/></th>
                  <th>Role & Dept</th>
                  <th>Current Shift</th>
                  <th className="sf-th-s" onClick={()=>handleSort('baseSalary')}>Base<SI col="baseSalary"/></th>
                  <th>Advance</th>
                  <th>Deduction</th>
                  <th>Net Payable</th>
                  <th>May Att.</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr></thead>
                <tbody>
                  {filtered.map((m,i)=>{
                    const calc    = calcSalary(m.id,m.baseSalary,transactions);
                    const initials= m.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
                    const attSum  = getAttSummary(attendance[m.id]?.['May']);
                    const attPct  = attDays.length>0?Math.round((attSum.P+attSum.H*0.5)/12*100):0;
                    return(
                      <tr key={m.id} className="sf-tr" style={{animationDelay:i*.04+'s'}}>
                        <td>
                          <div className="sf-td-name">
                            <div className="sf-avatar">{initials}</div>
                            <div>
                              <button className="sf-name-btn" onClick={()=>{setShowSalary(m);}}>{m.name}</button>
                              <p className="sf-small-text">{m.phone}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <p className="sf-role-lbl">{m.role}</p>
                          <p className="sf-small-text">{m.department}</p>
                        </td>
                        <td className="sf-td-shift">
                          <span className="sf-shift-pill">{m.shift.split('(')[0].trim()}</span>
                          <p className="sf-small-text">{m.shift.match(/\(([^)]+)\)/)?.[1]}</p>
                        </td>
                        <td className="sf-td-money">₹{m.baseSalary.toLocaleString('en-IN')}</td>
                        <td>{calc.pendingAdvances>0?<span className="sf-adv-pill">-₹{calc.pendingAdvances.toLocaleString('en-IN')}</span>:<span className="sf-nil">—</span>}</td>
                        <td>{calc.totalDeductions>0?<span className="sf-ded-pill">-₹{calc.totalDeductions.toLocaleString('en-IN')}</span>:<span className="sf-nil">—</span>}</td>
                        <td>
                          <p className="sf-net-val">₹{calc.netPayable.toLocaleString('en-IN')}</p>
                          {calc.isPaid&&<span className="sf-paid-chip">Paid</span>}
                        </td>
                        <td>
                          <div className="sf-mini-att">
                            <div className="sf-mini-att-bar"><div className="sf-mini-att-fill" style={{width:attPct+'%',background:attPct>=85?'var(--inv-primary)':attPct>=70?'var(--inv-orange)':'var(--inv-red)'}}/></div>
                            <span className="sf-small-text">{attSum.P}P {attSum.A}A {attSum.H}H</span>
                          </div>
                        </td>
                        <td><span className={'sf-status-chip sc-'+m.status}>{m.status==='active'?'Active':'On Leave'}</span></td>
                        <td>
                          <div className="sf-act-cell">
                            <button className="sf-act sf-act-money" title="Salary"     onClick={()=>setShowSalary(m)}>💰</button>
                            <button className="sf-act sf-act-shift" title="Shifts"     onClick={()=>setShowShift(m)}>🔄</button>
                            <button className="sf-act sf-act-edit"  title="Edit"       onClick={()=>{setEditingId(m.id);setForm({...m,baseSalary:String(m.baseSalary)});setShowModal(true);}}>✏️</button>
                            <button className="sf-act sf-act-del"   title="Delete"     onClick={()=>handleDelete(m.id)}>🗑️</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length===0&&<div className="sf-empty"><span>👥</span><p>No staff found</p></div>}
            </div>
            <div className="sf-table-footer">
              <span>{filtered.length} of {staff.length} staff</span>
              <span>Total net payroll: ₹{filtered.reduce((s,m)=>{const c=calcSalary(m.id,m.baseSalary,transactions);return s+c.netPayable;},0).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </>
      )}

      {/* ══════════ TAB: ATTENDANCE SHEET ══════════ */}
      {activeTab==='attendance'&&(
        <div className="sf-att-section">
          <div className="sf-att-toolbar">
            <div className="sf-att-month-sel">
              <button className="sf-att-nav" onClick={()=>{const idx=MONTHS.indexOf(attMonth);setAttMonth(MONTHS[idx===0?11:idx-1]);}}>‹</button>
              <span className="sf-att-month-lbl">{attMonth} {attYear}</span>
              <button className="sf-att-nav" onClick={()=>{const idx=MONTHS.indexOf(attMonth);setAttMonth(MONTHS[(idx+1)%12]);}}>›</button>
            </div>
            <div className="sf-att-legend">
              <span className="sf-leg-item att-P">P Present</span>
              <span className="sf-leg-item att-A">A Absent</span>
              <span className="sf-leg-item att-H">H Half Day</span>
              <span className="sf-leg-item att-nil">— Not marked</span>
            </div>
            <button className="sf-btn-exp" onClick={exportAttendance}>📊 Export</button>
          </div>

          <div className="sf-att-grid-wrap">
            <table className="sf-att-grid">
              <thead>
                <tr>
                  <th className="sf-att-name-col">Staff Member</th>
                  <th className="sf-att-role-col">Role</th>
                  {attDays.map(d=>(
                    <th key={d} className="sf-att-day-col">
                      <div>{d}</div>
                      <div className="sf-att-mark-all">
                        <button onClick={()=>markAll(d,'P')} title="Mark all Present" className="sf-mark-p">P</button>
                        <button onClick={()=>markAll(d,'A')} title="Mark all Absent"  className="sf-mark-a">A</button>
                      </div>
                    </th>
                  ))}
                  <th className="sf-att-sum-col">P</th>
                  <th className="sf-att-sum-col">A</th>
                  <th className="sf-att-sum-col">H</th>
                  <th className="sf-att-sum-col">%</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((m,ri)=>{
                  const monthAtt = attendance[m.id]?.[attMonth]||{};
                  const summary  = getAttSummary(monthAtt);
                  const pct      = Math.round((summary.P + summary.H*0.5) / attDays.length * 100);
                  const initials = m.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
                  return(
                    <tr key={m.id} className="sf-att-row">
                      <td className="sf-att-name-cell">
                        <div className="sf-att-staff-info">
                          <div className="sf-avatar sf-avatar-sm">{initials}</div>
                          <span>{m.name.split(' ')[0]}</span>
                        </div>
                      </td>
                      <td className="sf-att-role-cell">{m.role.split(' ')[0]}</td>
                      {attDays.map(d=>{
                        const val = monthAtt[d]||'—';
                        return(
                          <td key={d} className="sf-att-cell-td">
                            <button
                              className={`sf-att-cell att-${val==='—'?'nil':val}`}
                              onClick={()=>cycleAtt(m.id,d)}
                              title={`${m.name} - Day ${d}: Click to change`}>
                              {val}
                            </button>
                          </td>
                        );
                      })}
                      <td className="sf-att-sum present">{summary.P}</td>
                      <td className="sf-att-sum absent">{summary.A}</td>
                      <td className="sf-att-sum half">{summary.H}</td>
                      <td className="sf-att-sum">
                        <span className={'sf-att-pct-chip'+(pct>=85?' pct-good':pct>=70?' pct-ok':' pct-bad')}>{pct}%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="sf-att-summary-cards">
            {staff.map((m,i)=>{
              const monthAtt = attendance[m.id]?.[attMonth]||{};
              const summary  = getAttSummary(monthAtt);
              const pct      = Math.round((summary.P+summary.H*0.5)/attDays.length*100);
              return(
                <div key={i} className="sf-att-sum-card" style={{animationDelay:i*.05+'s'}}>
                  <p className="sf-att-sum-name">{m.name.split(' ')[0]}</p>
                  <div className="sf-att-sum-nums">
                    <span className="att-num-P">{summary.P}P</span>
                    <span className="att-num-A">{summary.A}A</span>
                    <span className="att-num-H">{summary.H}H</span>
                  </div>
                  <div className="sf-mini-att-bar"><div style={{height:'100%',width:pct+'%',background:pct>=85?'var(--inv-primary)':pct>=70?'var(--inv-orange)':'var(--inv-red)',borderRadius:2}}/></div>
                  <p className="sf-att-sum-pct">{pct}%</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════ TAB: SHIFT SCHEDULE ══════════ */}
      {activeTab==='shifts'&&(
        <div className="sf-shifts-section">
          <div className="sf-shifts-info">
            <span>🔄</span>
            <p>Click <strong>Assign Shift</strong> on any staff card to schedule a new shift period. Shifts can overlap for rotation planning.</p>
          </div>
          <div className="sf-shifts-grid">
            {staff.map((m,i)=>{
              const staffShifts = shifts[m.id]||[];
              const currentShift= staffShifts[staffShifts.length-1];
              const initials    = m.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
              return(
                <div key={i} className="sf-shift-card" style={{animationDelay:i*.06+'s'}}>
                  <div className="sf-shift-card-head">
                    <div className="sf-shift-left">
                      <div className="sf-avatar">{initials}</div>
                      <div>
                        <p className="sf-shift-name">{m.name}</p>
                        <p className="sf-small-text">{m.role}</p>
                      </div>
                    </div>
                    <button className="sf-btn-assign-shift" onClick={()=>setShowShift(m)}>+ Assign Shift</button>
                  </div>

                  {currentShift&&(
                    <div className="sf-current-shift">
                      <p className="sf-cs-label">Current Period</p>
                      <div className="sf-cs-body">
                        <span className="sf-shift-pill">{currentShift.shift.split('(')[0].trim()}</span>
                        <span className="sf-cs-dates">{currentShift.from} → {currentShift.to}</span>
                      </div>
                      <p className="sf-cs-time">{currentShift.shift.match(/\(([^)]+)\)/)?.[1]}</p>
                    </div>
                  )}

                  {staffShifts.length>0&&(
                    <div className="sf-shift-history">
                      <p className="sf-sh-title">Shift History</p>
                      {[...staffShifts].reverse().map((sh,j)=>(
                        <div key={j} className="sf-sh-row">
                          <div className="sf-sh-left">
                            <span className="sf-sh-shift">{sh.shift.split('(')[0].trim()}</span>
                            <span className="sf-sh-dates">{sh.from} – {sh.to}</span>
                            {sh.note&&<span className="sf-sh-note">{sh.note}</span>}
                          </div>
                          <span className="sf-sh-assigned">Assigned {sh.assignedOn}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {staffShifts.length===0&&<p className="sf-no-shifts">No shifts assigned yet</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════ TAB: SALARY & ADVANCES ══════════ */}
      {activeTab==='salary'&&(
        <div className="sf-salary-section">
          <div className="sf-salary-top-bar">
            <p className="sf-salary-month-lbl">May 2026 Payroll Overview</p>
            <button className="sf-btn-exp" onClick={exportPayroll}>📊 Export Payroll</button>
          </div>
          {staff.map((m,i)=>{
            const calc    = calcSalary(m.id,m.baseSalary,transactions);
            const txns    = transactions[m.id]||[];
            const initials= m.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
            return(
              <div key={i} className={'sf-sal-card'+(calc.isPaid?' sf-sal-paid':'')} style={{animationDelay:i*.06+'s'}}>
                <div className="sf-sal-head">
                  <div className="sf-sal-staff">
                    <div className="sf-avatar">{initials}</div>
                    <div>
                      <p className="sf-sal-name">{m.name}</p>
                      <p className="sf-small-text">{m.role} · {m.department} · {m.shift.split('(')[0].trim()}</p>
                    </div>
                  </div>
                  <div className="sf-sal-right">
                    {calc.isPaid
                      ? <span className="sf-paid-chip">✅ May Paid</span>
                      : <button className="sf-btn-mark-paid" onClick={()=>{const t=now();setTransactions(p=>({...p,[m.id]:[...(p[m.id]||[]),{id:Date.now(),type:'payment',amount:calc.netPayable,reason:'May 2026 salary',date:t.date,time:t.time,balance:0,settledOn:t.date}]}));showToast('Salary marked as paid');}}>Mark Paid ₹{calc.netPayable.toLocaleString('en-IN')}</button>
                    }
                    <button className="sf-btn-add-txn" onClick={()=>setShowSalary(m)}>+ Transaction</button>
                  </div>
                </div>

                <div className="sf-sal-breakdown">
                  <div className="sf-sbd-item">
                    <p className="sf-sbd-lbl">Base Salary</p>
                    <p className="sf-sbd-val">₹{m.baseSalary.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="sf-sbd-sep">−</div>
                  <div className="sf-sbd-item sf-sbd-neg">
                    <p className="sf-sbd-lbl">Advances</p>
                    <p className="sf-sbd-val">₹{calc.pendingAdvances.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="sf-sbd-sep">−</div>
                  <div className="sf-sbd-item sf-sbd-neg">
                    <p className="sf-sbd-lbl">Deductions</p>
                    <p className="sf-sbd-val">₹{calc.totalDeductions.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="sf-sbd-sep">=</div>
                  <div className="sf-sbd-item sf-sbd-net">
                    <p className="sf-sbd-lbl">Net Payable</p>
                    <p className="sf-sbd-val">₹{calc.netPayable.toLocaleString('en-IN')}</p>
                  </div>
                </div>

                {txns.length>0&&(
                  <div className="sf-txn-timeline">
                    <p className="sf-txn-title">Transaction History</p>
                    <div className="sf-timeline">
                      {[...txns].reverse().map((t,j)=>(
                        <div key={j} className={'sf-txn-row txn-'+t.type}>
                          <div className="sf-txn-dot"/>
                          <div className="sf-txn-body">
                            <div className="sf-txn-top">
                              <span className={'sf-txn-type-badge tbadge-'+t.type}>{t.type}</span>
                              <span className={'sf-txn-amount'+(t.type==='payment'?'  txn-amt-paid':t.type==='advance'?' txn-amt-adv':' txn-amt-ded')}>
                                {t.type==='payment'?'+':'-'}₹{t.amount.toLocaleString('en-IN')}
                              </span>
                            </div>
                            <p className="sf-txn-reason">{t.reason}</p>
                            <div className="sf-txn-meta">
                              <span>📅 {t.date}</span>
                              <span>🕐 {t.time}</span>
                              {t.balance!==null&&<span>Balance after: ₹{t.balance.toLocaleString('en-IN')}</span>}
                              {t.settledOn&&<span>✅ Settled {t.settledOn}</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════ TAB: ANALYTICS ══════════ */}
      {activeTab==='analytics'&&(
        <div className="sf-analytics">
          <div className="sf-analytics-row">
            <div className="sf-card">
              <div className="sf-card-hd"><div><p className="sf-eyebrow">Trend</p><h3 className="sf-card-title">Monthly Payroll</h3></div></div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={PAYROLL_TREND} margin={{top:5,right:5,left:-10,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(5,150,105,.07)" vertical={false}/>
                  <XAxis dataKey="month" tick={{fill:'var(--inv-text-muted)',fontSize:11}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fill:'var(--inv-text-muted)',fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>'₹'+Math.round(v/1000)+'k'}/>
                  <Tooltip content={<ChartTip/>}/>
                  <Bar dataKey="payroll" fill="var(--inv-primary)" radius={[4,4,0,0]} maxBarSize={36} name="Payroll"/>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="sf-card">
              <div className="sf-card-hd"><div><p className="sf-eyebrow">Dept Cost</p><h3 className="sf-card-title">By Department</h3></div></div>
              <div className="sf-dept-list">
                {DEPARTMENTS.map((dept,i)=>{
                  const ds=staff.filter(s=>s.department===dept);
                  const dc=ds.reduce((s,m)=>{const c=calcSalary(m.id,m.baseSalary,transactions);return s+c.netPayable;},0);
                  const max=Math.max(...DEPARTMENTS.map(d=>staff.filter(s=>s.department===d).reduce((s,m)=>{const c=calcSalary(m.id,m.baseSalary,transactions);return s+c.netPayable;},0)));
                  if(!ds.length)return null;
                  return(
                    <div key={i} className="sf-dept-row">
                      <span className="sf-dept-name">{dept}</span>
                      <div className="sf-dept-bar"><div className="sf-dept-fill" style={{width:(dc/max*100)+'%',animationDelay:i*.1+'s'}}/></div>
                      <span className="sf-dept-cost">₹{Math.round(dc/1000)}k</span>
                      <span className="sf-dept-count">{ds.length}👤</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="sf-card">
            <div className="sf-card-hd"><div><p className="sf-eyebrow">May 2026</p><h3 className="sf-card-title">Attendance Overview</h3></div></div>
            <div className="sf-att-overview">
              {staff.sort((a,b)=>{const sa=getAttSummary(attendance[a.id]?.May);const sb=getAttSummary(attendance[b.id]?.May);return(sb.P+sb.H*.5)-(sa.P+sa.H*.5);}).map((m,i)=>{
                const sum=getAttSummary(attendance[m.id]?.May||{});
                const pct=Math.round((sum.P+sum.H*.5)/12*100);
                const clr=pct>=85?'var(--inv-primary)':pct>=70?'var(--inv-orange)':'var(--inv-red)';
                const ini=m.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
                return(
                  <div key={i} className="sf-att-ov-row">
                    <div className="sf-avatar sf-avatar-sm">{ini}</div>
                    <span className="sf-att-ov-name">{m.name}</span>
                    <span className="sf-att-ov-role">{m.role}</span>
                    <span className="sf-att-ov-nums">{sum.P}P · {sum.A}A · {sum.H}H</span>
                    <div className="sf-att-ov-bar"><div style={{height:'100%',width:pct+'%',background:clr,borderRadius:3,transition:'width 1s ease'}}/></div>
                    <span className="sf-att-ov-pct" style={{color:clr}}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══════════ MODAL: Add/Edit Staff ══════════ */}
      {showModal&&(
        <div className="sf-overlay" onClick={()=>{setShowModal(false);setEditingId(null);}}>
          <div className="sf-modal" onClick={e=>e.stopPropagation()}>
            <div className="sf-modal-hd">
              <div><p className="sf-eyebrow">{editingId?'Edit':'New'}</p><h2 className="sf-modal-title">{editingId?'Update Staff':'Add Staff Member'}</h2></div>
              <button className="sf-modal-x" onClick={()=>{setShowModal(false);setEditingId(null);}}>✕</button>
            </div>
            <div className="sf-mform">
              <div className="sf-mfrow">
                <div className="sf-mf"><label>Full Name</label><input className="sf-minp" placeholder="Rahul Sharma" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
                <div className="sf-mf"><label>Phone</label><input className="sf-minp" placeholder="98765 43210" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></div>
              </div>
              <div className="sf-mfrow">
                <div className="sf-mf"><label>Role</label><select className="sf-minp" value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>{ROLES.map(r=><option key={r}>{r}</option>)}</select></div>
                <div className="sf-mf"><label>Department</label><select className="sf-minp" value={form.department} onChange={e=>setForm({...form,department:e.target.value})}>{DEPARTMENTS.map(d=><option key={d}>{d}</option>)}</select></div>
              </div>
              <div className="sf-mf"><label>Default Shift</label><select className="sf-minp" value={form.shift} onChange={e=>setForm({...form,shift:e.target.value})}>{SHIFTS.map(s=><option key={s}>{s}</option>)}</select></div>
              <div className="sf-mfrow">
                <div className="sf-mf"><label>Base Salary (₹)</label><input className="sf-minp" type="number" placeholder="15000" value={form.baseSalary} onChange={e=>setForm({...form,baseSalary:e.target.value})}/></div>
                <div className="sf-mf"><label>Join Date</label><input className="sf-minp" placeholder="Jan 2024" value={form.joinDate} onChange={e=>setForm({...form,joinDate:e.target.value})}/></div>
              </div>
              <div className="sf-mf"><label>Bank Account</label><input className="sf-minp" placeholder="HDFC ****4521" value={form.bankAccount} onChange={e=>setForm({...form,bankAccount:e.target.value})}/></div>
              <div className="sf-mf"><label>Status</label><select className="sf-minp" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="active">Active</option><option value="on-leave">On Leave</option></select></div>
            </div>
            <div className="sf-mactions">
              <button className="sf-btn-confirm" onClick={handleSaveStaff}>{editingId?'Update':'Add Staff'}</button>
              <button className="sf-btn-cx" onClick={()=>{setShowModal(false);setEditingId(null);}}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ MODAL: Transaction ══════════ */}
      {showSalary&&(
        <div className="sf-overlay" onClick={()=>setShowSalary(null)}>
          <div className="sf-modal" onClick={e=>e.stopPropagation()}>
            <div className="sf-modal-hd">
              <div>
                <p className="sf-eyebrow">{showSalary.name}</p>
                <h2 className="sf-modal-title">Add Transaction</h2>
              </div>
              <button className="sf-modal-x" onClick={()=>setShowSalary(null)}>✕</button>
            </div>
            {(()=>{const calc=calcSalary(showSalary.id,showSalary.baseSalary,transactions);return(
              <div className="sf-txn-summary">
                <div className="sf-ts-item"><p className="sf-ts-lbl">Base</p><p className="sf-ts-val">₹{showSalary.baseSalary.toLocaleString('en-IN')}</p></div>
                <div className="sf-ts-item"><p className="sf-ts-lbl">Advances</p><p className="sf-ts-val sf-ts-neg">-₹{calc.pendingAdvances.toLocaleString('en-IN')}</p></div>
                <div className="sf-ts-item"><p className="sf-ts-lbl">Deductions</p><p className="sf-ts-val sf-ts-neg">-₹{calc.totalDeductions.toLocaleString('en-IN')}</p></div>
                <div className="sf-ts-item sf-ts-net"><p className="sf-ts-lbl">Net Payable</p><p className="sf-ts-val">₹{calc.netPayable.toLocaleString('en-IN')}</p></div>
              </div>
            );})()}
            <div className="sf-mform">
              <div className="sf-mf"><label>Transaction Type</label>
                <div className="sf-type-tabs">
                  {[{k:'advance',l:'💸 Advance'},{k:'deduction',l:'⚠️ Deduction'},{k:'payment',l:'✅ Salary Payment'}].map(t=>(
                    <button key={t.k} className={'sf-type-tab'+(txnForm.type===t.k?' active':'')} onClick={()=>setTxnForm({...txnForm,type:t.k})}>{t.l}</button>
                  ))}
                </div>
              </div>
              <div className="sf-mfrow">
                <div className="sf-mf"><label>Amount (₹)</label><input className="sf-minp" type="number" placeholder="0" value={txnForm.amount} onChange={e=>setTxnForm({...txnForm,amount:e.target.value})}/></div>
                <div className="sf-mf"><label>Date</label><input className="sf-minp" type="text" placeholder="May 12, 2026" value={txnForm.date} onChange={e=>setTxnForm({...txnForm,date:e.target.value})}/></div>
              </div>
              <div className="sf-mfrow">
                <div className="sf-mf"><label>Time</label><input className="sf-minp" type="text" placeholder="10:30 AM" value={txnForm.time} onChange={e=>setTxnForm({...txnForm,time:e.target.value})}/></div>
                <div className="sf-mf"><label>Reason</label><input className="sf-minp" placeholder="Medical, rent, penalty…" value={txnForm.reason} onChange={e=>setTxnForm({...txnForm,reason:e.target.value})}/></div>
              </div>
            </div>
            <div className="sf-mactions">
              <button className={'sf-btn-confirm'+(txnForm.type==='advance'?' btn-orange':txnForm.type==='deduction'?' btn-red':'')} onClick={()=>handleAddTransaction(showSalary.id)}>Save Transaction</button>
              <button className="sf-btn-cx" onClick={()=>setShowSalary(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ MODAL: Shift Assignment ══════════ */}
      {showShift&&(
        <div className="sf-overlay" onClick={()=>setShowShift(null)}>
          <div className="sf-modal" onClick={e=>e.stopPropagation()}>
            <div className="sf-modal-hd">
              <div>
                <p className="sf-eyebrow">{showShift.name} · {showShift.role}</p>
                <h2 className="sf-modal-title">Assign Shift Period</h2>
              </div>
              <button className="sf-modal-x" onClick={()=>setShowShift(null)}>✕</button>
            </div>
            <div className="sf-mform">
              <div className="sf-mf"><label>Shift</label>
                <select className="sf-minp" value={shiftForm.shift} onChange={e=>setShiftForm({...shiftForm,shift:e.target.value})}>
                  {SHIFTS.map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="sf-mfrow">
                <div className="sf-mf"><label>From Date</label><input className="sf-minp" placeholder="May 1" value={shiftForm.from} onChange={e=>setShiftForm({...shiftForm,from:e.target.value})}/></div>
                <div className="sf-mf"><label>To Date</label><input className="sf-minp" placeholder="May 15" value={shiftForm.to} onChange={e=>setShiftForm({...shiftForm,to:e.target.value})}/></div>
              </div>
              <div className="sf-mf"><label>Note (optional)</label><input className="sf-minp" placeholder="Rotation, swap, permanent…" value={shiftForm.note} onChange={e=>setShiftForm({...shiftForm,note:e.target.value})}/></div>
              <div className="sf-shift-preview">
                <p className="sf-sp-lbl">Preview</p>
                <p className="sf-sp-val">{shiftForm.shift} · {shiftForm.from||'?'} to {shiftForm.to||'?'}</p>
              </div>
            </div>
            <div className="sf-mactions">
              <button className="sf-btn-confirm" onClick={()=>handleAddShift(showShift.id)}>Assign Shift</button>
              <button className="sf-btn-cx" onClick={()=>setShowShift(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}