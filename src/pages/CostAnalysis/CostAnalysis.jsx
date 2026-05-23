import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import './CostAnalysis.css';

const MENU_ITEMS = [
  { id:1,  name:'Peri Peri Burger',   brand:'Shrimmers',   category:'Burgers',  price:189, ingredients:[{name:'Chicken Patty',qty:1,unit:'pcs',cost:45},{name:'Burger Bun',qty:1,unit:'pcs',cost:8},{name:'Lettuce',qty:0.05,unit:'kg',cost:80},{name:'Tomato',qty:0.04,unit:'kg',cost:40},{name:'Cheese Slice',qty:1,unit:'pcs',cost:15}] },
  { id:2,  name:'Cajun Fries',        brand:'Shrimmers',   category:'Sides',    price:89,  ingredients:[{name:'Tomato',qty:0.1,unit:'kg',cost:40},{name:'Tandoori Sauce',qty:0.05,unit:'L',cost:120}] },
  { id:3,  name:'Mutton Burger',      brand:'Shrimmers',   category:'Burgers',  price:229, ingredients:[{name:'Mutton Patty',qty:1,unit:'pcs',cost:90},{name:'Burger Bun',qty:1,unit:'pcs',cost:8},{name:'Lettuce',qty:0.05,unit:'kg',cost:80},{name:'Tomato',qty:0.04,unit:'kg',cost:40},{name:'Cheese Slice',qty:2,unit:'pcs',cost:15}] },
  { id:4,  name:'Margherita Pizza',   brand:'Peppanizze',  category:'Pizzas',   price:249, ingredients:[{name:'Pizza Base',qty:1,unit:'pcs',cost:25},{name:'Mozzarella',qty:0.15,unit:'kg',cost:280},{name:'Tomato',qty:0.1,unit:'kg',cost:40}] },
  { id:5,  name:'Chicken Pizza',      brand:'Peppanizze',  category:'Pizzas',   price:299, ingredients:[{name:'Pizza Base',qty:1,unit:'pcs',cost:25},{name:'Chicken Patty',qty:0.5,unit:'pcs',cost:45},{name:'Mozzarella',qty:0.18,unit:'kg',cost:280},{name:'Tomato',qty:0.1,unit:'kg',cost:40}] },
  { id:6,  name:'Paneer Wrap',        brand:'UrbanWrap',   category:'Wraps',    price:159, ingredients:[{name:'Burger Bun',qty:1,unit:'pcs',cost:8},{name:'Tomato',qty:0.05,unit:'kg',cost:40},{name:'Onion',qty:0.05,unit:'kg',cost:30},{name:'Tandoori Sauce',qty:0.04,unit:'L',cost:120}] },
  { id:7,  name:'Chicken Wrap',       brand:'UrbanWrap',   category:'Wraps',    price:179, ingredients:[{name:'Chicken Patty',qty:1,unit:'pcs',cost:45},{name:'Burger Bun',qty:1,unit:'pcs',cost:8},{name:'Lettuce',qty:0.04,unit:'kg',cost:80},{name:'Onion',qty:0.04,unit:'kg',cost:30},{name:'Tandoori Sauce',qty:0.05,unit:'L',cost:120}] },
  { id:8,  name:'Cheese Fries',       brand:'Shrimmers',   category:'Sides',    price:99,  ingredients:[{name:'Tomato',qty:0.08,unit:'kg',cost:40},{name:'Cheese Slice',qty:2,unit:'pcs',cost:15}] },
  { id:9,  name:'Mutton Pizza',       brand:'Peppanizze',  category:'Pizzas',   price:329, ingredients:[{name:'Pizza Base',qty:1,unit:'pcs',cost:25},{name:'Mutton Patty',qty:0.5,unit:'pcs',cost:90},{name:'Mozzarella',qty:0.18,unit:'kg',cost:280},{name:'Onion',qty:0.08,unit:'kg',cost:30}] },
  { id:10, name:'Veggie Wrap',        brand:'UrbanWrap',   category:'Wraps',    price:139, ingredients:[{name:'Burger Bun',qty:1,unit:'pcs',cost:8},{name:'Lettuce',qty:0.05,unit:'kg',cost:80},{name:'Tomato',qty:0.05,unit:'kg',cost:40},{name:'Onion',qty:0.05,unit:'kg',cost:30}] },
];

