import React, { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import './Waste.css';
import { subscribeWasteLogs, logWaste, subscribeIngredients } from '../../lib/firebase.js';
import { useAuth } from '../../context/AuthContext.jsx';

const REASONS     = ['Spoilage','Expired','Overproduction','Dropped','Contamination','Staff meal','Other'];
const REASON_ICON = {Spoilage:'🦠',Expired:'⏰',Overproduction:'📦',Dropped:'💧',Contamination:'⚠️','Staff meal':'🍽️',Other:'📝'};
const PIE_COLORS  = ['#EF4444','#F59E0B','#10B981','#3B82F6','#8B5CF6','#EC4899','#6B7280'];

// Turn a Firestore timestamp into a friendly "Today / Yesterday / date" + time
const fmtDate = (ts) => {
  if (!ts) return { date:'—', time:'' };
  let d;
  if (ts.toDate) d = ts.toDate();
  else if (ts.seconds) d = new Date(ts.seconds*1000);
  else d = new Date(ts);
  if (isNaN(d.getTime())) return { date:'—', time:'' };
  const today = new Date(); today.setHours(0,0,0,0);
  const that  = new Date(d); that.setHours(0,0,0,0);
  const diffDays = Math.round((today - that)/86400000);
  let label;
  if (diffDays === 0) label = 'Today';
  else if (diffDays === 1) label = 'Yesterday';
  else if (diffDays < 7) label = diffDays + ' days ago';
  else label = d.toLocaleDateString('en-IN',{day:'numeric',month:'short'});
  return { date: label, time: d.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}) };
};

function ChartTip({active,payload,label}) {
  if(!active||!payload?.length) return null;
  return <div className="wl-tip"><p className="wl-tip-label">{label}</p>{payload.map((p,i)=><p key={i} style={{color:p.color,margin:'2px 0',fontSize:12,fontWeight:700}}>₹{p.value}</p>)}</div>;
}

