import React, { useState, useMemo, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './Usage.css';
import { subscribeUsageLogs, subscribeIngredients, updateStock } from '../../lib/firebase.js';
import { useAuth } from '../../context/AuthContext.jsx';

const REASONS = ['Daily prep','Order fulfilled','Spoilage','Staff meal','Inventory adjustment','Other'];

// Friendly date label + time from a Firestore timestamp
const fmtDate = (ts) => {
  if (!ts) return { date:'—', time:'' };
  let d;
  if (ts.toDate) d = ts.toDate(); else if (ts.seconds) d = new Date(ts.seconds*1000); else d = new Date(ts);
  if (isNaN(d.getTime())) return { date:'—', time:'' };
  const today = new Date(); today.setHours(0,0,0,0);
  const that  = new Date(d); that.setHours(0,0,0,0);
  const diff = Math.round((today - that)/86400000);
  let label;
  if (diff === 0) label = 'Today';
  else if (diff === 1) label = 'Yesterday';
  else if (diff < 7) label = diff + ' days ago';
  else label = d.toLocaleDateString('en-IN',{day:'numeric',month:'short'});
  return { date: label, time: d.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}) };
};

const dayKey = (ts) => {
  let d;
  if (!ts) return null;
  if (ts.toDate) d = ts.toDate(); else if (ts.seconds) d = new Date(ts.seconds*1000); else d = new Date(ts);
  if (isNaN(d.getTime())) return null;
  d.setHours(0,0,0,0);
  return d.getTime();
};

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="ut-tip">
      <p className="ut-tip-label">{label}</p>
      {payload.map((p,i) => <p key={i} style={{color:p.color,margin:'2px 0',fontSize:12,fontWeight:700}}>{p.name}: {p.value}</p>)}
    </div>
  );
}

