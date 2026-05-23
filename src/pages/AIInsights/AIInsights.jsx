import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useAIData } from '../../hooks/useAIData.js';
import './AIInsights.css';

const WEEKLY_TREND_MOCK = [
  {day:'Mon',predicted:68,actual:72},{day:'Tue',predicted:82,actual:78},
  {day:'Wed',predicted:76,actual:81},{day:'Thu',predicted:98,actual:95},
  {day:'Fri',predicted:135,actual:141},{day:'Sat',predicted:188,actual:null},{day:'Sun',predicted:95,actual:null},
];

function ChartTip({active,payload,label}) {
  if(!active||!payload?.length) return null;
  return <div className="ai-tip"><p className="ai-tip-lbl">{label}</p>{payload.map((p,i)=><p key={i} style={{color:p.color,margin:'2px 0',fontSize:12,fontWeight:600}}>{p.name}: {p.value??'—'}</p>)}</div>;
}

export default function AIInsights() {
  const [activeTab, setActiveTab]     = useState('overview');
  const [generating, setGenerating]   = useState(false);
  const [generated,  setGenerated]    = useState(false);
  const [aiSummary,  setAiSummary]    = useState('');
  const navigate = useNavigate();

  const {
    healthScore, predictions, reorderSuggestions,
    anomalies, wasteRate, topWaste, insights,
    ingredients, usageLogs, loading,
  } = useAIData();

  const handleGenerate = async () => {
    setGenerating(true);
    // Simulate processing — in production this calls HuggingFace
    await new Promise(r => setTimeout(r, 2000));

    const critical = predictions.filter(p => p.daysLeft !== null && p.daysLeft <= 2);
    const topIng   = predictions[0];

    const summary = [
      `Kitchen Health Score: ${healthScore.score}/100 (${healthScore.status}).`,
      critical.length
        ? `CRITICAL: ${critical.map(p=>p.name).join(', ')} will run out within 2 days. Order immediately.`
        : 'All critical items are currently stocked.',
      topIng?.daysLeft !== null
        ? `Most urgent reorder: ${topIng.name} — ${topIng.daysLeft} days remaining at ${topIng.dailyUsage} ${topIng.unit}/day average usage.`
        : '',
      `Current waste rate: ${wasteRate}%. ${wasteRate > 10 ? 'Above recommended 8% — review storage procedures.' : 'Within acceptable range.'}`,
      reorderSuggestions.length
        ? `${reorderSuggestions.filter(r=>r.urgency.level==='critical'||r.urgency.level==='urgent').length} items need reordering this week.`
        : 'No urgent reorders needed.',
    ].filter(Boolean).join('\n\n');

    setAiSummary(summary);
    setGenerated(true);
    setGenerating(false);
  };

  const exportReport = () => {
    const lines = [
      'BLUEBLISS INVENTORY AI REPORT',
      `Generated: ${new Date().toLocaleString('en-IN')}`,
      `Kitchen Health Score: ${healthScore.score}/100`,
      '',
      '=== STOCK PREDICTIONS ===',
      ...predictions.filter(p=>p.daysLeft!==null).map(p=>`${p.name}: ${p.daysLeft} days left (${p.dailyUsage} ${p.unit}/day)`),
      '',
      '=== REORDER SUGGESTIONS ===',
      ...reorderSuggestions.map(r=>`${r.ingredient}: Order ${r.orderQty} ${r.unit} from ${r.supplier} — ${r.reorderDate}`),
      '',
      '=== ANOMALIES ===',
      ...anomalies.map(a=>`${a.ingredient}: ${a.pctChange>0?'+':''}${a.pctChange}% vs normal`),
    ];
    const blob = new Blob([lines.join('\n')],{type:'text/plain'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);
    a.download=`BlueBliss-AI-Report-${new Date().toISOString().split('T')[0]}.txt`;a.click();
  };

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'60vh',flexDirection:'column',gap:16}}>
      <div style={{width:28,height:28,border:'2px solid var(--inv-border)',borderTopColor:'var(--inv-primary)',borderRadius:'50%',animation:'invSpin .8s linear infinite'}}/>
      <p style={{fontSize:13,color:'var(--inv-text-muted)'}}>Analyzing your inventory data…</p>
    </div>
  );

  return (
    <div className="ai-page">
      <div className="ai-header">
        <div className="ai-header-left">
          <div className="ai-brain-orb">🧠</div>
          <div>
            <p className="ai-eyebrow">Intelligence Layer</p>
            <h1 className="ai-title">AI Insights</h1>
            <p className="ai-sub">Real-time analysis · {ingredients.length} ingredients · {usageLogs.length} log entries</p>
          </div>
        </div>
        <div className="ai-header-actions">
          {generated && <button className="ai-btn-export" onClick={exportReport}>Export Report</button>}
          <button className={'ai-btn-generate'+(generating?' loading':'')} onClick={handleGenerate} disabled={generating}>
            {generating ? 'Analyzing…' : generated ? 'Regenerate' : 'Generate AI Report'}
          </button>
        </div>
      </div>

      {/* Health Score Banner */}
      <div className="ai-health-banner" style={{borderColor:healthScore.color+'30',background:healthScore.color+'08'}}>
        <div className="ai-health-left">
          <div className="ai-health-score" style={{color:healthScore.color,borderColor:healthScore.color+'30',background:healthScore.color+'10'}}>
            {healthScore.score}
          </div>
          <div>
            <p className="ai-health-grade" style={{color:healthScore.color}}>Grade {healthScore.grade} — {healthScore.status}</p>
            <p className="ai-health-sub">Kitchen Health Score based on stock levels and usage patterns</p>
          </div>
        </div>
        <div className="ai-health-right">
          {healthScore.deductions.map((d,i) => (
            <span key={i} className="ai-health-issue">{d}</span>
          ))}
          {healthScore.deductions.length === 0 && (
            <span className="ai-health-ok">All systems healthy</span>
          )}
        </div>
      </div>

      {/* Quick Insights */}
      {insights.length > 0 && (
        <div className="ai-insights-strip">
          {insights.map((insight, i) => (
            <div key={i} className={`ai-insight-card ai-ins-${insight.type}`} style={{animationDelay:i*.07+'s'}}>
              <div className="ai-ins-head">
                <span className="ai-ins-icon">{insight.icon}</span>
                <p className="ai-ins-title">{insight.title}</p>
              </div>
              <p className="ai-ins-body">{insight.body}</p>
              <button className="ai-ins-action" onClick={()=>navigate(insight.actionPath)}>
                {insight.action} →
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="ai-tabs">
        {[
          {k:'overview',  l:'Overview'},
          {k:'predictions',l:'Stock Predictions'},
          {k:'reorder',   l:'Reorder Suggestions'},
          {k:'anomalies', l:'Anomalies'},
          {k:'trend',     l:'Trends'},
          ...(generated ? [{k:'summary',l:'AI Summary'}] : []),
        ].map(t=>(
          <button key={t.k} className={'ai-tab'+(activeTab===t.k?' active':'')} onClick={()=>setActiveTab(t.k)}>{t.l}</button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {activeTab==='overview'&&(
        <div className="ai-section">
          <div className="ai-overview-grid">
            {[
              {label:'Total Ingredients',  value:ingredients.length,                                     sub:'tracked'},
              {label:'At Risk (≤3 days)',  value:predictions.filter(p=>p.daysLeft!==null&&p.daysLeft<=3).length, sub:'need immediate action', color:'var(--inv-red)'},
              {label:'Need Reorder',       value:reorderSuggestions.filter(r=>r.urgency.level!=='ok').length,     sub:'this week'},
              {label:'Anomalies Detected', value:anomalies.length,                                       sub:'unusual usage patterns', color:anomalies.length?'var(--inv-orange)':undefined},
              {label:'Waste Rate',         value:wasteRate+'%',                                           sub:'last 30 days', color:wasteRate>10?'var(--inv-red)':undefined},
            ].map((stat,i)=>(
              <div key={i} className="ai-ov-card" style={{animationDelay:i*.06+'s'}}>
                <p className="ai-ov-val" style={{color:stat.color||'var(--inv-text)'}}>{stat.value}</p>
                <p className="ai-ov-label">{stat.label}</p>
                <p className="ai-ov-sub">{stat.sub}</p>
              </div>
            ))}
          </div>

          {topWaste.length > 0 && (
            <div className="ai-card">
              <div className="ai-card-hd">
                <div><p className="ai-eyebrow">Waste Intelligence</p><h3 className="ai-card-title">Top Waste Offenders</h3></div>
              </div>
              <div className="ai-waste-list">
                {topWaste.map((item,i) => (
                  <div key={i} className="ai-waste-row">
                    <span className="ai-waste-rank">#{i+1}</span>
                    <span className="ai-waste-name">{item.name}</span>
                    <div className="ai-waste-bar">
                      <div className="ai-waste-fill" style={{width:(item.cost/topWaste[0].cost*100)+'%',animationDelay:i*.1+'s'}}/>
                    </div>
                    <span className="ai-waste-cost">₹{item.cost.toFixed(0)}</span>
                    <span className="ai-waste-count">{item.count} incidents</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PREDICTIONS ── */}
      {activeTab==='predictions'&&(
        <div className="ai-section">
          <div className="ai-info-banner">
            <span>📊</span>
            <p>Predictions based on average daily usage over the last 14 days. Items with no usage history show as "No data".</p>
          </div>
          <div className="ai-card">
            <div className="ai-pred-list">
              {predictions.map((p,i) => (
                <div key={p.id} className={`ai-pred-row pred-${p.daysLeft===null?'ok':p.urgency.level}`} style={{animationDelay:i*.05+'s'}}>
                  <div className="ai-pred-left">
                    <div className={'ai-pred-dot pdot-'+(p.daysLeft===null?'ok':p.urgency.level)} style={{background:p.daysLeft===null?'var(--inv-border-md)':p.urgency.color}}/>
                    <div>
                      <p className="ai-pred-name">{p.name}</p>
                      <p className="ai-pred-meta">{p.dailyUsage?p.dailyUsage+' '+p.unit+'/day':'No usage data'}</p>
                    </div>
                  </div>
                  <div className="ai-pred-center">
                    {p.daysLeft !== null ? (
                      <>
                        <div className="ai-days-bar">
                          <div className={`ai-days-fill dfill-${p.urgency.level}`}
                            style={{width:Math.min((p.daysLeft/14)*100,100)+'%',background:p.urgency.color,animationDelay:i*.05+'s'}}/>
                        </div>
                        <p className="ai-pred-action" style={{color:p.urgency.color}}>{p.urgency.label}</p>
                      </>
                    ) : (
                      <p className="ai-pred-action">No usage logged yet</p>
                    )}
                  </div>
                  <div className="ai-pred-right">
                    {p.daysLeft !== null ? (
                      <>
                        <p className="ai-days-num" style={{color:p.urgency.color}}>{p.daysLeft}</p>
                        <p className="ai-days-label">days left</p>
                      </>
                    ) : (
                      <p style={{fontSize:11,color:'var(--inv-text-muted)',textAlign:'center'}}>—</p>
                    )}
                  </div>
                </div>
              ))}
              {predictions.length===0&&<p style={{textAlign:'center',padding:'40px',color:'var(--inv-text-muted)'}}>No ingredients found. Add ingredients to see predictions.</p>}
            </div>
          </div>
        </div>
      )}

      {/* ── REORDER SUGGESTIONS ── */}
      {activeTab==='reorder'&&(
        <div className="ai-section">
          <div className="ai-info-banner">
            <span>🛒</span>
            <p>Suggestions based on current stock, daily usage rate, and supplier lead times. Quantities calculated for 2 weeks supply.</p>
          </div>
          {reorderSuggestions.length === 0 ? (
            <div className="ai-card" style={{textAlign:'center',padding:'48px'}}>
              <p style={{fontSize:32,marginBottom:12}}>✅</p>
              <p style={{fontWeight:600,color:'var(--inv-text)'}}>All stock levels are healthy</p>
              <p style={{fontSize:13,color:'var(--inv-text-muted)',marginTop:4}}>No reorders needed right now</p>
            </div>
          ) : (
            <div className="ai-reorder-grid">
              {reorderSuggestions.map((r,i) => (
                <div key={i} className={`ai-card ai-reorder-card rcard-${r.urgency.level==='critical'||r.urgency.level==='out'?'today':'this-week'}`} style={{animationDelay:i*.06+'s'}}>
                  <div className="ai-reorder-head">
                    <span className={`ai-urgency-badge ubadge-${r.urgency.level==='critical'||r.urgency.level==='out'?'today':'this-week'}`} style={{background:r.urgency.color+'15',color:r.urgency.color,borderColor:r.urgency.color+'30'}}>
                      {r.urgency.label}
                    </span>
                  </div>
                  <h3 className="ai-reorder-name">{r.ingredient}</h3>
                  <div className="ai-reorder-details">
                    <div className="ai-rd-item"><p className="ai-rd-lbl">Order Qty</p><p className="ai-rd-val">{r.orderQty} {r.unit}</p></div>
                    <div className="ai-rd-item"><p className="ai-rd-lbl">Supplier</p><p className="ai-rd-val">{r.supplier}</p></div>
                    <div className="ai-rd-item"><p className="ai-rd-lbl">Est. Cost</p><p className="ai-rd-val ai-rd-cost">₹{r.orderCost.toLocaleString('en-IN')}</p></div>
                    <div className="ai-rd-item"><p className="ai-rd-lbl">Days Left</p><p className="ai-rd-val" style={{color:r.urgency.color}}>{r.daysLeft??'Out'}</p></div>
                    <div className="ai-rd-item"><p className="ai-rd-lbl">Daily Usage</p><p className="ai-rd-val">{r.dailyUsage} {r.unit}</p></div>
                    <div className="ai-rd-item"><p className="ai-rd-lbl">Order By</p><p className="ai-rd-val" style={{color:r.urgency.color,fontWeight:700}}>{r.reorderDate}</p></div>
                  </div>
                  <button className="ai-rd-order-btn" onClick={()=>navigate('/purchase-orders')}>Create Purchase Order →</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ANOMALIES ── */}
      {activeTab==='anomalies'&&(
        <div className="ai-section">
          <div className="ai-info-banner">
            <span>🔍</span>
            <p>Anomalies detected using Z-score analysis. A spike is flagged when usage deviates more than 2 standard deviations from the 14-day average.</p>
          </div>
          {anomalies.length === 0 ? (
            <div className="ai-card" style={{textAlign:'center',padding:'48px'}}>
              <p style={{fontSize:32,marginBottom:12}}>✅</p>
              <p style={{fontWeight:600,color:'var(--inv-text)'}}>No anomalies detected</p>
              <p style={{fontSize:13,color:'var(--inv-text-muted)',marginTop:4}}>All usage patterns are within normal range</p>
            </div>
          ) : anomalies.map((a,i)=>(
            <div key={i} className={`ai-card ai-anomaly-card anom-${a.severity}`} style={{animationDelay:i*.07+'s'}}>
              <div className="ai-anom-head">
                <div className="ai-anom-left">
                  <span className={`ai-anom-badge abadge-${a.severity}`}>{a.severity==='high'?'High Alert':'Medium'}</span>
                  <h3 className="ai-anom-name">{a.ingredient}</h3>
                  <span className="ai-anom-date">{a.date}</span>
                </div>
                <div className="ai-anom-spike" style={{color:a.severity==='high'?'var(--inv-red)':'var(--inv-orange)'}}>
                  {a.pctChange>0?'+':''}{a.pctChange}%
                </div>
              </div>
              <div className="ai-anom-bars">
                <div className="ai-anom-bar-row">
                  <span className="ai-anom-bar-lbl">Normal</span>
                  <div className="ai-anom-bar"><div className="ai-anom-fill normal-fill" style={{width:(a.normal/a.actual*100)+'%'}}/></div>
                  <span className="ai-anom-bar-val">{a.normal} units</span>
                </div>
                <div className="ai-anom-bar-row">
                  <span className="ai-anom-bar-lbl">Actual</span>
                  <div className="ai-anom-bar"><div className={`ai-anom-fill afill-${a.severity}`} style={{width:'100%'}}/></div>
                  <span className="ai-anom-bar-val">{a.actual} units</span>
                </div>
              </div>
              <div className="ai-anom-reason">
                <span>💡</span>
                <p>Usage was {Math.abs(a.pctChange)}% {a.direction === 'high' ? 'above' : 'below'} the {Math.round(a.normal * 14)}-unit 14-day average. Z-score: {a.zScore}. Verify with kitchen staff if this was intentional.</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── TREND ── */}
      {activeTab==='trend'&&(
        <div className="ai-section">
          <div className="ai-card">
            <div className="ai-card-hd">
              <div><p className="ai-eyebrow">Forecast</p><h3 className="ai-card-title">Usage Trend Forecast</h3></div>
              <span className="ai-model-badge">Statistical Model</span>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={WEEKLY_TREND_MOCK} margin={{top:5,right:10,left:-20,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(22,163,74,.06)" vertical={false}/>
                <XAxis dataKey="day" tick={{fill:'var(--inv-text-muted)',fontSize:11}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:'var(--inv-text-muted)',fontSize:11}} axisLine={false} tickLine={false}/>
                <Tooltip content={<ChartTip/>}/>
                <Line type="monotone" dataKey="predicted" stroke="var(--inv-primary)" strokeWidth={2} strokeDasharray="5 3" dot={{r:3}} name="Predicted"/>
                <Line type="monotone" dataKey="actual"    stroke="var(--inv-gold)"    strokeWidth={2.5} dot={{r:4}} name="Actual"/>
              </LineChart>
            </ResponsiveContainer>
            <div className="ai-trend-legend">
              <div className="ai-tl-item"><span className="ai-tl-line dashed"/><span>Predicted</span></div>
              <div className="ai-tl-item"><span className="ai-tl-line solid"/><span>Actual</span></div>
            </div>
            <div className="ai-accuracy-banner">
              <span className="ai-acc-icon">🎯</span>
              <div>
                <p className="ai-acc-title">Prediction accuracy improves with more usage data</p>
                <p className="ai-acc-sub">Currently using {usageLogs.length} log entries. Accuracy increases significantly after 30+ entries per ingredient.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── AI SUMMARY ── */}
      {activeTab==='summary'&&generated&&(
        <div className="ai-card ai-summary-card">
          <div className="ai-card-hd">
            <div><p className="ai-eyebrow">Generated Report</p><h3 className="ai-card-title">AI Kitchen Intelligence Summary</h3></div>
            <span className="ai-model-badge">AI Generated</span>
          </div>
          <div className="ai-summary-body">
            <div className="ai-summary-avatar">🧠</div>
            <p className="ai-summary-text">{aiSummary}</p>
          </div>
          <div className="ai-summary-meta">
            <span>Generated: {new Date().toLocaleString('en-IN',{hour:'2-digit',minute:'2-digit'})}</span>
            <span>Based on: {ingredients.length} ingredients, {usageLogs.length} usage logs</span>
            <span>Health Score: {healthScore.score}/100</span>
          </div>
        </div>
      )}
    </div>
  );
}