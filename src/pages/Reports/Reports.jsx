import React, { useState } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import './Reports.css';

const MONTHLY_USAGE = [
  {month:'Jan',used:1240,waste:89,cost:48200},{month:'Feb',used:1380,waste:102,cost:53100},
  {month:'Mar',used:1520,waste:118,cost:61400},{month:'Apr',used:1690,waste:134,cost:68900},
  {month:'May',used:1820,waste:141,cost:74200},
];
const WEEKLY_USAGE = [
  {week:'W1',used:380,waste:28,cost:15200},{week:'W2',used:420,waste:32,cost:17400},
  {week:'W3',used:510,waste:41,cost:21300},{week:'W4',used:490,waste:38,cost:19800},
];
const DAILY_USAGE = [
  {day:'Mon',used:68,waste:5,cost:2800},{day:'Tue',used:82,waste:6,cost:3400},
  {day:'Wed',used:76,waste:7,cost:3100},{day:'Thu',used:98,waste:8,cost:4100},
  {day:'Fri',used:135,waste:11,cost:5600},{day:'Sat',used:188,waste:15,cost:7800},
  {day:'Sun',used:90,waste:7,cost:3700},
];
const TOP_CONSUMED = [
  {name:'Chicken Patty',total:312,unit:'pcs',cost:14040},
  {name:'Burger Bun',   total:298,unit:'pcs',cost:2384},
  {name:'Lettuce',      total:48, unit:'kg', cost:3840},
  {name:'Tomato',       total:42, unit:'kg', cost:1680},
  {name:'Cheese Slice', total:186,unit:'pcs',cost:2790},
];
const WASTE_BY_REASON = [
  {reason:'Spoilage',      cost:1240,count:8},
  {reason:'Expired',       cost:890, count:5},
  {reason:'Overproduction',cost:620, count:4},
  {reason:'Dropped',       cost:340, count:3},
  {reason:'Other',         cost:210, count:2},
];
const BRAND_USAGE = [
  {name:'Shrimmers',   value:48,color:'#F2C35A'},
  {name:'Peppanizze',  value:31,color:'#10B981'},
  {name:'UrbanWrap',   value:21,color:'#3B82F6'},
];
const STOCK_TREND = [
  {month:'Jan',healthy:18,low:4,critical:2},{month:'Feb',healthy:20,low:3,critical:1},
  {month:'Mar',healthy:19,low:4,critical:1},{month:'Apr',healthy:22,low:2,critical:0},
  {month:'May',healthy:20,low:3,critical:1},
];

const PIE_COLORS = ['#EF4444','#F59E0B','#10B981','#3B82F6','#8B5CF6'];

function ChartTip({active,payload,label}) {
  if(!active||!payload?.length) return null;
  return (
    <div className="rp-tip">
      <p className="rp-tip-lbl">{label}</p>
      {payload.map((p,i)=>(
        <p key={i} style={{color:p.color,margin:'2px 0',fontSize:12,fontWeight:700}}>
          {p.name}: {typeof p.value==='number'?p.value:p.value}
        </p>
      ))}
    </div>
  );
}

