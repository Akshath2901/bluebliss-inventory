import React, { useState, useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './Usage.css';

const INGREDIENTS = ['Chicken Patty','Lettuce','Burger Bun','Mutton Patty','Cheese Slice','Tomato','Tandoori Sauce','Pizza Base','Mozzarella','Onion'];
const UNITS_MAP   = {'Chicken Patty':'pcs','Lettuce':'kg','Burger Bun':'pcs','Mutton Patty':'pcs','Cheese Slice':'pcs','Tomato':'kg','Tandoori Sauce':'L','Pizza Base':'pcs','Mozzarella':'kg','Onion':'kg'};
const REASONS     = ['Daily prep','Order fulfilled','Spoilage','Staff meal','Inventory adjustment','Other'];

const INIT_LOGS = [
  { id:1,  ingredient:'Chicken Patty',  quantity:24, unit:'pcs', reason:'Order fulfilled',     note:'Weekend rush orders', date:'Today',     time:'09:30 AM', staff:'Rahul' },
  { id:2,  ingredient:'Lettuce',        quantity:2,  unit:'kg',  reason:'Daily prep',           note:'Morning prep',        date:'Today',     time:'08:15 AM', staff:'Priya' },
  { id:3,  ingredient:'Burger Bun',     quantity:30, unit:'pcs', reason:'Order fulfilled',     note:'Lunch batch',         date:'Today',     time:'12:45 PM', staff:'Rahul' },
  { id:4,  ingredient:'Tomato',         quantity:3,  unit:'kg',  reason:'Daily prep',           note:'Sauce preparation',   date:'Yesterday', time:'07:30 AM', staff:'Priya' },
  { id:5,  ingredient:'Cheese Slice',   quantity:18, unit:'pcs', reason:'Order fulfilled',     note:'',                    date:'Yesterday', time:'01:20 PM', staff:'Arjun' },
  { id:6,  ingredient:'Mutton Patty',   quantity:12, unit:'pcs', reason:'Order fulfilled',     note:'Evening orders',      date:'Yesterday', time:'07:15 PM', staff:'Rahul' },
  { id:7,  ingredient:'Mozzarella',     quantity:1.5,unit:'kg',  reason:'Daily prep',           note:'Pizza prep',          date:'2 days ago',time:'08:00 AM', staff:'Priya' },
  { id:8,  ingredient:'Onion',          quantity:4,  unit:'kg',  reason:'Daily prep',           note:'Chopped for service', date:'2 days ago',time:'09:00 AM', staff:'Arjun' },
  { id:9,  ingredient:'Tandoori Sauce', quantity:0.5,unit:'L',   reason:'Order fulfilled',     note:'Tandoori items',      date:'3 days ago',time:'02:00 PM', staff:'Rahul' },
  { id:10, ingredient:'Pizza Base',     quantity:20, unit:'pcs', reason:'Order fulfilled',     note:'Pizza orders batch',  date:'3 days ago',time:'06:30 PM', staff:'Priya' },
];

const TREND_DATA = [
  { day:'Mon', Chicken:18, Lettuce:1.5, Burger:22, Mutton:8  },
  { day:'Tue', Chicken:22, Lettuce:2.0, Burger:28, Mutton:10 },
  { day:'Wed', Chicken:20, Lettuce:1.8, Burger:25, Mutton:9  },
  { day:'Thu', Chicken:30, Lettuce:2.5, Burger:35, Mutton:14 },
  { day:'Fri', Chicken:38, Lettuce:3.2, Burger:44, Mutton:18 },
  { day:'Sat', Chicken:55, Lettuce:4.5, Burger:62, Mutton:25 },
  { day:'Sun', Chicken:24, Lettuce:2.0, Burger:30, Mutton:11 },
];

const DAILY_DATA = [
  { day:'Mon', total:68  },
  { day:'Tue', total:82  },
  { day:'Wed', total:76  },
  { day:'Thu', total:98  },
  { day:'Fri', total:135 },
  { day:'Sat', total:188 },
  { day:'Sun', total:90  },
];

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
  const [logs,     setLogs]     = useState(INIT_LOGS);
  const [showForm, setShowForm] = useState(false);
  const [search,   setSearch]   = useState('');
  const [filterIng,setFilterIng]= useState('all');
  const [toast,    setToast]    = useState('');
  const [form,     setForm]     = useState({ ingredient:'Chicken Patty', quantity:'', reason:'Daily prep', note:'' });

  const showToast = msg => { setToast(msg); setTimeout(()=>setToast(''),3000); };

  const handleLog = () => {
    if (!form.quantity || parseFloat(form.quantity) <= 0) { showToast('Enter valid quantity'); return; }
    const now = new Date();
    const newLog = {
      id: Date.now(),
      ingredient: form.ingredient,
      quantity:   parseFloat(form.quantity),
      unit:       UNITS_MAP[form.ingredient] || 'pcs',
      reason:     form.reason,
      note:       form.note,
      date:       'Today',
      time:       now.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}),
      staff:      'You',
    };
    setLogs(p => [newLog, ...p]);
    setForm({ ingredient:'Chicken Patty', quantity:'', reason:'Daily prep', note:'' });
    setShowForm(false);
    showToast('Usage logged successfully');
  };

  const handleDelete = id => {
    setLogs(p => p.filter(l => l.id !== id));
    showToast('Entry removed');
  };

  const exportCSV = () => {
    const rows = [['Ingredient','Quantity','Unit','Reason','Note','Date','Time','Staff'], ...filtered.map(l=>[l.ingredient,l.quantity,l.unit,l.reason,l.note||'',l.date,l.time,l.staff])];
    const blob = new Blob([rows.map(r=>r.join(',')).join('\n')],{type:'text/csv'});
    const a = document.createElement('a'); a.href=URL.createObjectURL(blob);
    a.download='BlueBliss-Usage-'+new Date().toISOString().split('T')[0]+'.csv'; a.click();
    showToast('Usage report exported');
  };

  const filtered = useMemo(() => {
    let list = [...logs];
    if (search.trim()) list = list.filter(l => l.ingredient.toLowerCase().includes(search.toLowerCase()) || l.reason.toLowerCase().includes(search.toLowerCase()));
    if (filterIng !== 'all') list = list.filter(l => l.ingredient === filterIng);
    return list;
  }, [logs, search, filterIng]);

  const topIngredients = useMemo(() => {
    const map = {};
    logs.forEach(l => { if (!map[l.ingredient]) map[l.ingredient] = 0; map[l.ingredient] += l.quantity; });
    return Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([name,total])=>({name,total}));
  }, [logs]);

  const totalToday = logs.filter(l=>l.date==='Today').reduce((s,l)=>s+l.quantity,0);
  const totalWk    = logs.reduce((s,l)=>s+l.quantity,0);
  const uniqueIngs = [...new Set(logs.map(l=>l.ingredient))].length;
  const maxItem    = topIngredients[0];

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
          {label:'This Week',      value:totalWk.toFixed(1),    sub:'total units this week',  accent:'green',   icon:'📅'},
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
            <BarChart data={DAILY_DATA} margin={{top:5,right:5,left:-25,bottom:0}}>
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
            <div><p className="ut-eyebrow">Trends</p><h3 className="ut-card-title">Top Ingredients Over Week</h3></div>
            <div className="ut-legend">
              {[{n:'Chicken',c:'#10B981'},{n:'Bun',c:'#F2C35A'},{n:'Lettuce',c:'#3B82F6'},{n:'Mutton',c:'#EF4444'}].map((l,i)=>(
                <div key={i} className="ut-leg-item"><span className="ut-leg-dot" style={{background:l.c}}/>{l.n}</div>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={TREND_DATA} margin={{top:5,right:5,left:-25,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(16,185,129,.07)"/>
              <XAxis dataKey="day" tick={{fill:'var(--inv-text-muted)',fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:'var(--inv-text-muted)',fontSize:11}} axisLine={false} tickLine={false}/>
              <Tooltip content={<ChartTip/>}/>
              <Line type="monotone" dataKey="Chicken" stroke="#10B981" strokeWidth={2} dot={false} name="Chicken"/>
              <Line type="monotone" dataKey="Burger"  stroke="#F2C35A" strokeWidth={2} dot={false} name="Bun"/>
              <Line type="monotone" dataKey="Lettuce" stroke="#3B82F6" strokeWidth={2} dot={false} name="Lettuce"/>
              <Line type="monotone" dataKey="Mutton"  stroke="#EF4444" strokeWidth={2} dot={false} name="Mutton"/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="ut-bottom">
        <div className="ut-card ut-top-card">
          <div className="ut-card-hd"><div><p className="ut-eyebrow">Ranking</p><h3 className="ut-card-title">Most Used This Week</h3></div></div>
          <div className="ut-top-list">
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
                {INGREDIENTS.map(i=><option key={i} value={i}>{i}</option>)}
              </select>
            </div>
          </div>
          <div className="ut-log-list">
            {filtered.map((log,i)=>(
              <div key={log.id} className="ut-log-row" style={{animationDelay:i*.04+'s'}}>
                <div className="ut-log-left">
                  <div className="ut-log-ing-dot"/>
                  <div>
                    <p className="ut-log-ing">{log.ingredient}</p>
                    <p className="ut-log-meta">{log.reason}{log.note?' · '+log.note:''}</p>
                  </div>
                </div>
                <div className="ut-log-right">
                  <span className="ut-log-qty">-{log.quantity} {log.unit}</span>
                  <span className="ut-log-time">{log.date} {log.time}</span>
                  <span className="ut-log-staff">{log.staff}</span>
                  <button className="ut-log-del" onClick={()=>handleDelete(log.id)}>✕</button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && <div className="ut-empty"><span>📭</span><p>No usage entries found</p></div>}
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
              <div className="ut-mf"><label>Ingredient</label>
                <select className="ut-minp" value={form.ingredient} onChange={e=>setForm({...form,ingredient:e.target.value})}>
                  {INGREDIENTS.map(i=><option key={i}>{i}</option>)}
                </select>
              </div>
              <div className="ut-mfrow">
                <div className="ut-mf"><label>Quantity Used ({UNITS_MAP[form.ingredient]})</label>
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
                <span className="ut-preview-val">{form.quantity||'?'} {UNITS_MAP[form.ingredient]} of {form.ingredient}</span>
              </div>
            </div>
            <div className="ut-mactions">
              <button className="ut-btn-confirm" onClick={handleLog}>Log Usage</button>
              <button className="ut-btn-cx" onClick={()=>setShowForm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}