const BRANDS   = ['All','Shrimmers','Peppanizze','UrbanWrap'];
const CATS     = ['All','Burgers','Pizzas','Wraps','Sides'];
const BRAND_COLOR = {Shrimmers:'#F2C35A',Peppanizze:'#10B981',UrbanWrap:'#3B82F6'};

const calcCost = item => item.ingredients.reduce((s,i)=>s+(i.qty*i.cost),0);
const calcMargin = (price,cost) => ((price-cost)/price*100);

function ChartTip({active,payload,label}) {
  if(!active||!payload?.length) return null;
  return <div className="ca-tip"><p className="ca-tip-lbl">{label}</p>{payload.map((p,i)=><p key={i} style={{color:p.color,margin:'2px 0',fontSize:12,fontWeight:700}}>{p.name}: {typeof p.value==='number'&&p.name.includes('%')?p.value.toFixed(1)+'%':'₹'+p.value.toFixed(0)}</p>)}</div>;
}

export default function CostAnalysis() {
  const [filterBrand,setFilterBrand] = useState('All');
  const [filterCat,  setFilterCat]   = useState('All');
  const [sortBy,     setSortBy]       = useState('margin');
  const [search,     setSearch]       = useState('');
  const [showDetail, setShowDetail]   = useState(null);

  const enriched = useMemo(()=>MENU_ITEMS.map(item=>{
    const cost   = calcCost(item);
    const margin = calcMargin(item.price,cost);
    const profit = item.price-cost;
    return {...item,cost:+cost.toFixed(2),margin:+margin.toFixed(1),profit:+profit.toFixed(2)};
  }),[]);

  const filtered = useMemo(()=>{
    let list=[...enriched];
    if(filterBrand!=='All') list=list.filter(i=>i.brand===filterBrand);
    if(filterCat!=='All')   list=list.filter(i=>i.category===filterCat);
    if(search.trim())       list=list.filter(i=>i.name.toLowerCase().includes(search.toLowerCase()));
    list.sort((a,b)=>{
      if(sortBy==='margin')  return b.margin-a.margin;
      if(sortBy==='profit')  return b.profit-a.profit;
      if(sortBy==='cost')    return b.cost-a.cost;
      if(sortBy==='price')   return b.price-a.price;
      return 0;
    });
    return list;
  },[enriched,filterBrand,filterCat,search,sortBy]);

  const stats = useMemo(()=>({
    avgMargin:  +(enriched.reduce((s,i)=>s+i.margin,0)/enriched.length).toFixed(1),
    bestMargin: enriched.reduce((a,b)=>b.margin>a.margin?b:a),
    worstMargin:enriched.reduce((a,b)=>b.margin<a.margin?b:a),
    totalProfit:+enriched.reduce((s,i)=>s+i.profit,0).toFixed(0),
  }),[enriched]);

  const chartData = filtered.slice(0,8).map(i=>({name:i.name.split(' ')[0],margin:i.margin,cost:i.cost,price:i.price}));

  const exportCSV = ()=>{
    const rows=[['Item','Brand','Category','Price (₹)','Cost (₹)','Profit (₹)','Margin %'],...filtered.map(i=>[i.name,i.brand,i.category,i.price,i.cost.toFixed(2),i.profit.toFixed(2),i.margin.toFixed(1)+'%'])];
    const blob=new Blob([rows.map(r=>r.join(',')).join('\n')],{type:'text/csv'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='BlueBliss-Cost-Analysis-'+new Date().toISOString().split('T')[0]+'.csv';a.click();
  };

  const getMarginColor = m => m>=65?'var(--inv-primary)':m>=45?'var(--inv-gold)':m>=30?'var(--inv-orange)':'var(--inv-red)';
  const getMarginClass = m => m>=65?'good':m>=45?'ok':m>=30?'warn':'bad';

  return (
    <div className="ca-page">
      <div className="ca-header">
        <div><p className="ca-eyebrow">Profitability</p><h1 className="ca-title">Cost Analysis</h1><p className="ca-sub">Recipe costing, profit margins and dish profitability</p></div>
        <div className="ca-hactions">
          <button className="ca-btn-exp" onClick={exportCSV}>📊 Export CSV</button>
        </div>
      </div>

      <div className="ca-stats">
        {[
          {l:'Avg Margin',    v:stats.avgMargin+'%',       a:'primary', i:'📈', sub:'across all dishes'},
          {l:'Best Margin',   v:stats.bestMargin.name.split(' ')[0], a:'green', i:'🏆', sub:stats.bestMargin.margin+'% margin'},
          {l:'Needs Review',  v:stats.worstMargin.name.split(' ')[0],a:'orange',i:'⚠️', sub:stats.worstMargin.margin+'% margin'},
          {l:'Total Profit',  v:'₹'+stats.totalProfit,    a:'gold',    i:'💰', sub:'per order cycle'},
        ].map((s,i)=>(
          <div key={i} className={'ca-stat ca-stat-'+s.a} style={{animationDelay:i*.08+'s'}}>
            <span className="ca-stat-icon">{s.i}</span>
            <p className="ca-stat-val">{s.v}</p>
            <p className="ca-stat-label">{s.l}</p>
            <p className="ca-stat-sub">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="ca-charts">
        <div className="ca-card">
          <div className="ca-card-hd"><div><p className="ca-eyebrow">Comparison</p><h3 className="ca-card-title">Margin by Dish</h3></div></div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{top:5,right:5,left:-20,bottom:20}}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(16,185,129,.07)" vertical={false}/>
              <XAxis dataKey="name" tick={{fill:'var(--inv-text-muted)',fontSize:10}} axisLine={false} tickLine={false} angle={-20} textAnchor="end"/>
              <YAxis tick={{fill:'var(--inv-text-muted)',fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>v+'%'}/>
              <Tooltip content={<ChartTip/>}/>
              <Bar dataKey="margin" name="Margin %" radius={[4,4,0,0]} maxBarSize={36}>
                {chartData.map((entry,i)=><Cell key={i} fill={getMarginColor(entry.margin)}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="ca-card">
          <div className="ca-card-hd"><div><p className="ca-eyebrow">Breakdown</p><h3 className="ca-card-title">Price vs Cost</h3></div></div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{top:5,right:5,left:-20,bottom:20}}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(16,185,129,.07)" vertical={false}/>
              <XAxis dataKey="name" tick={{fill:'var(--inv-text-muted)',fontSize:10}} axisLine={false} tickLine={false} angle={-20} textAnchor="end"/>
              <YAxis tick={{fill:'var(--inv-text-muted)',fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>'₹'+v}/>
              <Tooltip content={<ChartTip/>}/>
              <Bar dataKey="price" name="Selling Price" fill="var(--inv-primary)" radius={[4,4,0,0]} maxBarSize={18}/>
              <Bar dataKey="cost"  name="Cost to Make"  fill="var(--inv-red)"     radius={[4,4,0,0]} maxBarSize={18}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="ca-card ca-table-card">
        <div className="ca-card-hd">
          <div><p className="ca-eyebrow">All Dishes</p><h3 className="ca-card-title">Profitability Table</h3></div>
          <div className="ca-controls">
            <input className="ca-search" placeholder="🔍 Search dish…" value={search} onChange={e=>setSearch(e.target.value)}/>
            <div className="ca-ftabs">
              {BRANDS.map(b=><button key={b} className={'ca-ftab'+(filterBrand===b?' active':'')} style={filterBrand===b&&b!=='All'?{background:BRAND_COLOR[b]}:{}} onClick={()=>setFilterBrand(b)}>{b}</button>)}
            </div>
            <div className="ca-ftabs">
              {CATS.map(c=><button key={c} className={'ca-ftab'+(filterCat===c?' active':'')} onClick={()=>setFilterCat(c)}>{c}</button>)}
            </div>
            <select className="ca-sel" value={sortBy} onChange={e=>setSortBy(e.target.value)}>
              <option value="margin">Sort: Margin</option>
              <option value="profit">Sort: Profit</option>
              <option value="cost">Sort: Cost</option>
              <option value="price">Sort: Price</option>
            </select>
          </div>
        </div>
        <div className="ca-table-wrap">
          <table className="ca-table">
            <thead>
              <tr>
                <th>Dish</th><th>Brand</th><th>Category</th>
                <th>Selling Price</th><th>Cost to Make</th><th>Profit</th><th>Margin</th><th>Details</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item,i)=>(
                <tr key={item.id} className="ca-tr" style={{animationDelay:i*.04+'s'}}>
                  <td className="ca-td-name">{item.name}</td>
                  <td><span className="ca-brand-dot" style={{background:BRAND_COLOR[item.brand]}}/><span className="ca-brand-lbl">{item.brand}</span></td>
                  <td className="ca-td-cat">{item.category}</td>
                  <td className="ca-td-price">₹{item.price}</td>
                  <td className="ca-td-cost">₹{item.cost.toFixed(0)}</td>
                  <td className="ca-td-profit">₹{item.profit.toFixed(0)}</td>
                  <td>
                    <div className="ca-margin-cell">
                      <div className="ca-margin-bar">
                        <div className="ca-margin-fill" style={{width:item.margin+'%',background:getMarginColor(item.margin),animationDelay:i*.05+'s'}}/>
                      </div>
                      <span className={'ca-margin-num ca-m-'+getMarginClass(item.margin)}>{item.margin}%</span>
                    </div>
                  </td>
                  <td><button className="ca-btn-detail" onClick={()=>setShowDetail(item)}>View →</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="ca-table-footer">
          <span>{filtered.length} dishes</span>
          <span>Avg margin: {(filtered.reduce((s,i)=>s+i.margin,0)/Math.max(filtered.length,1)).toFixed(1)}%</span>
        </div>
      </div>

      {showDetail&&(
        <div className="ca-overlay" onClick={()=>setShowDetail(null)}>
          <div className="ca-modal" onClick={e=>e.stopPropagation()}>
            <div className="ca-modal-hd">
              <div>
                <p className="ca-eyebrow">{showDetail.brand} · {showDetail.category}</p>
                <h2 className="ca-modal-title">{showDetail.name}</h2>
              </div>
              <button className="ca-modal-x" onClick={()=>setShowDetail(null)}>✕</button>
            </div>
            <div className="ca-detail-kpis">
              {[['Selling Price','₹'+showDetail.price,'primary'],['Cost to Make','₹'+showDetail.cost.toFixed(0),'red'],['Profit per Dish','₹'+showDetail.profit.toFixed(0),'gold'],['Margin',showDetail.margin+'%',getMarginClass(showDetail.margin)==='good'?'primary':getMarginClass(showDetail.margin)==='ok'?'gold':'orange']].map(([l,v,a],i)=>(
                <div key={i} className={'ca-dk ca-dk-'+a}><p className="ca-dk-label">{l}</p><p className="ca-dk-val">{v}</p></div>
              ))}
            </div>
            <div className="ca-detail-margin">
              <div className="ca-detail-bar-wrap">
                <div className="ca-detail-bar"><div className="ca-detail-fill" style={{width:showDetail.margin+'%',background:getMarginColor(showDetail.margin)}}/></div>
                <span className="ca-detail-pct">{showDetail.margin}% margin</span>
              </div>
            </div>
            <div className="ca-ing-table">
              <p className="ca-eyebrow" style={{marginBottom:10}}>Ingredient Breakdown</p>
              <table className="ca-detail-table">
                <thead><tr><th>Ingredient</th><th>Qty</th><th>Unit</th><th>Cost/Unit</th><th>Total</th></tr></thead>
                <tbody>
                  {showDetail.ingredients.map((ing,i)=>(
                    <tr key={i}>
                      <td className="ca-dt-name">{ing.name}</td>
                      <td>{ing.qty}</td>
                      <td>{ing.unit}</td>
                      <td>₹{ing.cost}</td>
                      <td className="ca-dt-total">₹{(ing.qty*ing.cost).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="ca-detail-grand">
                <span>Total Cost</span>
                <span className="ca-detail-grand-val">₹{showDetail.cost.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}