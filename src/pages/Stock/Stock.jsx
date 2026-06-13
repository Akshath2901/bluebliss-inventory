import React, { useState, useMemo, useEffect } from 'react';
import './Stock.css';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  subscribeIngredients,
  addIngredient,
  updateStock,
  updateIngredient,
  deleteIngredient,
} from '../../lib/firebase.js';

const UNITS = ['pieces','kg','grams','liters','ml','dozen','box'];
const CATEGORIES = ['Proteins','Vegetables','Bakery','Dairy','Condiments','Beverages','Other'];

const getStatus = (c,t) => c<=0?'critical':c<=t?'low':c<=t*1.5?'warning':'good';
const STATUS_LABEL = {critical:'Critical',low:'Low',warning:'Warning',good:'In Stock'};

// Convert a Firestore timestamp (or anything) into a short "x ago" string
const timeAgo = (ts) => {
  if (!ts) return '—';
  let date;
  if (ts.toDate) date = ts.toDate();            // Firestore Timestamp
  else if (ts.seconds) date = new Date(ts.seconds*1000);
  else date = new Date(ts);
  if (isNaN(date.getTime())) return '—';
  const diff = Math.floor((Date.now() - date.getTime())/1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff/60)+'m ago';
  if (diff < 86400) return Math.floor(diff/3600)+'h ago';
  return Math.floor(diff/86400)+'d ago';
};

