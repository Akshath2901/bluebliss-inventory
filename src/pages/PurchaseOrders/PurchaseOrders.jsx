import React, { useState, useMemo, useEffect } from 'react';
import './PurchaseOrders.css';
import {
  subscribePurchaseOrders,
  createPO,
  updatePOStatus,
  subscribeSuppliers,
  subscribeIngredients,
  updateStock,
} from '../../lib/firebase.js';
import { useAuth } from '../../context/AuthContext.jsx';

const STATUS_FLOW  = {draft:'sent',sent:'received'};
const STATUS_LABEL = {draft:'Draft',sent:'Sent',received:'Received',cancelled:'Cancelled'};

// Friendly date from a Firestore timestamp
const fmtDate = (ts) => {
  if (!ts) return '—';
  let d;
  if (ts.toDate) d = ts.toDate(); else if (ts.seconds) d = new Date(ts.seconds*1000); else d = new Date(ts);
  if (isNaN(d.getTime())) return typeof ts === 'string' ? ts : '—';
  return d.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
};

export default function PurchaseOrders() {
  const { profile, user } = useAuth();
  const staffId = profile?.id || user?.uid || 'user';

  const [pos,         setPos]         = useState([]);
  const [suppliers,   setSuppliers]   = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showModal,   setShowModal]   = useState(false);
  const [showDetail,  setShowDetail]  = useState(null);
  const [filterStatus,setFilterStatus]= useState('all');
  const [search,      setSearch]      = useState('');
  const [toast,       setToast]       = useState('');
  const [form,        setForm]        = useState({ supplier:'', expectedDelivery:'', notes:'', items:[] });

  useEffect(()=>{
    const unsub = subscribePurchaseOrders((data)=>{ setPos(data); setLoading(false); });
    return unsub;
  },[]);
  useEffect(()=>{
    const unsub = subscribeSuppliers((data)=>{
      setSuppliers(data);
      setForm(f => f.supplier ? f : { ...f, supplier: data[0]?.name || '' });
    });
    return unsub;
  },[]);
  useEffect(()=>{
    const unsub = subscribeIngredients((data)=>setIngredients(data));
    return unsub;
  },[]);

  const showToast = msg => { setToast(msg); setTimeout(()=>setToast(''),3000); };

  const firstIngredient = () => ingredients[0] || {name:'',unit:'pcs',costPerUnit:0};

  const addItem = () => {
    const ing = firstIngredient();
    setForm(f=>({...f, items:[...f.items,{name:ing.name,qty:1,unit:ing.unit||'pcs',cost:ing.costPerUnit||0}]}));
  };
  const removeItem = i => setForm(f=>({...f, items:f.items.filter((_,j)=>j!==i)}));
  const updateItem = (i,field,val) => {
    const items = [...form.items];
    items[i] = {...items[i],[field]:val};
    if (field==='name') {
      const ing = ingredients.find(x=>x.name===val);
      if (ing) { items[i].unit=ing.unit; items[i].cost=ing.costPerUnit; }
    }
    setForm(f=>({...f,items}));
  };

  const handleCreate = async () => {
    if (!form.supplier) { showToast('Add a supplier first'); return; }
    if (!form.items.length) { showToast('Add at least one item'); return; }
    if (form.items.some(i=>!i.qty||i.qty<=0)) { showToast('Enter valid quantities'); return; }
    const items = form.items.map(i=>({name:i.name,qty:parseFloat(i.qty),unit:i.unit,cost:parseFloat(i.cost)}));
    const total = items.reduce((s,i)=>s+i.qty*i.cost,0);
    try {
      await createPO({
        supplier: form.supplier,
        items,
        total,
        notes: form.notes,
        expectedDelivery: form.expectedDelivery || 'TBD',
      }, staffId);
      setForm({supplier:suppliers[0]?.name||'',expectedDelivery:'',notes:'',items:[]});
      setShowModal(false);
      showToast('Purchase order created');
    } catch (e) {
      showToast('Create failed'); console.error(e);
    }
  };

  // Add received items into stock (match by ingredient name)
  const receiveIntoStock = async (po) => {
    for (const item of (po.items||[])) {
      const ing = ingredients.find(x=>x.name===item.name);
      if (ing) {
        const newStock = (parseFloat(ing.currentStock)||0) + (parseFloat(item.qty)||0);
        try {
          await updateStock(ing.id, newStock, 'PO received: '+po.poNumber, staffId);
        } catch (e) { console.error('stock update failed for', item.name, e); }
      }
    }
  };

  const handleAdvanceStatus = async (po) => {
    const next = STATUS_FLOW[po.status];
    if (!next) return;
    try {
      await updatePOStatus(po.id, next);
      if (next==='received') {
        await receiveIntoStock(po);
        showToast('PO received — stock updated');
      } else {
        showToast('PO marked as sent to supplier');
      }
    } catch (e) {
      showToast('Update failed'); console.error(e);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this purchase order?')) return;
    try {
      await updatePOStatus(id, 'cancelled');
      showToast('Purchase order cancelled');
    } catch (e) {
      showToast('Cancel failed'); console.error(e);
    }
  };

  const exportCSV = () => {
    const rows=[['PO Number','Supplier','Status','Items','Total (₹)','Created','Expected','Received'],...filtered.map(po=>[po.poNumber,po.supplier,po.status,(po.items||[]).length,po.total,fmtDate(po.createdAt),po.expectedDelivery,po.receivedAt?fmtDate(po.receivedAt):'—'])];
    const blob=new Blob([rows.map(r=>r.join(',')).join('\n')],{type:'text/csv'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
    a.download='BlueBliss-POs-'+new Date().toISOString().split('T')[0]+'.csv'; a.click();
    showToast('PO report exported');
  };

  const filtered = useMemo(()=>{
    let list=[...pos];
    if(filterStatus!=='all') list=list.filter(p=>p.status===filterStatus);
    if(search.trim()) list=list.filter(p=>(p.poNumber||'').toLowerCase().includes(search.toLowerCase())||(p.supplier||'').toLowerCase().includes(search.toLowerCase()));
    return list;
  },[pos,filterStatus,search]);

  const stats = {
    total:   pos.length,
    draft:   pos.filter(p=>p.status==='draft').length,
    sent:    pos.filter(p=>p.status==='sent').length,
    received:pos.filter(p=>p.status==='received').length,
    value:   pos.filter(p=>p.status!=='cancelled').reduce((s,p)=>s+(p.total||0),0),
  };

  const formTotal = form.items.reduce((s,i)=>s+(parseFloat(i.qty)||0)*(parseFloat(i.cost)||0),0);

  return (
    <div className="po-page">
      {toast&&<div className="po-toast">{toast}</div>}

      <div className="po-header">
        <div><p className="po-eyebrow">Procurement</p><h1 className="po-title">Purchase Orders</h1><p className="po-sub">Create, track and receive supplier orders</p></div>
        <div className="po-hactions">
          <button className="po-btn-exp" onClick={exportCSV}>📊 Export CSV</button>
          <button className="po-btn-new" onClick={()=>setShowModal(true)}>+ New PO</button>
        </div>
      </div>

      <div className="po-stats">
        {[
          {l:'Total POs',    v:stats.total,    a:'primary', i:'🛒'},
          {l:'Draft',        v:stats.draft,    a:'blue',    i:'📝'},
          {l:'Sent',         v:stats.sent,     a:'orange',  i:'📤'},
          {l:'Received',     v:stats.received, a:'green',   i:'✅'},
          {l:'Total Value',  v:'₹'+Math.round(stats.value/1000)+'k', a:'gold', i:'💰'},
        ].map((s,i)=>(
          <div key={i} className={'po-stat po-stat-'+s.a} style={{animationDelay:i*.08+'s'}}>
            <span>{s.i}</span><p className="po-stat-val">{s.v}</p><p className="po-stat-lbl">{s.l}</p>
          </div>
        ))}
      </div>

      <div className="po-controls">
        <input className="po-search" placeholder="🔍 Search by PO number or supplier…" value={search} onChange={e=>setSearch(e.target.value)}/>
        <div className="po-ftabs">
          {[{k:'all',l:'All'},{k:'draft',l:'Draft'},{k:'sent',l:'Sent'},{k:'received',l:'Received'},{k:'cancelled',l:'Cancelled'}].map(f=>(
            <button key={f.k} className={'po-ftab'+(filterStatus===f.k?' active':'')+' pft-'+f.k} onClick={()=>setFilterStatus(f.k)}>{f.l}</button>
          ))}
        </div>
      </div>

      <div className="po-list">
        {loading && <div className="po-empty"><span>⏳</span><p>Loading orders…</p></div>}
        {!loading && filtered.length===0 && (
          <div className="po-empty"><span>🛒</span><p>{pos.length===0 ? 'No purchase orders yet — create your first one' : 'No orders match your filters'}</p></div>
        )}
        {filtered.map((po,i)=>(
          <div key={po.id} className={'po-card po-card-'+po.status} style={{animationDelay:i*.07+'s'}}>
            <div className="po-card-head">
              <div className="po-card-head-left">
                <div>
                  <p className="po-po-num">{po.poNumber}</p>
                  <p className="po-supplier">{po.supplier}</p>
                </div>
              </div>
              <div className="po-card-head-right">
                <span className={'po-status-badge psb-'+po.status}>{STATUS_LABEL[po.status]}</span>
                <p className="po-total">₹{(po.total||0).toLocaleString('en-IN')}</p>
              </div>
            </div>

            <div className="po-card-body">
              <div className="po-items-preview">
                {(po.items||[]).slice(0,3).map((item,j)=>(
                  <span key={j} className="po-item-tag">{item.name} ×{item.qty}</span>
                ))}
                {(po.items||[]).length>3&&<span className="po-item-tag po-more">+{po.items.length-3} more</span>}
              </div>
              <div className="po-meta">
                <span>📅 Created: {fmtDate(po.createdAt)}</span>
                <span>🚚 Expected: {po.expectedDelivery}</span>
                {po.receivedAt&&<span>✅ Received: {fmtDate(po.receivedAt)}</span>}
                {po.notes&&<span>📝 {po.notes}</span>}
              </div>
            </div>

            <div className="po-card-foot">
              <button className="po-btn-detail" onClick={()=>setShowDetail(po)}>View Details</button>
              {STATUS_FLOW[po.status]&&(
                <button className={'po-btn-advance pba-'+STATUS_FLOW[po.status]} onClick={()=>handleAdvanceStatus(po)}>
                  {STATUS_FLOW[po.status]==='sent'?'📤 Mark as Sent':'✅ Mark as Received'}
                </button>
              )}
              {(po.status==='draft'||po.status==='sent')&&(
                <button className="po-btn-cancel-po" onClick={()=>handleCancel(po.id)}>Cancel</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showModal&&(
        <div className="po-overlay" onClick={()=>setShowModal(false)}>
          <div className="po-modal" onClick={e=>e.stopPropagation()}>
            <div className="po-modal-hd">
              <div><p className="po-eyebrow">New Order</p><h2 className="po-modal-title">Create Purchase Order</h2></div>
              <button className="po-modal-x" onClick={()=>setShowModal(false)}>✕</button>
            </div>
            <div className="po-mform">
              {suppliers.length===0 && (
                <p style={{fontSize:13,color:'var(--inv-orange)',marginBottom:10}}>⚠️ No suppliers yet. Add suppliers in the Suppliers page first.</p>
              )}
              {ingredients.length===0 && (
                <p style={{fontSize:13,color:'var(--inv-orange)',marginBottom:10}}>⚠️ No ingredients yet. Add ingredients in Stock Control first.</p>
              )}
              <div className="po-mfrow">
                <div className="po-mf"><label>Supplier</label>
                  <select className="po-minp" value={form.supplier} onChange={e=>setForm({...form,supplier:e.target.value})}>
                    {suppliers.length===0 && <option value="">No suppliers</option>}
                    {suppliers.map(s=><option key={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="po-mf"><label>Expected Delivery</label>
                  <input className="po-minp" type="date" value={form.expectedDelivery} onChange={e=>setForm({...form,expectedDelivery:e.target.value})}/>
                </div>
              </div>
              <div className="po-mf"><label>Notes</label>
                <input className="po-minp" type="text" placeholder="e.g., Urgent restock, weekly order…" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/>
              </div>

              <div className="po-items-section">
                <div className="po-items-hd">
                  <p className="po-items-title">Order Items</p>
                  <button className="po-btn-add-item" onClick={addItem} disabled={ingredients.length===0}>+ Add Item</button>
                </div>
                {form.items.length===0&&<p className="po-no-items">No items added. Click + Add Item.</p>}
                {form.items.map((item,i)=>(
                  <div key={i} className="po-item-row">
                    <select className="po-minp po-item-sel" value={item.name} onChange={e=>updateItem(i,'name',e.target.value)}>
                      {ingredients.map(ing=><option key={ing.id}>{ing.name}</option>)}
                    </select>
                    <input className="po-minp po-item-qty" type="number" placeholder="Qty" min="1"
                      value={item.qty} onChange={e=>updateItem(i,'qty',e.target.value)}/>
                    <span className="po-item-unit">{item.unit}</span>
                    <span className="po-item-cost">₹{((parseFloat(item.qty)||0)*(parseFloat(item.cost)||0)).toFixed(0)}</span>
                    <button className="po-item-del" onClick={()=>removeItem(i)}>✕</button>
                  </div>
                ))}
                {form.items.length>0&&(
                  <div className="po-form-total">
                    <span>Total Amount:</span>
                    <span className="po-form-total-val">₹{formTotal.toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="po-mactions">
              <button className="po-btn-confirm" onClick={handleCreate}>Create PO</button>
              <button className="po-btn-cx" onClick={()=>setShowModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showDetail&&(
        <div className="po-overlay" onClick={()=>setShowDetail(null)}>
          <div className="po-modal po-detail-modal" onClick={e=>e.stopPropagation()}>
            <div className="po-modal-hd">
              <div>
                <p className="po-eyebrow">{showDetail.supplier}</p>
                <h2 className="po-modal-title">{showDetail.poNumber}</h2>
              </div>
              <div style={{display:'flex',gap:10,alignItems:'center'}}>
                <span className={'po-status-badge psb-'+showDetail.status}>{STATUS_LABEL[showDetail.status]}</span>
                <button className="po-modal-x" onClick={()=>setShowDetail(null)}>✕</button>
              </div>
            </div>
            <div className="po-detail-meta">
              {[['Created',fmtDate(showDetail.createdAt)],['Expected',showDetail.expectedDelivery],['Received',showDetail.receivedAt?fmtDate(showDetail.receivedAt):'—'],['Notes',showDetail.notes||'—']].map(([l,v],i)=>(
                <div key={i} className="po-detail-meta-item"><p className="po-detail-lbl">{l}</p><p className="po-detail-val">{v}</p></div>
              ))}
            </div>
            <div className="po-detail-items">
              <p className="po-items-title">Order Items</p>
              <table className="po-detail-table">
                <thead><tr><th>Item</th><th>Qty</th><th>Unit</th><th>Cost/Unit</th><th>Total</th></tr></thead>
                <tbody>
                  {(showDetail.items||[]).map((item,i)=>(
                    <tr key={i}>
                      <td className="po-dt-name">{item.name}</td>
                      <td>{item.qty}</td>
                      <td>{item.unit}</td>
                      <td>₹{item.cost}</td>
                      <td className="po-dt-total">₹{(item.qty*item.cost).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="po-detail-grand">
                <span>Grand Total</span>
                <span className="po-detail-grand-val">₹{(showDetail.total||0).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}