export default function Usage() {
  const { profile, user } = useAuth();
  const staffId = profile?.id || user?.uid || 'user';

  const [logs,        setLogs]        = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showForm,    setShowForm]    = useState(false);
  const [search,      setSearch]      = useState('');
  const [filterIng,   setFilterIng]   = useState('all');
  const [toast,       setToast]       = useState('');
  const [form,        setForm]        = useState({ ingredient:'', quantity:'', reason:'Daily prep', note:'' });

  // Only show manual usage in this view (not stock corrections or other log types).
  // firebase.js writes type:'manual_deduction' for logUsage and 'manual_update' for stock edits.
  useEffect(()=>{
    const unsub = subscribeUsageLogs((data)=>{ setLogs(data); setLoading(false); });
    return unsub;
  },[]);

  useEffect(()=>{
    const unsub = subscribeIngredients((data)=>{
      setIngredients(data);
      setForm(f => f.ingredient ? f : { ...f, ingredient: data[0]?.name || '' });
    });
    return unsub;
  },[]);

  const ingredientByName = (name) => ingredients.find(i=>i.name===name);
  const unitOf = (name) => ingredientByName(name)?.unit || 'pcs';

  const showToast = msg => { setToast(msg); setTimeout(()=>setToast(''),3000); };

  const handleLog = async () => {
    if (!form.ingredient) { showToast('Add ingredients in Stock first'); return; }
    if (!form.quantity || parseFloat(form.quantity) <= 0) { showToast('Enter valid quantity'); return; }
    const ing = ingredientByName(form.ingredient);
    if (!ing) { showToast('Ingredient not found'); return; }
    const used = parseFloat(form.quantity);
    const newStock = Math.max(0, (parseFloat(ing.currentStock)||0) - used);
    try {
      // updateStock deducts the stock AND writes a usage log entry in one call
      await updateStock(ing.id, newStock, form.reason + (form.note ? ' · '+form.note : ''), staffId);
      setForm({ ingredient:ingredients[0]?.name||'', quantity:'', reason:'Daily prep', note:'' });
      setShowForm(false);
      showToast('Usage logged · stock updated');
    } catch (e) {
      showToast('Log failed'); console.error(e);
    }
  };

  const exportCSV = () => {
    const rows = [['Ingredient','Change','Unit','Reason','Date','Time'], ...filtered.map(l=>{const t=fmtDate(l.timestamp);return [l.ingredientName,l.quantityChange,l.unit,l.reason||'',t.date,t.time];})];
    const blob = new Blob([rows.map(r=>r.join(',')).join('\n')],{type:'text/csv'});
    const a = document.createElement('a'); a.href=URL.createObjectURL(blob);
    a.download='BlueBliss-Usage-'+new Date().toISOString().split('T')[0]+'.csv'; a.click();
    showToast('Usage report exported');
  };

  // Normalize logs: usage logs store ingredientName, quantityChange (negative when used)
  const usageRows = useMemo(()=>logs.map(l=>({
    id: l.id,
    ingredient: l.ingredientName || l.ingredient || '—',
    quantity: Math.abs(l.quantityChange ?? l.quantity ?? 0),
    unit: l.unit || '',
    reason: l.reason || '',
    timestamp: l.timestamp,
  })),[logs]);

  const filtered = useMemo(() => {
    let list = [...usageRows];
    if (search.trim()) list = list.filter(l => l.ingredient.toLowerCase().includes(search.toLowerCase()) || l.reason.toLowerCase().includes(search.toLowerCase()));
    if (filterIng !== 'all') list = list.filter(l => l.ingredient === filterIng);
    return list;
  }, [usageRows, search, filterIng]);

  const topIngredients = useMemo(() => {
    const map = {};
    usageRows.forEach(l => { map[l.ingredient] = (map[l.ingredient]||0) + l.quantity; });
    return Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([name,total])=>({name,total}));
  }, [usageRows]);

  const totalToday = usageRows.filter(l=>fmtDate(l.timestamp).date==='Today').reduce((s,l)=>s+l.quantity,0);
  const totalWk    = usageRows.reduce((s,l)=>s+l.quantity,0);
  const uniqueIngs = [...new Set(usageRows.map(l=>l.ingredient))].length;
  const maxItem    = topIngredients[0];

  // Daily totals from real logs (last 7 days)
  const dailyData = useMemo(()=>{
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const buckets = {};
    for (let i=6;i>=0;i--){
      const d = new Date(); d.setDate(d.getDate()-i); d.setHours(0,0,0,0);
      buckets[d.getTime()] = { day: days[d.getDay()], total: 0 };
    }
    usageRows.forEach(l=>{
      const k = dayKey(l.timestamp);
      if (k && buckets[k]) buckets[k].total += l.quantity;
    });
    return Object.values(buckets).map(b=>({...b,total:Math.round(b.total*10)/10}));
  },[usageRows]);

  return (
    <div className="ut-page">
      {toast && <div className="ut-toast">{toast}</div>}

      <div className="ut-header">
        <div>
          <p className="ut-eyebrow">Consumption</p>
          <h1 className="ut-title">Usage Tracker</h1>
          <p className="ut-sub">Log and analyze ingredient consumption patterns</p>
        </div>
        <div className="ut-hactions">
          <button className="ut-btn-exp" onClick={exportCSV}>📊 Export CSV</button>
          <button className="ut-btn-log" onClick={() => setShowForm(true)}>+ Log Usage</button>
        </div>
      </div>

      <div className="ut-stats">
        {[
          {label:"Today's Usage",  value:totalToday.toFixed(1), sub:'units consumed today',   accent:'primary', icon:'📉'},
          {label:'This Week',      value:totalWk.toFixed(1),    sub:'total units logged',     accent:'green',   icon:'📅'},
          {label:'Ingredients',    value:uniqueIngs,             sub:'different items used',   accent:'gold',    icon:'🥬'},
          {label:'Top Item',       value:maxItem?.name.split(' ')[0]||'—', sub:maxItem?maxItem.total.toFixed(1)+' units used':'no data', accent:'orange', icon:'🏆'},
        ].map((s,i)=>(
          <div key={i} className={'ut-stat ut-stat-'+s.accent} style={{animationDelay:i*.08+'s'}}>
            <span className="ut-stat-icon">{s.icon}</span>
            <p className="ut-stat-val">{s.value}</p>
            <p className="ut-stat-label">{s.label}</p>
            <p className="ut-stat-sub">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="ut-charts">
        <div className="ut-card">
          <div className="ut-card-hd">
            <div><p className="ut-eyebrow">Weekly</p><h3 className="ut-card-title">Daily Consumption Total</h3></div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={dailyData} margin={{top:5,right:5,left:-25,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(16,185,129,.07)" vertical={false}/>
              <XAxis dataKey="day" tick={{fill:'var(--inv-text-muted)',fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:'var(--inv-text-muted)',fontSize:11}} axisLine={false} tickLine={false}/>
              <Tooltip content={<ChartTip/>}/>
              <Bar dataKey="total" fill="var(--inv-primary)" radius={[4,4,0,0]} maxBarSize={32} name="Total Units"/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="ut-card">
          <div className="ut-card-hd">
            <div><p className="ut-eyebrow">Ranking</p><h3 className="ut-card-title">Most Used</h3></div>
          </div>
          {topIngredients.length===0 ? (
            <div className="ut-empty" style={{padding:'40px 0'}}><span>📊</span><p>No usage data yet</p></div>
          ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={topIngredients} layout="vertical" margin={{top:5,right:10,left:10,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(16,185,129,.07)" horizontal={false}/>
              <XAxis type="number" tick={{fill:'var(--inv-text-muted)',fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis type="category" dataKey="name" width={90} tick={{fill:'var(--inv-text-muted)',fontSize:11}} axisLine={false} tickLine={false}/>
              <Tooltip content={<ChartTip/>}/>
              <Bar dataKey="total" fill="var(--inv-gold)" radius={[0,4,4,0]} maxBarSize={20} name="Units"/>
            </BarChart>
          </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="ut-bottom">
        <div className="ut-card ut-top-card">
          <div className="ut-card-hd"><div><p className="ut-eyebrow">Ranking</p><h3 className="ut-card-title">Most Used This Week</h3></div></div>
          <div className="ut-top-list">
            {topIngredients.length===0 && <div className="ut-empty"><span>📭</span><p>No data yet</p></div>}
            {topIngredients.map((item,i)=>{
              const max = topIngredients[0]?.total || 1;
              return(
                <div key={i} className="ut-top-row">
                  <span className="ut-top-rank">#{i+1}</span>
                  <span className="ut-top-name">{item.name}</span>
                  <div className="ut-top-bar"><div className="ut-top-fill" style={{width:(item.total/max*100)+'%',animationDelay:i*.12+'s'}}/></div>
                  <span className="ut-top-val">{item.total.toFixed(1)}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="ut-card ut-log-card">
          <div className="ut-card-hd">
            <div><p className="ut-eyebrow">History</p><h3 className="ut-card-title">Usage Log</h3></div>
            <div className="ut-log-controls">
              <input className="ut-search" placeholder="🔍 Search…" value={search} onChange={e=>setSearch(e.target.value)}/>
              <select className="ut-sel" value={filterIng} onChange={e=>setFilterIng(e.target.value)}>
                <option value="all">All Ingredients</option>
                {ingredients.map(i=><option key={i.id} value={i.name}>{i.name}</option>)}
              </select>
            </div>
          </div>
          <div className="ut-log-list">
            {loading && <div className="ut-empty"><span>⏳</span><p>Loading…</p></div>}
            {!loading && filtered.length === 0 && (
              <div className="ut-empty"><span>📭</span><p>{usageRows.length===0 ? 'No usage logged yet' : 'No entries match your filters'}</p></div>
            )}
            {filtered.map((log,i)=>{
              const t = fmtDate(log.timestamp);
              return (
              <div key={log.id} className="ut-log-row" style={{animationDelay:i*.04+'s'}}>
                <div className="ut-log-left">
                  <div className="ut-log-ing-dot"/>
                  <div>
                    <p className="ut-log-ing">{log.ingredient}</p>
                    <p className="ut-log-meta">{log.reason}</p>
                  </div>
                </div>
                <div className="ut-log-right">
                  <span className="ut-log-qty">-{log.quantity} {log.unit}</span>
                  <span className="ut-log-time">{t.date} {t.time}</span>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      </div>

      {showForm && (
        <div className="ut-overlay" onClick={()=>setShowForm(false)}>
          <div className="ut-modal" onClick={e=>e.stopPropagation()}>
            <div className="ut-modal-hd">
              <div><p className="ut-eyebrow">New Entry</p><h2 className="ut-modal-title">Log Usage</h2></div>
              <button className="ut-modal-x" onClick={()=>setShowForm(false)}>✕</button>
            </div>
            <div className="ut-mform">
              {ingredients.length===0 ? (
                <p style={{fontSize:13,color:'var(--inv-text-muted)',padding:'10px 0'}}>No ingredients yet. Add ingredients in Stock Control first, then log their usage here.</p>
              ) : (<>
              <div className="ut-mf"><label>Ingredient</label>
                <select className="ut-minp" value={form.ingredient} onChange={e=>setForm({...form,ingredient:e.target.value})}>
                  {ingredients.map(i=><option key={i.id}>{i.name}</option>)}
                </select>
              </div>
              <div className="ut-mfrow">
                <div className="ut-mf"><label>Quantity Used ({unitOf(form.ingredient)})</label>
                  <input className="ut-minp" type="number" placeholder="0" min="0" step="0.1"
                    value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})}/>
                </div>
                <div className="ut-mf"><label>Reason</label>
                  <select className="ut-minp" value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})}>
                    {REASONS.map(r=><option key={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div className="ut-mf"><label>Note (optional)</label>
                <input className="ut-minp" type="text" placeholder="e.g., Lunch batch, evening orders…"
                  value={form.note} onChange={e=>setForm({...form,note:e.target.value})}/>
              </div>
              <div className="ut-preview">
                <span className="ut-preview-label">Logging:</span>
                <span className="ut-preview-val">{form.quantity||'?'} {unitOf(form.ingredient)} of {form.ingredient}</span>
              </div>
              {form.ingredient && (
                <p style={{fontSize:11,color:'var(--inv-text-muted)',marginTop:6}}>Current stock: {ingredientByName(form.ingredient)?.currentStock ?? 0} {unitOf(form.ingredient)} → will deduct {form.quantity||0}</p>
              )}
              </>)}
            </div>
            <div className="ut-mactions">
              <button className="ut-btn-confirm" onClick={handleLog} disabled={ingredients.length===0}>Log Usage</button>
              <button className="ut-btn-cx" onClick={()=>setShowForm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}