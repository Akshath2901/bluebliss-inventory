import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import './Waste.css';

const INGREDIENTS = ['Chicken Patty','Lettuce','Burger Bun','Mutton Patty','Cheese Slice','Tomato','Tandoori Sauce','Pizza Base','Mozzarella','Onion'];
const UNITS_MAP   = {'Chicken Patty':'pcs','Lettuce':'kg','Burger Bun':'pcs','Mutton Patty':'pcs','Cheese Slice':'pcs','Tomato':'kg','Tandoori Sauce':'L','Pizza Base':'pcs','Mozzarella':'kg','Onion':'kg'};
const COST_MAP    = {'Chicken Patty':45,'Lettuce':80,'Burger Bun':8,'Mutton Patty':90,'Cheese Slice':15,'Tomato':40,'Tandoori Sauce':120,'Pizza Base':25,'Mozzarella':280,'Onion':30};
const REASONS     = ['Spoilage','Expired','Overproduction','Dropped','Contamination','Staff meal','Other'];
const REASON_ICON = {Spoilage:'🦠',Expired:'⏰',Overproduction:'📦',Dropped:'💧',Contamination:'⚠️','Staff meal':'🍽️',Other:'📝'};

const INIT_LOGS = [
  { id:1,  ingredient:'Lettuce',        quantity:2,   unit:'kg',  reason:'Spoilage',       cost:160,  note:'Left in fridge too long',  date:'Today',     time:'09:00 AM', staff:'Priya'  },
  { id:2,  ingredient:'Tomato',         quantity:1.5, unit:'kg',  reason:'Overproduction', cost:60,   note:'Extra sauce prepared',     date:'Today',     time:'11:30 AM', staff:'Rahul'  },
  { id:3,  ingredient:'Burger Bun',     quantity:12,  unit:'pcs', reason:'Expired',        cost:96,   note:'Past use-by date',         date:'Yesterday', time:'08:00 AM', staff:'Arjun'  },
  { id:4,  ingredient:'Chicken Patty',  quantity:5,   unit:'pcs', reason:'Dropped',        cost:225,  note:'Slipped during transfer',  date:'Yesterday', time:'01:15 PM', staff:'Rahul'  },
  { id:5,  ingredient:'Mozzarella',     quantity:0.5, unit:'kg',  reason:'Contamination',  cost:140,  note:'Cross contamination',      date:'2 days ago',time:'10:00 AM', staff:'Priya'  },
  { id:6,  ingredient:'Onion',          quantity:3,   unit:'kg',  reason:'Spoilage',        cost:90,   note:'Not stored properly',      date:'2 days ago',time:'07:30 AM', staff:'Arjun'  },
  { id:7,  ingredient:'Pizza Base',     quantity:8,   unit:'pcs', reason:'Overproduction', cost:200,  note:'Excess prep on slow day',  date:'3 days ago',time:'09:45 AM', staff:'Rahul'  },
  { id:8,  ingredient:'Cheese Slice',   quantity:10,  unit:'pcs', reason:'Expired',        cost:150,  note:'Found expired batch',      date:'3 days ago',time:'08:30 AM', staff:'Priya'  },
];

const WEEKLY_WASTE = [
  {day:'Mon',cost:120},{day:'Tue',cost:85},{day:'Wed',cost:310},
  {day:'Thu',cost:180},{day:'Fri',cost:240},{day:'Sat',cost:195},{day:'Sun',cost:421},
];

const PIE_COLORS = ['#EF4444','#F59E0B','#10B981','#3B82F6','#8B5CF6','#EC4899','#6B7280'];

function ChartTip({active,payload,label}) {
  if(!active||!payload?.length) return null;
  return <div className="wl-tip"><p className="wl-tip-label">{label}</p>{payload.map((p,i)=><p key={i} style={{color:p.color,margin:'2px 0',fontSize:12,fontWeight:700}}>₹{p.value}</p>)}</div>;
}