export default function Waste() {
  const { profile, user } = useAuth();
  const staffId = profile?.id || user?.uid || 'user';

  const [logs,        setLogs]        = useState([]);
  const [ingredients, setIngredients] = useState([]);   // real stock, for the dropdown
  const [loading,     setLoading]     = useState(true);
  const [showForm,    setShowForm]    = useState(false);
  const [search,      setSearch]      = useState('');
  const [filterReason,setFilterReason]= useState('all');
  const [toast,       setToast]       = useState('');
  const [form,        setForm]        = useState({ingredient:'',quantity:'',reason:'Spoilage',note:''});

  // Live waste logs
  useEffect(()=>{
    const unsub = subscribeWasteLogs((data)=>{ setLogs(data); setLoading(false); });
    return unsub;
  },[]);

  // Live ingredient list (so the dropdown shows the client's real stock)
  useEffect(()=>{
    const unsub = subscribeIngredients((data)=>{
      setIngredients(data);
      // default the form's ingredient to the first real one
      setForm(f => f.ingredient ? f : { ...f, ingredient: data[0]?.name || '' });
    });
    return unsub;
  },[]);

  // Helper lookups built from real ingredients
  const unitOf = (name) => ingredients.find(i=>i.name===name)?.unit || 'pcs';
  const costOf = (name) => ingredients.find(i=>i.name===name)?.costPerUnit || 0;

  const showToast = msg=>{setToast(msg);setTimeout(()=>setToast(''),3000);};

  const handleLog = async ()=>{
    if(!form.ingredient){showToast('Add ingredients in Stock first');return;}
    if(!form.quantity||parseFloat(form.quantity)<=0){showToast('Enter valid quantity');return;}
    const qty = parseFloat(form.quantity);
    try {
      await logWaste({
        ingredient: form.ingredient,
        quantity: qty,
        unit: unitOf(form.ingredient),
        reason: form.reason,
        costPerUnit: costOf(form.ingredient),   // firebase.js multiplies qty × costPerUnit for cost
        note: form.note,
      }, staffId);
      setForm({ingredient:ingredients[0]?.name||'',quantity:'',reason:'Spoilage',note:''});
      setShowForm(false);
      showToast('Waste logged successfully');
    } catch (e) {
      showToast('Log failed'); console.error(e);
    }
  };

  // Note: deletion of waste logs is restricted to owner/manager by security rules.
  const handleDelete = id => { showToast('Delete waste entries from history is disabled'); };

  const exportCSV = ()=>{
    const rows=[['Ingredient','Quantity','Unit','Reason','Cost (₹)','Note','Date','Time','Staff'],...filtered.map(l=>{const t=fmtDate(l.timestamp);return [l.ingredient,l.quantity,l.unit,l.reason,(l.cost||0).toFixed(0),l.note||'',t.date,t.time,l.staffId||''];})];
    const blob=new Blob([rows.map(r=>r.join(',')).join('\n')],{type:'text/csv'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='BlueBliss-Waste-'+new Date().toISOString().split('T')[0]+'.csv';a.click();
    showToast('Waste report exported');
  };

  const filtered = useMemo(()=>{
    let list=[...logs];
    if(search.trim()) list=list.filter(l=>(l.ingredient||'').toLowerCase().includes(search.toLowerCase())||(l.reason||'').toLowerCase().includes(search.toLowerCase()));
    if(filterReason!=='all') list=list.filter(l=>l.reason===filterReason);
    return list;
  },[logs,search,filterReason]);

  const totalCost   = logs.reduce((s,l)=>s+(l.cost||0),0);
  const todayCost   = logs.filter(l=>fmtDate(l.timestamp).date==='Today').reduce((s,l)=>s+(l.cost||0),0);
  const totalItems  = logs.reduce((s,l)=>s+(l.quantity||0),0);
  const topReason   = Object.entries(logs.reduce((a,l)=>{a[l.reason]=(a[l.reason]||0)+1;return a;},{})).sort((a,b)=>b[1]-a[1])[0];

  const reasonBreakdown = Object.entries(logs.reduce((a,l)=>{a[l.reason]=(a[l.reason]||0)+(l.cost||0);return a;},{})).map(([reason,cost])=>({reason,cost:Math.round(cost)})).sort((a,b)=>b.cost-a.cost);

  // Weekly trend computed from real logs (last 7 days)
  const weeklyWaste = useMemo(()=>{
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const buckets = {};
    for (let i=6;i>=0;i--){
      const d = new Date(); d.setDate(d.getDate()-i); d.setHours(0,0,0,0);
      buckets[d.getTime()] = { day: days[d.getDay()], cost: 0 };
    }
    logs.forEach(l=>{
      let d;
      const ts = l.timestamp;
      if (!ts) return;
      if (ts.toDate) d = ts.toDate(); else if (ts.seconds) d = new Date(ts.seconds*1000); else d = new Date(ts);
      if (isNaN(d.getTime())) return;
      d.setHours(0,0,0,0);
      if (buckets[d.getTime()]) buckets[d.getTime()].cost += (l.cost||0);
    });
    return Object.values(buckets).map(b=>({...b,cost:Math.round(b.cost)}));
  },[logs]);

  const formCost = (parseFloat(form.quantity)||0)*costOf(form.ingredient);

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
            <BarChart data={weeklyWaste} margin={{top:5,right:5,left:-20,bottom:0}}>
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
          {reasonBreakdown.length===0 ? (
            <div className="wl-empty" style={{padding:'30px 0'}}><span>📊</span><p>No data yet</p></div>
          ) : (
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
          )}
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
          {loading && <div className="wl-empty"><span>⏳</span><p>Loading…</p></div>}
          {!loading && filtered.length===0 && (
            <div className="wl-empty"><span>✅</span><p>{logs.length===0 ? 'No waste logged yet — a clean start' : 'No entries match your filters'}</p></div>
          )}
          {filtered.map((log,i)=>{
            const t = fmtDate(log.timestamp);
            return (
            <div key={log.id} className="wl-log-row" style={{animationDelay:i*.04+'s'}}>
              <div className="wl-log-icon-wrap">
                <span className="wl-log-reason-icon">{REASON_ICON[log.reason]||'📝'}</span>
              </div>
              <div className="wl-log-info">
                <div className="wl-log-top">
                  <p className="wl-log-ing">{log.ingredient}</p>
                  <span className="wl-log-reason-tag">{log.reason}</span>
                </div>
                <p className="wl-log-meta">{log.note||'No note'} · {t.date} {t.time}</p>
              </div>
              <div className="wl-log-right">
                <p className="wl-log-qty">-{log.quantity} {log.unit}</p>
                <p className="wl-log-cost">₹{(log.cost||0).toFixed(0)} lost</p>
              </div>
            </div>
            );
          })}
        </div>
        <div className="wl-log-footer">
          <span>{filtered.length} entries</span>
          <span>Total shown: ₹{filtered.reduce((s,l)=>s+(l.cost||0),0).toFixed(0)}</span>
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
              {ingredients.length===0 ? (
                <p style={{fontSize:13,color:'var(--inv-text-muted)',padding:'10px 0'}}>No ingredients yet. Add ingredients in Stock Control first, then come back to log waste.</p>
              ) : (<>
              <div className="wl-mf"><label>Ingredient</label>
                <select className="wl-minp" value={form.ingredient} onChange={e=>setForm({...form,ingredient:e.target.value})}>
                  {ingredients.map(i=><option key={i.id}>{i.name}</option>)}
                </select>
              </div>
              <div className="wl-mfrow">
                <div className="wl-mf"><label>Quantity ({unitOf(form.ingredient)})</label>
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
                    <p>{form.quantity} {unitOf(form.ingredient)} × ₹{costOf(form.ingredient)}/unit</p>
                    <p className="wl-cost-reason">{REASON_ICON[form.reason]} {form.reason}</p>
                  </div>
                </div>
              )}
              </>)}
            </div>
            <div className="wl-mactions">
              <button className="wl-btn-confirm" onClick={handleLog} disabled={ingredients.length===0}>Log Waste</button>
              <button className="wl-btn-cx" onClick={()=>setShowForm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}