export default function Stock() {
  const { profile, user } = useAuth();
  const staffId = profile?.id || user?.uid || 'user';

  const [ingredients,setIngredients] = useState([]);
  const [loading,setLoading]         = useState(true);
  const [search,setSearch]           = useState('');
  const [filterCat,setFilterCat]     = useState('all');
  const [filterStatus,setFilterStatus]=useState('all');
  const [editingId,setEditingId]     = useState(null);
  const [editVal,setEditVal]         = useState('');
  const [showModal,setShowModal]     = useState(false);
  const [showDetail,setShowDetail]   = useState(null);
  const [sortBy,setSortBy]           = useState('name');
  const [sortDir,setSortDir]         = useState('asc');
  const [toast,setToast]             = useState('');
  const [form,setForm] = useState({name:'',category:'Proteins',unit:'pieces',currentStock:0,minThreshold:10,maxStock:100,costPerUnit:0,supplier:''});

  // Live subscription to Firestore — updates automatically when data changes
  useEffect(()=>{
    const unsub = subscribeIngredients((data)=>{
      setIngredients(data);
      setLoading(false);
    });
    return unsub;
  },[]);

  const showToast = msg => { setToast(msg); setTimeout(()=>setToast(''),3000); };

  const handleUpdate = async id => {
    const v = parseFloat(editVal);
    if (isNaN(v)||v<0) { showToast('Enter valid quantity'); return; }
    try {
      await updateStock(id, v, 'Manual update', staffId);
      setEditingId(null); showToast('Stock updated');
    } catch (e) {
      showToast('Update failed'); console.error(e);
    }
  };

  const handleAdd = async () => {
    if (!form.name.trim()) { showToast('Enter ingredient name'); return; }
    try {
      await addIngredient(form, staffId);
      setForm({name:'',category:'Proteins',unit:'pieces',currentStock:0,minThreshold:10,maxStock:100,costPerUnit:0,supplier:''});
      setShowModal(false); showToast('Ingredient added');
    } catch (e) {
      showToast('Add failed'); console.error(e);
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('Delete this ingredient?')) return;
    try {
      await deleteIngredient(id); showToast('Deleted');
    } catch (e) {
      showToast('Delete failed'); console.error(e);
    }
  };

  const exportCSV = () => {
    const rows=[['Name','Category','Unit','Stock','Min','Max','Cost','Value','Status','Supplier'],...filtered.map(i=>[i.name,i.category,i.unit,i.currentStock,i.minThreshold,i.maxStock,i.costPerUnit,(i.currentStock*i.costPerUnit).toFixed(0),STATUS_LABEL[getStatus(i.currentStock,i.minThreshold)],i.supplier||''])];
    const blob=new Blob([rows.map(r=>r.join(',')).join('\n')],{type:'text/csv'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
    a.download='BlueBliss-Stock-'+new Date().toISOString().split('T')[0]+'.csv'; a.click();
    showToast('Exported to CSV');
  };

  const handleSort = col => { if(sortBy===col) setSortDir(d=>d==='asc'?'desc':'asc'); else{setSortBy(col);setSortDir('asc');} };

  const filtered = useMemo(()=>{
    let list=[...ingredients];
    if(search.trim()) list=list.filter(i=>i.name.toLowerCase().includes(search.toLowerCase())||i.category.toLowerCase().includes(search.toLowerCase()));
    if(filterCat!=='all') list=list.filter(i=>i.category===filterCat);
    if(filterStatus!=='all') list=list.filter(i=>{ const s=getStatus(i.currentStock,i.minThreshold); return filterStatus==='low'?s==='low'||s==='critical':s===filterStatus; });
    list.sort((a,b)=>{ let va=a[sortBy],vb=b[sortBy]; if(typeof va==='string'){va=va.toLowerCase();vb=vb.toLowerCase();} return sortDir==='asc'?(va>vb?1:-1):(va<vb?1:-1); });
    return list;
  },[ingredients,search,filterCat,filterStatus,sortBy,sortDir]);

  const stats={total:ingredients.length,critical:ingredients.filter(i=>getStatus(i.currentStock,i.minThreshold)==='critical').length,low:ingredients.filter(i=>getStatus(i.currentStock,i.minThreshold)==='low').length,good:ingredients.filter(i=>getStatus(i.currentStock,i.minThreshold)==='good').length,value:ingredients.reduce((s,i)=>s+i.currentStock*i.costPerUnit,0)};

  const SI = ({col})=>(<span className={'sc-si'+(sortBy===col?' sc-si-on':'')}>{sortBy===col?(sortDir==='asc'?'↑':'↓'):'↕'}</span>);

  return (
    <div className="sc-page">
      {toast&&<div className="sc-toast">{toast}</div>}
      <div className="sc-header">
        <div><p className="sc-eyebrow">Inventory</p><h1 className="sc-title">Stock Control</h1><p className="sc-sub">Real-time ingredient tracking and management</p></div>
        <div className="sc-hactions">
          <button className="sc-btn-exp" onClick={exportCSV}>📊 Export CSV</button>
          <button className="sc-btn-add" onClick={()=>setShowModal(true)}>+ Add Ingredient</button>
        </div>
      </div>
      <div className="sc-stats">
        {[{l:'Total',v:stats.total,a:'primary',i:'📦'},{l:'Healthy',v:stats.good,a:'green',i:'✅'},{l:'Low',v:stats.low,a:'orange',i:'⚠️'},{l:'Critical',v:stats.critical,a:'red',i:'🔴'},{l:'Value',v:'₹'+Math.round(stats.value/1000)+'k',a:'gold',i:'💰'}].map((s,i)=>(
          <div key={i} className={'sc-stat sc-stat-'+s.a} style={{animationDelay:i*.08+'s'}}>
            <span>{s.i}</span><p className="sc-stat-val">{s.v}</p><p className="sc-stat-lbl">{s.l}</p>
          </div>
        ))}
      </div>
      <div className="sc-controls">
        <input className="sc-search" placeholder="🔍 Search ingredients…" value={search} onChange={e=>setSearch(e.target.value)}/>
        <div className="sc-ftabs">
          {[{k:'all',l:'All'},{k:'good',l:'Healthy'},{k:'low',l:'Low'},{k:'critical',l:'Critical'}].map(f=>(
            <button key={f.k} className={'sc-ftab'+(filterStatus===f.k?' active':'')+' ft-'+f.k} onClick={()=>setFilterStatus(f.k)}>{f.l}</button>
          ))}
        </div>
        <select className="sc-sel" value={filterCat} onChange={e=>setFilterCat(e.target.value)}>
          <option value="all">All Categories</option>
          {CATEGORIES.map(c=><option key={c}>{c}</option>)}
        </select>
      </div>
      <div className="sc-table-card">
        <div className="sc-table-wrap">
          <table className="sc-table">
            <thead>
              <tr>
                <th className="sc-th-s" onClick={()=>handleSort('name')}>Ingredient<SI col="name"/></th>
                <th className="sc-th-s" onClick={()=>handleSort('category')}>Category<SI col="category"/></th>
                <th className="sc-th-s" onClick={()=>handleSort('currentStock')}>Stock Level<SI col="currentStock"/></th>
                <th>Unit</th>
                <th className="sc-th-s" onClick={()=>handleSort('costPerUnit')}>Cost/Unit<SI col="costPerUnit"/></th>
                <th>Total Value</th>
                <th>Status</th>
                <th>Supplier</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item,i)=>{
                const s=getStatus(item.currentStock,item.minThreshold);
                const pct=Math.min((item.currentStock/item.maxStock)*100,100);
                const isEdit=editingId===item.id;
                return(
                  <tr key={item.id} className={'sc-tr sc-tr-'+s} style={{animationDelay:i*.04+'s'}}>
                    <td><button className="sc-name-btn" onClick={()=>setShowDetail(item)}>{item.name}</button></td>
                    <td><span className="sc-cat-tag">{item.category}</span></td>
                    <td className="sc-td-stock">
                      {isEdit?(
                        <div className="sc-edit-row">
                          <input className="sc-edit-inp" type="number" value={editVal} autoFocus onChange={e=>setEditVal(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')handleUpdate(item.id);if(e.key==='Escape')setEditingId(null);}}/>
                          <button className="sc-sv" onClick={()=>handleUpdate(item.id)}>✓</button>
                          <button className="sc-cx" onClick={()=>setEditingId(null)}>✕</button>
                        </div>
                      ):(
                        <div className="sc-stk-cell">
                          <div className="sc-stk-bar"><div className={'sc-stk-fill sf-'+s} style={{width:pct+'%',animationDelay:i*.05+'s'}}/></div>
                          <span className="sc-stk-num">{item.currentStock}</span>
                        </div>
                      )}
                    </td>
                    <td>{item.unit}</td>
                    <td className="sc-td-cost">₹{item.costPerUnit}</td>
                    <td className="sc-td-val">₹{(item.currentStock*item.costPerUnit).toFixed(0)}</td>
                    <td><span className={'sc-chip sc-c-'+s}>{STATUS_LABEL[s]}</span></td>
                    <td className="sc-td-sup">{item.supplier||'—'}</td>
                    <td className="sc-td-time">{timeAgo(item.updatedAt)}</td>
                    <td>
                      <div className="sc-act-cell">
                        <button className="sc-act sc-act-edit" onClick={()=>{setEditingId(item.id);setEditVal(item.currentStock);}}>✏️</button>
                        <button className="sc-act sc-act-info" onClick={()=>setShowDetail(item)}>👁</button>
                        <button className="sc-act sc-act-del"  onClick={()=>handleDelete(item.id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!loading && filtered.length===0 && (
            <div className="sc-empty">
              <span>📦</span>
              <p>{ingredients.length===0 ? 'No ingredients yet — add your first one to get started' : 'No ingredients match your filters'}</p>
            </div>
          )}
          {loading && (
            <div className="sc-empty"><span>⏳</span><p>Loading inventory…</p></div>
          )}
        </div>
        <div className="sc-footer"><span>Showing {filtered.length} of {ingredients.length}</span><span>Total value: ₹{Math.round(stats.value).toLocaleString('en-IN')}</span></div>
      </div>

      {showModal&&(
        <div className="sc-overlay" onClick={()=>setShowModal(false)}>
          <div className="sc-modal" onClick={e=>e.stopPropagation()}>
            <div className="sc-modal-hd">
              <div><p className="sc-eyebrow">New Item</p><h2 className="sc-modal-title">Add Ingredient</h2></div>
              <button className="sc-modal-x" onClick={()=>setShowModal(false)}>✕</button>
            </div>
            <div className="sc-mform">
              <div className="sc-mf"><label>Name</label><input className="sc-minp" type="text" placeholder="e.g., Chicken Patties" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
              <div className="sc-mfrow">
                <div className="sc-mf"><label>Category</label><select className="sc-minp" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
                <div className="sc-mf"><label>Unit</label><select className="sc-minp" value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})}>{UNITS.map(u=><option key={u}>{u}</option>)}</select></div>
              </div>
              <div className="sc-mfrow">
                <div className="sc-mf"><label>Current Stock</label><input className="sc-minp" type="number" value={form.currentStock} onChange={e=>setForm({...form,currentStock:e.target.value})}/></div>
                <div className="sc-mf"><label>Min Threshold</label><input className="sc-minp" type="number" value={form.minThreshold} onChange={e=>setForm({...form,minThreshold:e.target.value})}/></div>
              </div>
              <div className="sc-mfrow">
                <div className="sc-mf"><label>Max Capacity</label><input className="sc-minp" type="number" value={form.maxStock} onChange={e=>setForm({...form,maxStock:e.target.value})}/></div>
                <div className="sc-mf"><label>Cost/Unit (₹)</label><input className="sc-minp" type="number" value={form.costPerUnit} onChange={e=>setForm({...form,costPerUnit:e.target.value})}/></div>
              </div>
              <div className="sc-mf"><label>Supplier</label><input className="sc-minp" type="text" placeholder="Supplier name" value={form.supplier} onChange={e=>setForm({...form,supplier:e.target.value})}/></div>
            </div>
            <div className="sc-mactions">
              <button className="sc-btn-confirm" onClick={handleAdd}>Add Ingredient</button>
              <button className="sc-btn-cx-modal" onClick={()=>setShowModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showDetail&&(()=>{
        const s=getStatus(showDetail.currentStock,showDetail.minThreshold);
        const pct=Math.min((showDetail.currentStock/showDetail.maxStock)*100,100);
        return(
          <div className="sc-overlay" onClick={()=>setShowDetail(null)}>
            <div className="sc-modal" onClick={e=>e.stopPropagation()}>
              <div className="sc-modal-hd">
                <div><p className="sc-eyebrow">{showDetail.category}</p><h2 className="sc-modal-title">{showDetail.name}</h2></div>
                <button className="sc-modal-x" onClick={()=>setShowDetail(null)}>✕</button>
              </div>
              <span className={'sc-chip sc-c-'+s} style={{marginBottom:14,display:'inline-block'}}>{STATUS_LABEL[s]}</span>
              <div style={{marginBottom:18}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'var(--inv-text-muted)',marginBottom:6}}><span>0</span><span>Min:{showDetail.minThreshold}</span><span>{showDetail.maxStock}</span></div>
                <div style={{height:8,background:'var(--inv-border)',borderRadius:4,overflow:'hidden'}}><div className={'sc-stk-fill sf-'+s} style={{width:pct+'%',height:'100%',borderRadius:4}}/></div>
                <p style={{fontSize:11,color:'var(--inv-text-muted)',marginTop:5,textAlign:'right'}}>{pct.toFixed(0)}% capacity</p>
              </div>
              <div className="sc-dg">
                {[['Current Stock',showDetail.currentStock+' '+showDetail.unit],['Min Threshold',showDetail.minThreshold+' '+showDetail.unit],['Max Capacity',showDetail.maxStock+' '+showDetail.unit],['Cost per Unit','₹'+showDetail.costPerUnit],['Total Value','₹'+(showDetail.currentStock*showDetail.costPerUnit).toFixed(0)],['Supplier',showDetail.supplier||'—'],['Last Updated',timeAgo(showDetail.updatedAt)]].map(([l,v],i)=>(
                  <div key={i} className="sc-di"><p className="sc-dl">{l}</p><p className="sc-dv">{v}</p></div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}