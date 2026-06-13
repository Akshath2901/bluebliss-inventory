import React, { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import './CostAnalysis.css';
import { subscribeRecipes, addRecipe, updateRecipe, deleteRecipe, subscribeIngredients } from '../../lib/firebase.js';

const calcMargin = (price,cost) => price>0 ? ((price-cost)/price*100) : 0;

function ChartTip({active,payload,label}) {
  if(!active||!payload?.length) return null;
  return <div className="ca-tip"><p className="ca-tip-lbl">{label}</p>{payload.map((p,i)=><p key={i} style={{color:p.color,margin:'2px 0',fontSize:12,fontWeight:700}}>{p.name}: {typeof p.value==='number'&&p.name.includes('%')?p.value.toFixed(1)+'%':'₹'+p.value.toFixed(0)}</p>)}</div>;
}

const BLANK_FORM = { name:'', brand:'', category:'', price:'', ingredients:[] };

export default function CostAnalysis() {
  const [recipes,    setRecipes]     = useState([]);
  const [ingredients,setIngredients] = useState([]);
  const [loading,    setLoading]     = useState(true);
  const [filterBrand,setFilterBrand] = useState('All');
  const [filterCat,  setFilterCat]   = useState('All');
  const [sortBy,     setSortBy]       = useState('margin');
  const [search,     setSearch]       = useState('');
  const [showDetail, setShowDetail]   = useState(null);
  const [showModal,  setShowModal]    = useState(false);
  const [editingId,  setEditingId]    = useState(null);
  const [form,       setForm]         = useState(BLANK_FORM);
  const [toast,      setToast]        = useState('');

  useEffect(()=>{
    const unsub = subscribeRecipes((data)=>{ setRecipes(data); setLoading(false); });
    return unsub;
  },[]);
  useEffect(()=>{
    const unsub = subscribeIngredients((data)=>setIngredients(data));
    return unsub;
  },[]);

  const showToast = msg => { setToast(msg); setTimeout(()=>setToast(''),3000); };

  // Live cost lookup: a recipe ingredient's cost = real ingredient's current costPerUnit × qty
  const costOfIngredient = (name) => ingredients.find(i=>i.name===name)?.costPerUnit || 0;
  const unitOfIngredient = (name) => ingredients.find(i=>i.name===name)?.unit || '';

  // Build dynamic brand/category filter lists from real recipe data
  const BRANDS = useMemo(()=>['All',...Array.from(new Set(recipes.map(r=>r.brand).filter(Boolean)))],[recipes]);
  const CATS   = useMemo(()=>['All',...Array.from(new Set(recipes.map(r=>r.category).filter(Boolean)))],[recipes]);

  const enriched = useMemo(()=>recipes.map(item=>{
    const cost = (item.ingredients||[]).reduce((s,ing)=>s+(ing.qty*costOfIngredient(ing.name)),0);
    const price = parseFloat(item.price)||0;
    const margin = calcMargin(price,cost);
    const profit = price-cost;
    return {...item, price, cost:+cost.toFixed(2), margin:+margin.toFixed(1), profit:+profit.toFixed(2)};
  }),[recipes,ingredients]);

  const filtered = useMemo(()=>{
    let list=[...enriched];
    if(filterBrand!=='All') list=list.filter(i=>i.brand===filterBrand);
    if(filterCat!=='All')   list=list.filter(i=>i.category===filterCat);
    if(search.trim())       list=list.filter(i=>(i.name||'').toLowerCase().includes(search.toLowerCase()));
    list.sort((a,b)=>{
      if(sortBy==='margin')  return b.margin-a.margin;
      if(sortBy==='profit')  return b.profit-a.profit;
      if(sortBy==='cost')    return b.cost-a.cost;
      if(sortBy==='price')   return b.price-a.price;
      return 0;
    });
    return list;
  },[enriched,filterBrand,filterCat,search,sortBy]);

  const stats = useMemo(()=>{
    if(!enriched.length) return {avgMargin:0,bestMargin:null,worstMargin:null,totalProfit:0};
    return {
      avgMargin:  +(enriched.reduce((s,i)=>s+i.margin,0)/enriched.length).toFixed(1),
      bestMargin: enriched.reduce((a,b)=>b.margin>a.margin?b:a),
      worstMargin:enriched.reduce((a,b)=>b.margin<a.margin?b:a),
      totalProfit:+enriched.reduce((s,i)=>s+i.profit,0).toFixed(0),
    };
  },[enriched]);

  const chartData = filtered.slice(0,8).map(i=>({name:(i.name||'').split(' ')[0],margin:i.margin,cost:i.cost,price:i.price}));

  const exportCSV = ()=>{
    const rows=[['Item','Brand','Category','Price (₹)','Cost (₹)','Profit (₹)','Margin %'],...filtered.map(i=>[i.name,i.brand,i.category,i.price,i.cost.toFixed(2),i.profit.toFixed(2),i.margin.toFixed(1)+'%'])];
    const blob=new Blob([rows.map(r=>r.join(',')).join('\n')],{type:'text/csv'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='BlueBliss-Cost-Analysis-'+new Date().toISOString().split('T')[0]+'.csv';a.click();
  };

  const getMarginColor = m => m>=65?'var(--inv-primary)':m>=45?'var(--inv-gold)':m>=30?'var(--inv-orange)':'var(--inv-red)';
  const getMarginClass = m => m>=65?'good':m>=45?'ok':m>=30?'warn':'bad';

  // ---- Form / modal handlers ----
  const openAdd = () => { setEditingId(null); setForm(BLANK_FORM); setShowModal(true); };
  const openEdit = (item) => {
    setEditingId(item.id);
    setForm({ name:item.name||'', brand:item.brand||'', category:item.category||'', price:String(item.price||''), ingredients:(item.ingredients||[]).map(x=>({name:x.name,qty:x.qty})) });
    setShowModal(true); setShowDetail(null);
  };
  const addFormIngredient = () => {
    const first = ingredients[0]?.name || '';
    setForm(f=>({...f, ingredients:[...f.ingredients,{name:first,qty:1}]}));
  };
  const updateFormIngredient = (i,field,val) => {
    const items=[...form.ingredients]; items[i]={...items[i],[field]:val}; setForm(f=>({...f,ingredients:items}));
  };
  const removeFormIngredient = i => setForm(f=>({...f,ingredients:f.ingredients.filter((_,j)=>j!==i)}));

  const handleSave = async () => {
    if(!form.name.trim()){showToast('Enter dish name');return;}
    if(!form.price||parseFloat(form.price)<=0){showToast('Enter selling price');return;}
    const payload = {
      name: form.name,
      brand: form.brand,
      category: form.category,
      price: parseFloat(form.price),
      // store name + qty + unit; cost is computed live from ingredients, not stored
      ingredients: form.ingredients.filter(x=>x.name).map(x=>({name:x.name,qty:parseFloat(x.qty)||0,unit:unitOfIngredient(x.name)})),
    };
    try {
      if(editingId){ await updateRecipe(editingId,payload); showToast('Dish updated'); }
      else { await addRecipe(payload); showToast('Dish added'); }
      setForm(BLANK_FORM); setEditingId(null); setShowModal(false);
    } catch(e){ showToast('Save failed'); console.error(e); }
  };

  const handleDelete = async (id) => {
    if(!window.confirm('Delete this dish?'))return;
    try { await deleteRecipe(id); setShowDetail(null); showToast('Dish deleted'); }
    catch(e){ showToast('Delete failed'); console.error(e); }
  };

  const formCost = form.ingredients.reduce((s,ing)=>s+((parseFloat(ing.qty)||0)*costOfIngredient(ing.name)),0);
  const formMargin = calcMargin(parseFloat(form.price)||0, formCost);

  return (
    <div className="ca-page">
      {toast&&<div className="ca-toast" style={{position:'fixed',top:20,right:20,zIndex:9999,background:'var(--inv-text)',color:'var(--inv-surface)',padding:'10px 16px',borderRadius:10,fontSize:13,fontWeight:600}}>{toast}</div>}
      <div className="ca-header">
        <div><p className="ca-eyebrow">Profitability</p><h1 className="ca-title">Cost Analysis</h1><p className="ca-sub">Recipe costing, profit margins and dish profitability</p></div>
        <div className="ca-hactions">
          <button className="ca-btn-exp" onClick={exportCSV}>📊 Export CSV</button>
          <button className="ca-btn-exp" onClick={openAdd} style={{background:'var(--inv-primary)',color:'#fff'}}>+ Add Dish</button>
        </div>
      </div>

      {!loading && recipes.length===0 ? (
        <div className="ca-card" style={{padding:'48px 24px',textAlign:'center'}}>
          <p style={{fontSize:40,marginBottom:12}}>🍽️</p>
          <h3 style={{fontSize:18,marginBottom:6,color:'var(--inv-text)'}}>No dishes yet</h3>
          <p style={{fontSize:13,color:'var(--inv-text-muted)',marginBottom:18}}>
            {ingredients.length===0
              ? 'First add ingredients in Stock Control, then create dishes here to see their cost and profit margins.'
              : 'Add your dishes and their recipes to see live cost-to-make and profit margins, calculated from your real ingredient prices.'}
          </p>
          <button className="ca-btn-exp" onClick={openAdd} style={{background:'var(--inv-primary)',color:'#fff'}} disabled={ingredients.length===0}>+ Add Your First Dish</button>
        </div>
      ) : (
      <>
      <div className="ca-stats">
        {[
          {l:'Avg Margin',    v:stats.avgMargin+'%',       a:'primary', i:'📈', sub:'across all dishes'},
          {l:'Best Margin',   v:stats.bestMargin?stats.bestMargin.name.split(' ')[0]:'—', a:'green', i:'🏆', sub:stats.bestMargin?stats.bestMargin.margin+'% margin':'—'},
          {l:'Needs Review',  v:stats.worstMargin?stats.worstMargin.name.split(' ')[0]:'—',a:'orange',i:'⚠️', sub:stats.worstMargin?stats.worstMargin.margin+'% margin':'—'},
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
              {BRANDS.map(b=><button key={b} className={'ca-ftab'+(filterBrand===b?' active':'')} onClick={()=>setFilterBrand(b)}>{b}</button>)}
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
                  <td><span className="ca-brand-lbl">{item.brand||'—'}</span></td>
                  <td className="ca-td-cat">{item.category||'—'}</td>
                  <td className="ca-td-price">₹{item.price}</td>
                  <td className="ca-td-cost">₹{item.cost.toFixed(0)}</td>
                  <td className="ca-td-profit">₹{item.profit.toFixed(0)}</td>
                  <td>
                    <div className="ca-margin-cell">
                      <div className="ca-margin-bar">
                        <div className="ca-margin-fill" style={{width:Math.max(item.margin,0)+'%',background:getMarginColor(item.margin),animationDelay:i*.05+'s'}}/>
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
      </>
      )}

      {showDetail&&(
        <div className="ca-overlay" onClick={()=>setShowDetail(null)}>
          <div className="ca-modal" onClick={e=>e.stopPropagation()}>
            <div className="ca-modal-hd">
              <div>
                <p className="ca-eyebrow">{showDetail.brand||'—'} · {showDetail.category||'—'}</p>
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
                <div className="ca-detail-bar"><div className="ca-detail-fill" style={{width:Math.max(showDetail.margin,0)+'%',background:getMarginColor(showDetail.margin)}}/></div>
                <span className="ca-detail-pct">{showDetail.margin}% margin</span>
              </div>
            </div>
            <div className="ca-ing-table">
              <p className="ca-eyebrow" style={{marginBottom:10}}>Ingredient Breakdown</p>
              <table className="ca-detail-table">
                <thead><tr><th>Ingredient</th><th>Qty</th><th>Unit</th><th>Cost/Unit</th><th>Total</th></tr></thead>
                <tbody>
                  {(showDetail.ingredients||[]).map((ing,i)=>{
                    const c = costOfIngredient(ing.name);
                    return (
                    <tr key={i}>
                      <td className="ca-dt-name">{ing.name}</td>
                      <td>{ing.qty}</td>
                      <td>{ing.unit||unitOfIngredient(ing.name)}</td>
                      <td>₹{c}</td>
                      <td className="ca-dt-total">₹{(ing.qty*c).toFixed(2)}</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="ca-detail-grand">
                <span>Total Cost</span>
                <span className="ca-detail-grand-val">₹{showDetail.cost.toFixed(2)}</span>
              </div>
            </div>
            <div style={{display:'flex',gap:10,marginTop:16}}>
              <button className="ca-btn-detail" onClick={()=>openEdit(showDetail)} style={{flex:1,padding:'10px',border:'1px solid var(--inv-border)',borderRadius:8}}>✏️ Edit Dish</button>
              <button className="ca-btn-detail" onClick={()=>handleDelete(showDetail.id)} style={{flex:1,padding:'10px',border:'1px solid var(--inv-red)',color:'var(--inv-red)',borderRadius:8}}>🗑️ Delete</button>
            </div>
          </div>
        </div>
      )}

      {showModal&&(
        <div className="ca-overlay" onClick={()=>setShowModal(false)}>
          <div className="ca-modal" onClick={e=>e.stopPropagation()}>
            <div className="ca-modal-hd">
              <div><p className="ca-eyebrow">{editingId?'Edit':'New'} Dish</p><h2 className="ca-modal-title">{editingId?'Update Dish':'Add Dish'}</h2></div>
              <button className="ca-modal-x" onClick={()=>setShowModal(false)}>✕</button>
            </div>
            {ingredients.length===0 ? (
              <p style={{fontSize:13,color:'var(--inv-text-muted)',padding:'10px 0'}}>Add ingredients in Stock Control first — dishes are built from your ingredients.</p>
            ) : (
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              <div style={{display:'flex',gap:10}}>
                <div style={{flex:2}}><label style={{fontSize:12,color:'var(--inv-text-dim)'}}>Dish Name</label><input className="ca-search" style={{width:'100%'}} placeholder="e.g., Peri Peri Burger" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
                <div style={{flex:1}}><label style={{fontSize:12,color:'var(--inv-text-dim)'}}>Price (₹)</label><input className="ca-search" style={{width:'100%'}} type="number" value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/></div>
              </div>
              <div style={{display:'flex',gap:10}}>
                <div style={{flex:1}}><label style={{fontSize:12,color:'var(--inv-text-dim)'}}>Brand</label><input className="ca-search" style={{width:'100%'}} placeholder="e.g., Shrimmers" value={form.brand} onChange={e=>setForm({...form,brand:e.target.value})}/></div>
                <div style={{flex:1}}><label style={{fontSize:12,color:'var(--inv-text-dim)'}}>Category</label><input className="ca-search" style={{width:'100%'}} placeholder="e.g., Burgers" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}/></div>
              </div>

              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:4}}>
                <p className="ca-eyebrow">Recipe Ingredients</p>
                <button className="ca-btn-detail" onClick={addFormIngredient} style={{padding:'4px 10px',border:'1px solid var(--inv-border)',borderRadius:6}}>+ Add</button>
              </div>
              {form.ingredients.length===0 && <p style={{fontSize:12,color:'var(--inv-text-muted)'}}>No ingredients added yet.</p>}
              {form.ingredients.map((ing,i)=>(
                <div key={i} style={{display:'flex',gap:8,alignItems:'center'}}>
                  <select className="ca-search" style={{flex:2}} value={ing.name} onChange={e=>updateFormIngredient(i,'name',e.target.value)}>
                    {ingredients.map(x=><option key={x.id}>{x.name}</option>)}
                  </select>
                  <input className="ca-search" style={{flex:1}} type="number" step="0.01" placeholder="Qty" value={ing.qty} onChange={e=>updateFormIngredient(i,'qty',e.target.value)}/>
                  <span style={{fontSize:11,color:'var(--inv-text-muted)',minWidth:30}}>{unitOfIngredient(ing.name)}</span>
                  <span style={{fontSize:11,color:'var(--inv-text-muted)',minWidth:50}}>₹{((parseFloat(ing.qty)||0)*costOfIngredient(ing.name)).toFixed(1)}</span>
                  <button onClick={()=>removeFormIngredient(i)} style={{border:'none',background:'none',color:'var(--inv-red)',cursor:'pointer'}}>✕</button>
                </div>
              ))}

              <div style={{display:'flex',justifyContent:'space-between',padding:'10px 12px',background:'var(--inv-surface2)',borderRadius:8,marginTop:4}}>
                <span style={{fontSize:13,color:'var(--inv-text-dim)'}}>Cost to make: <b>₹{formCost.toFixed(2)}</b></span>
                <span style={{fontSize:13,color:'var(--inv-text-dim)'}}>Margin: <b style={{color:getMarginColor(formMargin)}}>{formMargin.toFixed(1)}%</b></span>
              </div>
            </div>
            )}
            <div className="ca-mactions" style={{display:'flex',gap:10,marginTop:16}}>
              <button className="ca-btn-exp" onClick={handleSave} style={{background:'var(--inv-primary)',color:'#fff',flex:1}} disabled={ingredients.length===0}>{editingId?'Update Dish':'Add Dish'}</button>
              <button className="ca-btn-exp" onClick={()=>setShowModal(false)} style={{flex:1}}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}