export default function Waste() {
  const [logs,      setLogs]      = useState(INIT_LOGS);
  const [showForm,  setShowForm]  = useState(false);
  const [search,    setSearch]    = useState('');
  const [filterReason,setFilterReason]=useState('all');
  const [toast,     setToast]     = useState('');
  const [form,      setForm]      = useState({ingredient:'Lettuce',quantity:'',reason:'Spoilage',note:''});

  const showToast = msg=>{setToast(msg);setTimeout(()=>setToast(''),3000);};

  const handleLog = ()=>{
    if(!form.quantity||parseFloat(form.quantity)<=0){showToast('Enter valid quantity');return;}
    const qty  = parseFloat(form.quantity);
    const cost = qty*(COST_MAP[form.ingredient]||0);
    const now  = new Date();
    setLogs(p=>[{id:Date.now(),ingredient:form.ingredient,quantity:qty,unit:UNITS_MAP[form.ingredient]||'pcs',reason:form.reason,cost,note:form.note,date:'Today',time:now.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}),staff:'You'},...p]);
    setForm({ingredient:'Lettuce',quantity:'',reason:'Spoilage',note:''});
    setShowForm(false);
    showToast('Waste logged successfully');
  };

  const handleDelete = id=>{setLogs(p=>p.filter(l=>l.id!==id));showToast('Entry removed');};

  const exportCSV = ()=>{
    const rows=[['Ingredient','Quantity','Unit','Reason','Cost (₹)','Note','Date','Time','Staff'],...filtered.map(l=>[l.ingredient,l.quantity,l.unit,l.reason,l.cost.toFixed(0),l.note||'',l.date,l.time,l.staff])];
    const blob=new Blob([rows.map(r=>r.join(',')).join('\n')],{type:'text/csv'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='BlueBliss-Waste-'+new Date().toISOString().split('T')[0]+'.csv';a.click();
    showToast('Waste report exported');
  };

  const filtered = useMemo(()=>{
    let list=[...logs];
    if(search.trim()) list=list.filter(l=>l.ingredient.toLowerCase().includes(search.toLowerCase())||l.reason.toLowerCase().includes(search.toLowerCase()));
    if(filterReason!=='all') list=list.filter(l=>l.reason===filterReason);
    return list;
  },[logs,search,filterReason]);

  const totalCost   = logs.reduce((s,l)=>s+l.cost,0);
  const todayCost   = logs.filter(l=>l.date==='Today').reduce((s,l)=>s+l.cost,0);
  const totalItems  = logs.reduce((s,l)=>s+l.quantity,0);
  const topReason   = Object.entries(logs.reduce((a,l)=>{a[l.reason]=(a[l.reason]||0)+1;return a;},{})).sort((a,b)=>b[1]-a[1])[0];

  const reasonBreakdown = Object.entries(logs.reduce((a,l)=>{a[l.reason]=(a[l.reason]||0)+l.cost;return a;},{})).map(([reason,cost])=>({reason,cost:Math.round(cost)})).sort((a,b)=>b.cost-a.cost);

  const formCost = (parseFloat(form.quantity)||0)*(COST_MAP[form.ingredient]||0);

  return (
    <div className="wl-page">
      {toast&&<div className="wl-toast">{toast}</div>}

      <div className="wl-header">
        <div><p className="wl-eyebrow">Waste Management</p><h1 className="wl-title">Waste Log</h1><p className="wl-sub">Track spoilage, expiry and waste to reduce costs</p></div>
        <div className="wl-hactions">
          <button className="wl-btn-exp" onClick={exportCSV}>📊 Export CSV</button>
          <button className="wl-btn-log" onClick={()=>setShowForm(true)}>+ Log Waste</button>
        </div>
      </div>

      <div className="wl-stats">
        {[
          {l:'Total Waste Cost', v:'₹'+Math.round(totalCost).toLocaleString('en-IN'), a:'red',    i:'💸', sub:'all time'},
          {l:"Today's Cost",     v:'₹'+Math.round(todayCost),                          a:'orange', i:'📅', sub:'logged today'},
          {l:'Items Wasted',     v:totalItems.toFixed(1),                               a:'gold',   i:'🗑️', sub:'total units'},
          {l:'Top Reason',       v:topReason?topReason[0]:'—',                         a:'primary', i:'📊', sub:topReason?topReason[1]+' entries':'no data'},
        ].map((s,i)=>(
          <div key={i} className={'wl-stat wl-stat-'+s.a} style={{animationDelay:i*.08+'s'}}>
            <span className="wl-stat-icon">{s.i}</span>
            <p className="wl-stat-val">{s.v}</p>
            <p className="wl-stat-label">{s.l}</p>
            <p className="wl-stat-sub">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="wl-charts">
        <div className="wl-card">
          <div className="wl-card-hd"><div><p className="wl-eyebrow">Weekly</p><h3 className="wl-card-title">Waste Cost Trend</h3></div></div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={WEEKLY_WASTE} margin={{top:5,right:5,left:-20,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(239,68,68,.07)" vertical={false}/>
              <XAxis dataKey="day" tick={{fill:'var(--inv-text-muted)',fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:'var(--inv-text-muted)',fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>'₹'+v}/>
              <Tooltip content={<ChartTip/>}/>
              <Bar dataKey="cost" fill="var(--inv-red)" radius={[4,4,0,0]} maxBarSize={32} name="Waste Cost"/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="wl-card">
          <div className="wl-card-hd"><div><p className="wl-eyebrow">Breakdown</p><h3 className="wl-card-title">Waste by Reason</h3></div></div>
          <div className="wl-reason-split">
            <PieChart width={140} height={140}>
              <Pie data={reasonBreakdown} cx={65} cy={65} innerRadius={38} outerRadius={60} dataKey="cost" paddingAngle={3} strokeWidth={0}>
                {reasonBreakdown.map((_,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}
              </Pie>
            </PieChart>
            <div className="wl-reason-list">
              {reasonBreakdown.map((r,i)=>(
                <div key={i} className="wl-reason-row">
                  <span className="wl-reason-icon">{REASON_ICON[r.reason]||'📝'}</span>
                  <span className="wl-reason-name">{r.reason}</span>
                  <div className="wl-reason-bar"><div className="wl-reason-fill" style={{width:(r.cost/reasonBreakdown[0].cost*100)+'%',background:PIE_COLORS[i%PIE_COLORS.length],animationDelay:i*.1+'s'}}/></div>
                  <span className="wl-reason-cost">₹{r.cost}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="wl-card wl-log-card">
        <div className="wl-card-hd">
          <div><p className="wl-eyebrow">History</p><h3 className="wl-card-title">Waste Entries</h3></div>
          <div className="wl-log-controls">
            <input className="wl-search" placeholder="🔍 Search…" value={search} onChange={e=>setSearch(e.target.value)}/>
            <select className="wl-sel" value={filterReason} onChange={e=>setFilterReason(e.target.value)}>
              <option value="all">All Reasons</option>
              {REASONS.map(r=><option key={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <div className="wl-log-list">
          {filtered.length===0&&<div className="wl-empty"><span>✅</span><p>No waste entries found</p></div>}
          {filtered.map((log,i)=>(
            <div key={log.id} className="wl-log-row" style={{animationDelay:i*.04+'s'}}>
              <div className="wl-log-icon-wrap">
                <span className="wl-log-reason-icon">{REASON_ICON[log.reason]||'📝'}</span>
              </div>
              <div className="wl-log-info">
                <div className="wl-log-top">
                  <p className="wl-log-ing">{log.ingredient}</p>
                  <span className="wl-log-reason-tag">{log.reason}</span>
                </div>
                <p className="wl-log-meta">{log.note||'No note'} · {log.staff} · {log.date} {log.time}</p>
              </div>
              <div className="wl-log-right">
                <p className="wl-log-qty">-{log.quantity} {log.unit}</p>
                <p className="wl-log-cost">₹{log.cost.toFixed(0)} lost</p>
              </div>
              <button className="wl-log-del" onClick={()=>handleDelete(log.id)}>✕</button>
            </div>
          ))}
        </div>
        <div className="wl-log-footer">
          <span>{filtered.length} entries</span>
          <span>Total shown: ₹{filtered.reduce((s,l)=>s+l.cost,0).toFixed(0)}</span>
        </div>
      </div>

      {showForm&&(
        <div className="wl-overlay" onClick={()=>setShowForm(false)}>
          <div className="wl-modal" onClick={e=>e.stopPropagation()}>
            <div className="wl-modal-hd">
              <div><p className="wl-eyebrow">New Entry</p><h2 className="wl-modal-title">Log Waste</h2></div>
              <button className="wl-modal-x" onClick={()=>setShowForm(false)}>✕</button>
            </div>
            <div className="wl-mform">
              <div className="wl-mf"><label>Ingredient</label>
                <select className="wl-minp" value={form.ingredient} onChange={e=>setForm({...form,ingredient:e.target.value})}>
                  {INGREDIENTS.map(i=><option key={i}>{i}</option>)}
                </select>
              </div>
              <div className="wl-mfrow">
                <div className="wl-mf"><label>Quantity ({UNITS_MAP[form.ingredient]})</label>
                  <input className="wl-minp" type="number" placeholder="0" min="0" step="0.1" value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})}/>
                </div>
                <div className="wl-mf"><label>Reason</label>
                  <select className="wl-minp" value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})}>
                    {REASONS.map(r=><option key={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div className="wl-mf"><label>Note (optional)</label>
                <input className="wl-minp" type="text" placeholder="What happened?" value={form.note} onChange={e=>setForm({...form,note:e.target.value})}/>
              </div>
              {form.quantity>0&&(
                <div className="wl-cost-preview">
                  <div className="wl-cost-preview-left">
                    <p className="wl-cost-label">Estimated Cost Impact</p>
                    <p className="wl-cost-val">₹{formCost.toFixed(0)}</p>
                  </div>
                  <div className="wl-cost-detail">
                    <p>{form.quantity} {UNITS_MAP[form.ingredient]} × ₹{COST_MAP[form.ingredient]}/unit</p>
                    <p className="wl-cost-reason">{REASON_ICON[form.reason]} {form.reason}</p>
                  </div>
                </div>
              )}
            </div>
            <div className="wl-mactions">
              <button className="wl-btn-confirm" onClick={handleLog}>Log Waste</button>
              <button className="wl-btn-cx" onClick={()=>setShowForm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}