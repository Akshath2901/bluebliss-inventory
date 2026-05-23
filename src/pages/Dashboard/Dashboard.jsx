import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { subscribeIngredients, subscribeUsageLogs, subscribeWasteLogs } from '../../lib/firebase.js';
import { calcKitchenHealthScore, calcDailyUsage, daysUntilStockout, getUrgency, topWasteIngredients, generateLocalInsights } from '../../lib/aiEngine.js';
import './Dashboard.css';

const CAT_COLORS = { Proteins:'#DC2626', Vegetables:'#16A34A', Bakery:'#D97706', Dairy:'#2563EB', Condiments:'#7C3AED', Beverages:'#0891B2', Other:'#6B7280' };

function Spinner() {
  return <div style={{width:20,height:20,border:'2px solid var(--inv-border)',borderTopColor:'var(--inv-primary)',borderRadius:'50%',animation:'invSpin .8s linear infinite',flexShrink:0}}/>;
}

function ChartTip({active,payload,label}) {
  if(!active||!payload?.length) return null;
  return <div className="dash-tip"><p className="dash-tip-lbl">{label}</p>{payload.map((p,i)=><p key={i} style={{color:p.color,margin:'2px 0',fontSize:12,fontWeight:600}}>{p.name}: {p.value}</p>)}</div>;
}

// Animated counter
function Counter({to,prefix='',suffix=''}) {
  const [n,setN] = useState(0);
  useEffect(()=>{
    let cur=0; const step=Math.max(1,Math.ceil(to/40));
    const t=setInterval(()=>{cur=Math.min(cur+step,to);setN(cur);if(cur>=to)clearInterval(t);},20);
    return ()=>clearInterval(t);
  },[to]);
  return <>{prefix}{n}{suffix}</>;
}