export default function Reports() {
  const [period, setPeriod] = useState('weekly');
  const [activeTab, setActiveTab] = useState('usage');

  const chartData = period==='daily'?DAILY_DATA:period==='weekly'?WEEKLY_USAGE:MONTHLY_USAGE;
  const DAILY_DATA = DAILY_USAGE;
  const xKey = period==='daily'?'day':period==='weekly'?'week':'month';

  const exportCSV = (data, filename, headers) => {
    const rows = [headers, ...data.map(d=>Object.values(d))];
    const blob = new Blob([rows.map(r=>r.join(',')).join('\n')],{type:'text/csv'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'BlueBliss-'+filename+'-'+new Date().toISOString().split('T')[0]+'.csv';
    a.click();
  };

  const totalUsed  = DAILY_USAGE.reduce((s,d)=>s+d.used,0);
  const totalWaste = DAILY_USAGE.reduce((s,d)=>s+d.waste,0);
  const totalCost  = DAILY_USAGE.reduce((s,d)=>s+d.cost,0);
  const wasteRate  = ((totalWaste/totalUsed)*100).toFixed(1);

  return (
    <div className="rp-page">
      <div className="rp-header">
        <div><p className="rp-eyebrow">Analytics</p><h1 className="rp-title">Reports & Trends</h1><p className="rp-sub">Comprehensive inventory analytics and exportable reports</p></div>
        <div className="rp-period-tabs">
          {['daily','weekly','monthly'].map(p=>(
            <button key={p} className={'rp-ptab'+(period===p?' active':'')} onClick={()=>setPeriod(p)}>
              {p.charAt(0).toUpperCase()+p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="rp-kpis">
        {[
          {l:'Total Consumed', v:totalUsed,  suffix:'units', a:'primary', i:'📦'},
          {l:'Total Waste',    v:totalWaste, suffix:'units', a:'red',     i:'🗑️'},
          {l:'Waste Rate',     v:wasteRate,  suffix:'%',     a:'orange',  i:'📊'},
          {l:'Total Cost',     v:'₹'+Math.round(totalCost/1000)+'k', suffix:'', a:'gold', i:'💰'},
        ].map((k,i)=>(
          <div key={i} className={'rp-kpi rp-kpi-'+k.a} style={{animationDelay:i*.08+'s'}}>
            <span className="rp-kpi-icon">{k.i}</span>
            <p className="rp-kpi-val">{k.v}{k.suffix}</p>
            <p className="rp-kpi-lbl">{k.l}</p>
          </div>
        ))}
      </div>

      <div className="rp-tabs">
        {[{k:'usage',l:'Usage Trends'},{k:'waste',l:'Waste Analysis'},{k:'stock',l:'Stock Health'},{k:'brand',l:'Brand Breakdown'}].map(t=>(
          <button key={t.k} className={'rp-tab'+(activeTab===t.k?' active':'')} onClick={()=>setActiveTab(t.k)}>{t.l}</button>
        ))}
      </div>

      {activeTab==='usage'&&(
        <div className="rp-section">
          <div className="rp-charts-row">
            <div className="rp-card">
              <div className="rp-card-hd">
                <div><p className="rp-eyebrow">Trend</p><h3 className="rp-card-title">Usage Over Time</h3></div>
                <button className="rp-export-btn" onClick={()=>exportCSV(DAILY_USAGE,'Usage-Report',['Day','Used','Waste','Cost'])}>Export CSV</button>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={DAILY_DATA} margin={{top:5,right:10,left:-20,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(16,185,129,.07)" vertical={false}/>
                  <XAxis dataKey="day" tick={{fill:'var(--inv-text-muted)',fontSize:11}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fill:'var(--inv-text-muted)',fontSize:11}} axisLine={false} tickLine={false}/>
                  <Tooltip content={<ChartTip/>}/>
                  <Legend wrapperStyle={{fontSize:11,color:'var(--inv-text-muted)'}}/>
                  <Line type="monotone" dataKey="used"  stroke="var(--inv-primary)" strokeWidth={2.5} dot={{r:3}} name="Used"/>
                  <Line type="monotone" dataKey="waste" stroke="var(--inv-red)"     strokeWidth={2}   dot={{r:3}} name="Waste"/>
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="rp-card">
              <div className="rp-card-hd">
                <div><p className="rp-eyebrow">Ranking</p><h3 className="rp-card-title">Top Consumed Items</h3></div>
                <button className="rp-export-btn" onClick={()=>exportCSV(TOP_CONSUMED,'Top-Items',['Item','Total','Unit','Cost'])}>Export CSV</button>
              </div>
              <div className="rp-top-list">
                {TOP_CONSUMED.map((item,i)=>{
                  const max=TOP_CONSUMED[0].total;
                  return(
                    <div key={i} className="rp-top-row">
                      <span className="rp-rank">#{i+1}</span>
                      <span className="rp-top-name">{item.name}</span>
                      <div className="rp-top-bar"><div className="rp-top-fill" style={{width:(item.total/max*100)+'%',animationDelay:i*.1+'s'}}/></div>
                      <span className="rp-top-val">{item.total} {item.unit}</span>
                      <span className="rp-top-cost">₹{item.cost.toLocaleString('en-IN')}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="rp-card rp-full">
            <div className="rp-card-hd">
              <div><p className="rp-eyebrow">Monthly</p><h3 className="rp-card-title">5-Month Usage Trend</h3></div>
              <button className="rp-export-btn" onClick={()=>exportCSV(MONTHLY_USAGE,'Monthly-Trend',['Month','Used','Waste','Cost'])}>Export CSV</button>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={MONTHLY_USAGE} margin={{top:5,right:10,left:-20,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(16,185,129,.07)" vertical={false}/>
                <XAxis dataKey="month" tick={{fill:'var(--inv-text-muted)',fontSize:11}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:'var(--inv-text-muted)',fontSize:11}} axisLine={false} tickLine={false}/>
                <Tooltip content={<ChartTip/>}/>
                <Legend wrapperStyle={{fontSize:11,color:'var(--inv-text-muted)'}}/>
                <Bar dataKey="used"  fill="var(--inv-primary)" radius={[4,4,0,0]} maxBarSize={28} name="Used"/>
                <Bar dataKey="waste" fill="var(--inv-orange)"  radius={[4,4,0,0]} maxBarSize={28} name="Waste"/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab==='waste'&&(
        <div className="rp-section">
          <div className="rp-charts-row">
            <div className="rp-card">
              <div className="rp-card-hd">
                <div><p className="rp-eyebrow">Cost Impact</p><h3 className="rp-card-title">Waste by Reason</h3></div>
                <button className="rp-export-btn" onClick={()=>exportCSV(WASTE_BY_REASON,'Waste-Report',['Reason','Cost','Count'])}>Export CSV</button>
              </div>
              <div className="rp-waste-split">
                <PieChart width={160} height={160}>
                  <Pie data={WASTE_BY_REASON} cx={75} cy={75} innerRadius={42} outerRadius={68} dataKey="cost" paddingAngle={3} strokeWidth={0}>
                    {WASTE_BY_REASON.map((_,i)=><Cell key={i} fill={PIE_COLORS[i]}/>)}
                  </Pie>
                </PieChart>
                <div className="rp-waste-legend">
                  {WASTE_BY_REASON.map((r,i)=>(
                    <div key={i} className="rp-wl-row">
                      <span className="rp-wl-dot" style={{background:PIE_COLORS[i]}}/>
                      <span className="rp-wl-name">{r.reason}</span>
                      <div className="rp-wl-bar"><div className="rp-wl-fill" style={{width:(r.cost/WASTE_BY_REASON[0].cost*100)+'%',background:PIE_COLORS[i],animationDelay:i*.1+'s'}}/></div>
                      <span className="rp-wl-val">₹{r.cost}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rp-card">
              <div className="rp-card-hd">
                <div><p className="rp-eyebrow">Daily</p><h3 className="rp-card-title">Waste Cost This Week</h3></div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={DAILY_USAGE} margin={{top:5,right:5,left:-20,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(239,68,68,.07)" vertical={false}/>
                  <XAxis dataKey="day" tick={{fill:'var(--inv-text-muted)',fontSize:11}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fill:'var(--inv-text-muted)',fontSize:11}} axisLine={false} tickLine={false}/>
                  <Tooltip content={<ChartTip/>}/>
                  <Bar dataKey="waste" fill="var(--inv-red)" radius={[4,4,0,0]} maxBarSize={32} name="Waste Units"/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rp-waste-summary">
            {WASTE_BY_REASON.map((r,i)=>(
              <div key={i} className="rp-ws-card" style={{animationDelay:i*.07+'s'}}>
                <p className="rp-ws-reason">{r.reason}</p>
                <p className="rp-ws-cost">₹{r.cost}</p>
                <p className="rp-ws-count">{r.count} incidents</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab==='stock'&&(
        <div className="rp-section">
          <div className="rp-card rp-full">
            <div className="rp-card-hd">
              <div><p className="rp-eyebrow">Historical</p><h3 className="rp-card-title">Stock Health Over 5 Months</h3></div>
              <button className="rp-export-btn" onClick={()=>exportCSV(STOCK_TREND,'Stock-Health',['Month','Healthy','Low','Critical'])}>Export CSV</button>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={STOCK_TREND} margin={{top:5,right:10,left:-20,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(16,185,129,.07)" vertical={false}/>
                <XAxis dataKey="month" tick={{fill:'var(--inv-text-muted)',fontSize:11}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:'var(--inv-text-muted)',fontSize:11}} axisLine={false} tickLine={false}/>
                <Tooltip content={<ChartTip/>}/>
                <Legend wrapperStyle={{fontSize:11,color:'var(--inv-text-muted)'}}/>
                <Bar dataKey="healthy"  fill="var(--inv-primary)" radius={[4,4,0,0]} maxBarSize={22} name="Healthy"/>
                <Bar dataKey="low"      fill="var(--inv-orange)"  radius={[4,4,0,0]} maxBarSize={22} name="Low"/>
                <Bar dataKey="critical" fill="var(--inv-red)"     radius={[4,4,0,0]} maxBarSize={22} name="Critical"/>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rp-stock-cards">
            {[
              {l:'Avg Healthy Items', v:'19.8', sub:'per month',   a:'primary'},
              {l:'Avg Low Stock',     v:'3.2',  sub:'per month',   a:'orange'},
              {l:'Avg Critical',      v:'1.0',  sub:'per month',   a:'red'},
              {l:'Best Month',        v:'April', sub:'0 critical', a:'gold'},
            ].map((s,i)=>(
              <div key={i} className={'rp-sc rp-sc-'+s.a} style={{animationDelay:i*.08+'s'}}>
                <p className="rp-sc-val">{s.v}</p>
                <p className="rp-sc-lbl">{s.l}</p>
                <p className="rp-sc-sub">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab==='brand'&&(
        <div className="rp-section">
          <div className="rp-charts-row">
            <div className="rp-card">
              <div className="rp-card-hd">
                <div><p className="rp-eyebrow">Distribution</p><h3 className="rp-card-title">Usage by Brand</h3></div>
              </div>
              <div className="rp-brand-chart">
                <PieChart width={200} height={200}>
                  <Pie data={BRAND_USAGE} cx={95} cy={95} innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={4} strokeWidth={0}>
                    {BRAND_USAGE.map((b,i)=><Cell key={i} fill={b.color}/>)}
                  </Pie>
                </PieChart>
                <div className="rp-brand-legend">
                  {BRAND_USAGE.map((b,i)=>(
                    <div key={i} className="rp-bl-row">
                      <span className="rp-bl-dot" style={{background:b.color}}/>
                      <span className="rp-bl-name">{b.name}</span>
                      <span className="rp-bl-pct">{b.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rp-card">
              <div className="rp-card-hd">
                <div><p className="rp-eyebrow">Comparison</p><h3 className="rp-card-title">Brand Performance</h3></div>
                <button className="rp-export-btn" onClick={()=>exportCSV(BRAND_USAGE,'Brand-Report',['Brand','Usage %','Color'])}>Export CSV</button>
              </div>
              <div className="rp-brand-bars">
                {BRAND_USAGE.map((b,i)=>(
                  <div key={i} className="rp-bb-row">
                    <span className="rp-bb-name">{b.name}</span>
                    <div className="rp-bb-bar">
                      <div className="rp-bb-fill" style={{width:b.value+'%',background:b.color,animationDelay:i*.15+'s'}}/>
                    </div>
                    <span className="rp-bb-pct">{b.value}%</span>
                    <div className={'rp-brand-card'} style={{borderColor:b.color+'40',background:b.color+'0A'}}>
                      <p style={{color:b.color,fontWeight:800,fontSize:13}}>{b.name}</p>
                      <p style={{color:'var(--inv-text-muted)',fontSize:11,margin:'3px 0 0'}}>{b.value}% of inventory usage</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="rp-export-section">
        <div className="rp-card">
          <div className="rp-card-hd"><div><p className="rp-eyebrow">Downloads</p><h3 className="rp-card-title">Export Reports</h3></div></div>
          <div className="rp-export-grid">
            {[
              {l:'Full Usage Report',   sub:'All usage logs with timestamps',         icon:'📦', data:DAILY_USAGE,    file:'Full-Usage',    headers:['Day','Used','Waste','Cost']},
              {l:'Waste Analysis',      sub:'Waste by reason and cost impact',        icon:'🗑️', data:WASTE_BY_REASON,file:'Waste-Analysis', headers:['Reason','Cost','Incidents']},
              {l:'Stock Health Report', sub:'Monthly stock status breakdown',         icon:'📊', data:STOCK_TREND,    file:'Stock-Health',  headers:['Month','Healthy','Low','Critical']},
              {l:'Top Consumed Items',  sub:'Most used ingredients this period',      icon:'🏆', data:TOP_CONSUMED,   file:'Top-Consumed',  headers:['Item','Total','Unit','Cost']},
              {l:'Monthly Summary',     sub:'5-month usage and cost trend',           icon:'📅', data:MONTHLY_USAGE,  file:'Monthly',       headers:['Month','Used','Waste','Cost']},
              {l:'Brand Usage Report',  sub:'Inventory consumption by brand',        icon:'🍔', data:BRAND_USAGE,    file:'Brand-Usage',   headers:['Brand','Usage%']},
            ].map((r,i)=>(
              <button key={i} className="rp-export-card" onClick={()=>exportCSV(r.data,r.file,r.headers)} style={{animationDelay:i*.07+'s'}}>
                <span className="rp-export-icon">{r.icon}</span>
                <div>
                  <p className="rp-export-lbl">{r.l}</p>
                  <p className="rp-export-sub">{r.sub}</p>
                </div>
                <span className="rp-export-arrow">↓ CSV</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}