// Detail Modal for KPI cards
function KPIModal({type, ingredients, usageLogs, onClose}) {
  const navigate = useNavigate();
  const filtered = useMemo(()=>{
    if(type==='total')    return ingredients||[];
    if(type==='healthy')  return (ingredients||[]).filter(i=>i.currentStock>i.minThreshold);
    if(type==='low')      return (ingredients||[]).filter(i=>i.currentStock>0&&i.currentStock<=i.minThreshold);
    if(type==='critical') return (ingredients||[]).filter(i=>i.currentStock<=0);
    return ingredients||[];
  },[type,ingredients]);

  return (
    <div className="dash-modal-overlay" onClick={onClose}>
      <div className="dash-modal" onClick={e=>e.stopPropagation()}>
        <div className="dash-modal-hd">
          <div>
            <p className="dash-eyebrow">{type==='total'?'All Items':type==='healthy'?'Healthy Stock':type==='low'?'Low Stock':'Critical'}</p>
            <h2 className="dash-modal-title">{filtered.length} ingredients</h2>
          </div>
          <button className="dash-modal-x" onClick={onClose}>✕</button>
        </div>
        <div className="dash-modal-list">
          {filtered.map((item,i)=>{
            const pct=Math.min((item.currentStock/item.maxStock)*100,100);
            const s=item.currentStock<=0?'critical':item.currentStock<=item.minThreshold?'low':'good';
            const daily=calcDailyUsage(usageLogs,item.id,14);
            const days=daysUntilStockout(item.currentStock,daily);
            return(
              <div key={i} className="dash-modal-item">
                <div className="dash-modal-item-left">
                  <div className="dash-cat-dot" style={{background:CAT_COLORS[item.category]||'#6B7280'}}/>
                  <div>
                    <p className="dash-modal-ing">{item.name}</p>
                    <p className="dash-modal-meta">{item.category} · {item.currentStock} {item.unit}</p>
                  </div>
                </div>
                <div className="dash-modal-item-right">
                  <div className="dash-modal-bar">
                    <div style={{height:'100%',width:pct+'%',background:s==='critical'?'var(--inv-red)':s==='low'?'var(--inv-orange)':'var(--inv-primary)',borderRadius:2}}/>
                  </div>
                  {daily>0&&days!==Infinity&&<span className="dash-modal-days" style={{color:getUrgency(days).color}}>{days}d left</span>}
                </div>
              </div>
            );
          })}
        </div>
        <button className="dash-modal-view-all" onClick={()=>{navigate('/stock');onClose();}}>View Full Stock Control →</button>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [ingredients, setIngredients] = useState([]);
  const [usageLogs,   setUsageLogs]   = useState([]);
  const [wasteLogs,   setWasteLogs]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [clock,       setClock]       = useState(new Date());
  const [modalType,   setModalType]   = useState(null);

  useEffect(()=>{
    let loaded=0;
    const done=()=>{loaded++;if(loaded>=2)setLoading(false);};
    const u1=subscribeIngredients(d=>{setIngredients(d);done();});
    const u2=subscribeUsageLogs(d=>{setUsageLogs(d);done();});
    const u3=subscribeWasteLogs(setWasteLogs);
    return()=>{u1();u2();u3();};
  },[]);

  useEffect(()=>{const t=setInterval(()=>setClock(new Date()),1000);return()=>clearInterval(t);},[]);

  // Derived stats
  const stats = useMemo(()=>({
    total:    (ingredients||[]).length,
    critical: (ingredients||[]).filter(i=>i.currentStock<=0).length,
    low:      (ingredients||[]).filter(i=>i.currentStock>0&&i.currentStock<=i.minThreshold).length,
    healthy:  (ingredients||[]).filter(i=>i.currentStock>i.minThreshold).length,
    value:    (ingredients||[]).reduce((s,i)=>s+(i.currentStock||0)*(i.costPerUnit||0),0),
  }),[ingredients]);

  const health   = useMemo(()=>{ try { return calcKitchenHealthScore(ingredients||[],usageLogs||[]); } catch(e){ return {score:100,grade:'A',status:'Good',color:'#16A34A',deductions:[]}; } },[ingredients,usageLogs]);
  const alerts   = useMemo(()=>(ingredients||[]).filter(i=>i.currentStock<=i.minThreshold).sort((a,b)=>a.currentStock-b.currentStock),[ingredients]);
  const insights = useMemo(()=>{ try { return generateLocalInsights(ingredients||[],usageLogs||[],wasteLogs||[]); } catch(e){ return []; } },[ingredients,usageLogs,wasteLogs]);
  const topWaste = useMemo(()=>{ try { return topWasteIngredients(wasteLogs||[],5); } catch(e){ return []; } },[wasteLogs]);

  // Usage chart — last 7 days from logs
  const usageChart = useMemo(()=>{
    const days=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const map={};
    days.forEach(d=>map[d]={day:d,used:0,waste:0});
    (usageLogs||[]).slice(0,200).forEach(log=>{
      const ts=log.timestamp?.toDate?log.timestamp.toDate():new Date(log.timestamp||0);
      const day=days[ts.getDay()===0?6:ts.getDay()-1];
      if(day&&log.quantityChange<0) map[day].used+=Math.abs(log.quantityChange||0);
    });
    (wasteLogs||[]).slice(0,100).forEach(log=>{
      const ts=log.timestamp?.toDate?log.timestamp.toDate():new Date(log.timestamp||0);
      const day=days[ts.getDay()===0?6:ts.getDay()-1];
      if(day) map[day].waste+=log.quantity||0;
    });
    return days.map(d=>({...map[d],used:+(map[d]?.used||0).toFixed(1),waste:+(map[d]?.waste||0).toFixed(1)}));
  },[usageLogs,wasteLogs]);

  // Category breakdown
  const catBreakdown = useMemo(()=>{
    const map={};
    (ingredients||[]).forEach(i=>{
      if(!map[i.category])map[i.category]={name:i.category,count:0,value:0};
      map[i.category].count++;
      map[i.category].value+=(i.currentStock||0)*(i.costPerUnit||0);
    });
    return Object.values(map||{}).sort((a,b)=>b.value-a.value);
  },[ingredients]);

  // Per-ingredient predictions for table
  const withPredictions = useMemo(()=>
    (ingredients||[]).map(ing=>{
      const daily=calcDailyUsage(usageLogs,ing.id,14);
      const days=daysUntilStockout(ing.currentStock,daily);
      const urgency=getUrgency(days);
      return{...ing,dailyUsage:daily,daysLeft:days===Infinity?null:days,urgency};
    }).filter(Boolean).sort((a,b)=>{
      if(a.daysLeft===null&&b.daysLeft===null)return 0;
      if(a.daysLeft===null)return 1;
      if(b.daysLeft===null)return -1;
      return a.daysLeft-b.daysLeft;
    })
  ,[ingredients,usageLogs]);

  const greeting=clock.getHours()<12?'Good Morning':clock.getHours()<17?'Good Afternoon':'Good Evening';
  const dateStr=clock.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'});
  const timeStr=clock.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',second:'2-digit'});

  return (
    <div className="dash-page">

      {/* ── Hero ── */}
      <div className="dash-hero">
        <img src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1400&h=220&fit=crop&crop=center" alt="" className="dash-hero-bg"/>
        <div className="dash-hero-grad"/>
        <div className="dash-hero-inner">
          <div className="dash-hero-text">
            <p className="dash-greeting-tag">{greeting} Chef</p>
            <h1 className="dash-hero-title">BlueBliss Kitchen</h1>
            <p className="dash-hero-date">{dateStr}</p>
            <div className="dash-hero-clock">{timeStr}</div>
            <div className="dash-hero-badges">
              <span className="dash-hero-badge badge-green">All Kitchens Open</span>
              {alerts.length>0&&<span className="dash-hero-badge badge-red">{alerts.length} Alert{alerts.length!==1?'s':''}</span>}
            </div>
          </div>
          <div className="dash-health-circle" style={{borderColor:health.color+'50',background:health.color+'12'}}>
            <p className="dash-health-num" style={{color:health.color}}>{loading?'…':health.score}</p>
            <p className="dash-health-grade" style={{color:health.color}}>{health.grade}</p>
            <p className="dash-health-lbl">Health</p>
          </div>
        </div>
      </div>

      <div className="dash-content">

        {/* ── KPI Cards (all clickable) ── */}
        <div className="dash-kpi-row">
          {[
            {label:'Total Items',   value:stats.total,    accent:'primary', key:'total',    sub:'click to view all'},
            {label:'Healthy',       value:stats.healthy,  accent:'green',   key:'healthy',  sub:'above threshold'},
            {label:'Low Stock',     value:stats.low,      accent:'orange',  key:'low',      sub:'need attention'},
            {label:'Critical',      value:stats.critical, accent:'red',     key:'critical', sub:'out of stock'},
            {label:'Stock Value',   value:Math.round(stats.value/1000), prefix:'₹', suffix:'k', accent:'gold', key:'value', sub:'total inventory'},
          ].map((k,i)=>(
            <div key={i}
              className={`dash-kpi kpi-${k.accent} ${k.key!=='value'?'dash-kpi-clickable':''}`}
              style={{animationDelay:i*.08+'s'}}
              onClick={k.key!=='value'?()=>setModalType(k.key):undefined}>
              <div className="dash-kpi-head">
                <p className="dash-kpi-label">{k.label}</p>
                {k.key!=='value'&&<span className="dash-kpi-arrow">›</span>}
              </div>
              {loading
                ? <div style={{height:32,display:'flex',alignItems:'center'}}><Spinner/></div>
                : <p className="dash-kpi-val"><Counter to={k.value} prefix={k.prefix||''} suffix={k.suffix||''}/></p>
              }
              <p className="dash-kpi-sub">{k.sub}</p>
              <div className="dash-kpi-line"><div className="dash-kpi-prog"/></div>
            </div>
          ))}
        </div>

        {/* ── Stock Alerts + AI Insights ── */}
        <div className="dash-mid-row">

          {/* Stock Alerts */}
          <div className="dash-card">
            <div className="dash-card-hd">
              <div><p className="dash-eyebrow">Live Alerts</p><h3 className="dash-card-title">Stock Alerts</h3></div>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                {loading&&<Spinner/>}
                {alerts.length>0&&<span className="dash-alert-count">{alerts.length}</span>}
                <button className="dash-card-link" onClick={()=>navigate('/stock')}>View All →</button>
              </div>
            </div>
            <div className="dash-alert-list">
              {!loading&&alerts.length===0&&(
                <div className="dash-empty-state"><p style={{fontSize:28,marginBottom:8}}>✅</p><p>All stock levels healthy</p></div>
              )}
              {alerts.slice(0,6).map((item,i)=>{
                const s=item.currentStock<=0?'critical':'low';
                const daily=calcDailyUsage(usageLogs,item.id,14);
                const days=daysUntilStockout(item.currentStock,daily);
                const urg=getUrgency(days);
                return(
                  <div key={i} className={`dash-alert-item alert-${s}`}
                    onClick={()=>navigate('/stock')}
                    style={{cursor:'pointer'}}>
                    <div className="dash-alert-left">
                      <span className={`dash-alert-dot adot-${s}`}/>
                      <div>
                        <p className="dash-alert-name">{item.name}</p>
                        <div className="dash-alert-details">
                          <span className="dash-alert-stock">{item.currentStock} {item.unit} remaining</span>
                          {daily>0&&days!==Infinity&&<span className="dash-alert-days" style={{color:urg.color}}>~{days}d left</span>}
                          {item.currentStock<=0&&<span className="dash-alert-days" style={{color:'var(--inv-red)'}}>OUT OF STOCK</span>}
                        </div>
                      </div>
                    </div>
                    <button className="dash-order-btn" onClick={e=>{e.stopPropagation();navigate('/purchase-orders');}}>Order</button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI Insights Widget */}
          <div className="dash-card dash-ai-widget">
            <div className="dash-card-hd">
              <div><p className="dash-eyebrow">Intelligence</p><h3 className="dash-card-title">AI Insights</h3></div>
              <button className="dash-card-link" onClick={()=>navigate('/ai')}>Full Report →</button>
            </div>
            <div className="dash-health-row">
              <div className="dash-health-gauge">
                <svg viewBox="0 0 100 60" className="dash-gauge-svg">
                  <path d="M10 50 A40 40 0 0 1 90 50" fill="none" stroke="var(--inv-border)" strokeWidth="8" strokeLinecap="round"/>
                  <path d="M10 50 A40 40 0 0 1 90 50" fill="none"
                    stroke={health.color} strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={`${(health.score/100)*125.6} 125.6`}/>
                  <text x="50" y="46" textAnchor="middle" fontSize="18" fontWeight="700" fill={health.color}>{health.score}</text>
                  <text x="50" y="56" textAnchor="middle" fontSize="7" fill="var(--inv-text-muted)">/ 100</text>
                </svg>
                <p className="dash-health-status" style={{color:health.color}}>{health.status}</p>
              </div>
              <div className="dash-health-issues">
                {(health.deductions||[]).length===0
                  ? <p className="dash-health-ok">All systems healthy</p>
                  : (health.deductions||[]).map((d,i)=><p key={i} className="dash-health-issue">• {d}</p>)
                }
              </div>
            </div>
            <div className="dash-insights-list">
              {insights.slice(0,3).map((ins,i)=>(
                <div key={i} className={`dash-insight-row ins-${ins.type}`}
                  onClick={()=>navigate(ins.actionPath)} style={{cursor:'pointer'}}>
                  <span className="dash-ins-icon">{ins.icon}</span>
                  <div>
                    <p className="dash-ins-title">{ins.title}</p>
                    <p className="dash-ins-body">{ins.body}</p>
                  </div>
                </div>
              ))}
              {insights.length===0&&!loading&&<p style={{fontSize:12,color:'var(--inv-text-muted)',padding:'8px 0'}}>No issues detected. Kitchen running smoothly.</p>}
            </div>
          </div>
        </div>

        {/* ── Charts Row ── */}
        <div className="dash-chart-row">

          {/* Usage vs Waste */}
          <div className="dash-card">
            <div className="dash-card-hd">
              <div><p className="dash-eyebrow">This Week</p><h3 className="dash-card-title">Usage vs Waste</h3></div>
              <div style={{display:'flex',gap:12,alignItems:'center',fontSize:11,color:'var(--inv-text-muted)'}}>
                <span><span style={{display:'inline-block',width:8,height:8,borderRadius:'50%',background:'var(--inv-primary)',marginRight:4}}/>Used</span>
                <span><span style={{display:'inline-block',width:8,height:8,borderRadius:'50%',background:'var(--inv-red)',marginRight:4}}/>Waste</span>
              </div>
            </div>
            {usageChart.every(d=>d.used===0)&&!loading
              ? <div className="dash-empty-state" style={{height:160}}><p style={{fontSize:11,color:'var(--inv-text-muted)'}}>Log usage entries to see chart data</p></div>
              : <ResponsiveContainer width="100%" height={170}>
                  <BarChart data={usageChart} margin={{top:4,right:4,left:-25,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(22,163,74,.06)" vertical={false}/>
                    <XAxis dataKey="day" tick={{fill:'var(--inv-text-muted)',fontSize:10}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fill:'var(--inv-text-muted)',fontSize:10}} axisLine={false} tickLine={false}/>
                    <Tooltip content={<ChartTip/>}/>
                    <Bar dataKey="used"  fill="var(--inv-primary)" radius={[4,4,0,0]} maxBarSize={20} name="Used"/>
                    <Bar dataKey="waste" fill="var(--inv-red)"     radius={[4,4,0,0]} maxBarSize={20} name="Waste"/>
                  </BarChart>
                </ResponsiveContainer>
            }
            <button className="dash-card-footer-link" onClick={()=>navigate('/usage')}>View Usage Tracker →</button>
          </div>

          {/* Category Breakdown */}
          <div className="dash-card">
            <div className="dash-card-hd">
              <div><p className="dash-eyebrow">Breakdown</p><h3 className="dash-card-title">Stock by Category</h3></div>
              <button className="dash-card-link" onClick={()=>navigate('/cost')}>Cost Analysis →</button>
            </div>
            <div className="dash-cat-list">
              {loading&&[1,2,3,4].map(i=>(
                <div key={i} className="dash-cat-row">
                  <div style={{width:10,height:10,borderRadius:'50%',background:'var(--inv-border)',flexShrink:0}}/>
                  <div style={{flex:1,height:12,background:'var(--inv-border)',borderRadius:4}}/>
                </div>
              ))}
              {!loading&&catBreakdown.map((cat,i)=>{
                const maxVal=catBreakdown[0]?.value||1;
                return(
                  <div key={i} className="dash-cat-row" style={{animationDelay:i*.08+'s'}}>
                    <div className="dash-cat-dot-lg" style={{background:CAT_COLORS[cat.name]||'#6B7280'}}/>
                    <span className="dash-cat-name">{cat.name}</span>
                    <span className="dash-cat-count">{cat.count}</span>
                    <div className="dash-cat-bar">
                      <div className="dash-cat-fill" style={{width:(cat.value/maxVal*100)+'%',background:CAT_COLORS[cat.name]||'#6B7280',animationDelay:i*.1+'s'}}/>
                    </div>
                    <span className="dash-cat-val">₹{Math.round(cat.value/1000)}k</span>
                  </div>
                );
              })}
              {!loading&&catBreakdown.length===0&&<p style={{fontSize:12,color:'var(--inv-text-muted)',textAlign:'center',padding:'20px 0'}}>No ingredients added yet</p>}
            </div>
          </div>
        </div>

        {/* ── Waste Analysis ── */}
        {(topWaste.length>0||wasteLogs.length>0)&&(
          <div className="dash-card">
            <div className="dash-card-hd">
              <div><p className="dash-eyebrow">Waste Intelligence</p><h3 className="dash-card-title">Top Waste Offenders</h3></div>
              <button className="dash-card-link" onClick={()=>navigate('/waste')}>Waste Log →</button>
            </div>
            <div className="dash-waste-grid">
              {topWaste.map((item,i)=>(
                <div key={i} className="dash-waste-card" onClick={()=>navigate('/waste')} style={{cursor:'pointer',animationDelay:i*.06+'s'}}>
                  <div className="dash-waste-rank">#{i+1}</div>
                  <p className="dash-waste-name">{item.name}</p>
                  <p className="dash-waste-cost">₹{item.cost.toFixed(0)}</p>
                  <p className="dash-waste-detail">{item.count} incidents · {item.qty.toFixed(1)} units</p>
                </div>
              ))}
              {topWaste.length===0&&wasteLogs.length===0&&(
                <div style={{gridColumn:'1/-1',textAlign:'center',padding:'24px',color:'var(--inv-text-muted)',fontSize:12}}>
                  No waste logs yet. Add entries in the Waste Log section.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Predictions Table ── */}
        <div className="dash-card">
          <div className="dash-card-hd">
            <div><p className="dash-eyebrow">AI Predictions</p><h3 className="dash-card-title">Stock Forecast</h3></div>
            <button className="dash-card-link" onClick={()=>navigate('/ai')}>Full AI Report →</button>
          </div>
          {loading
            ? <div style={{textAlign:'center',padding:32}}><Spinner/></div>
            : withPredictions.length===0
              ? <div className="dash-empty-state"><p>No ingredients found. Add ingredients to see predictions.</p></div>
              : <div className="dash-pred-table-wrap">
                  <table className="dash-pred-table">
                    <thead>
                      <tr>
                        <th>Ingredient</th>
                        <th>Current Stock</th>
                        <th>Daily Usage</th>
                        <th>Days Left</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {withPredictions.slice(0,8).map((item,i)=>{
                        const s=item.currentStock<=0?'critical':item.currentStock<=item.minThreshold?'low':'good';
                        return(
                          <tr key={i} className={`dash-pred-tr ptr-${s}`}
                            onClick={()=>navigate('/stock')} style={{cursor:'pointer'}}>
                            <td>
                              <div style={{display:'flex',alignItems:'center',gap:8}}>
                                <div style={{width:8,height:8,borderRadius:'50%',background:CAT_COLORS[item.category]||'#6B7280',flexShrink:0}}/>
                                <span style={{fontWeight:600,color:'var(--inv-text)',fontSize:13}}>{item.name}</span>
                              </div>
                            </td>
                            <td>
                              <div style={{display:'flex',alignItems:'center',gap:8}}>
                                <div style={{flex:1,height:4,background:'var(--inv-border)',borderRadius:2,overflow:'hidden',minWidth:50}}>
                                  <div style={{height:'100%',width:Math.min((item.currentStock/item.maxStock)*100,100)+'%',background:s==='critical'?'var(--inv-red)':s==='low'?'var(--inv-orange)':'var(--inv-primary)',borderRadius:2}}/>
                                </div>
                                <span style={{fontSize:12,fontWeight:600,minWidth:50}}>{item.currentStock} {item.unit}</span>
                              </div>
                            </td>
                            <td style={{fontSize:12,color:'var(--inv-text-muted)'}}>
                              {item.dailyUsage>0?item.dailyUsage+' '+item.unit+'/day':'No data'}
                            </td>
                            <td>
                              {item.daysLeft===null
                                ? <span style={{fontSize:11,color:'var(--inv-text-muted)'}}>—</span>
                                : <span style={{fontSize:13,fontWeight:700,color:item.urgency.color}}>{item.daysLeft}d</span>
                              }
                            </td>
                            <td>
                              <span className={`dash-status-chip chip-${s}`}>
                                {s==='critical'?'Critical':s==='low'?'Low Stock':'Healthy'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {withPredictions.length>8&&(
                    <button className="dash-show-more" onClick={()=>navigate('/stock')}>
                      Show {withPredictions.length-8} more in Stock Control →
                    </button>
                  )}
                </div>
          }
        </div>

        {/* ── Quick Actions ── */}
        <div className="dash-card">
          <div className="dash-card-hd"><div><p className="dash-eyebrow">Shortcuts</p><h3 className="dash-card-title">Quick Actions</h3></div></div>
          <div className="dash-actions-grid">
            {[
              {label:'Update Stock',  sub:'Adjust levels',      path:'/stock',           accent:'primary'},
              {label:'Log Waste',     sub:'Record spoilage',     path:'/waste',           accent:'red'},
              {label:'Create PO',     sub:'Order supplies',      path:'/purchase-orders', accent:'gold'},
              {label:'Log Usage',     sub:'Track consumption',   path:'/usage',           accent:'blue'},
              {label:'AI Insights',   sub:'Smart analysis',      path:'/ai',              accent:'purple'},
              {label:'Reports',       sub:'Analytics & exports', path:'/reports',         accent:'primary'},
            ].map((a,i)=>(
              <button key={i} className={`dash-action-btn abtn-${a.accent}`}
                style={{animationDelay:i*.06+'s'}} onClick={()=>navigate(a.path)}>
                <p className="dash-action-label">{a.label}</p>
                <p className="dash-action-sub">{a.sub}</p>
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* KPI Detail Modal */}
      {modalType&&modalType!=='value'&&(
        <KPIModal type={modalType} ingredients={ingredients} usageLogs={usageLogs} onClose={()=>setModalType(null)}/>
      )}
    </div>
  );
}