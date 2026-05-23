import React, { useState, useMemo } from 'react';
import './PurchaseOrders.css';

const INGREDIENTS = [
  {name:'Chicken Patty',unit:'pcs',cost:45},{name:'Lettuce',unit:'kg',cost:80},
  {name:'Burger Bun',unit:'pcs',cost:8},{name:'Mutton Patty',unit:'pcs',cost:90},
  {name:'Cheese Slice',unit:'pcs',cost:15},{name:'Tomato',unit:'kg',cost:40},
  {name:'Tandoori Sauce',unit:'L',cost:120},{name:'Pizza Base',unit:'pcs',cost:25},
  {name:'Mozzarella',unit:'kg',cost:280},{name:'Onion',unit:'kg',cost:30},
];
const SUPPLIERS = ['Fresh Farms','Green Valley','Bake House','Dairy Direct','Spice Route','Metro Cash & Carry'];
const STATUS_FLOW = {draft:'sent',sent:'received'};
const STATUS_COLOR = {draft:'blue',sent:'orange',received:'green',cancelled:'red'};
const STATUS_LABEL = {draft:'Draft',sent:'Sent',received:'Received',cancelled:'Cancelled'};

const INIT_POS = [
  { id:1, poNumber:'PO-202605-001', supplier:'Fresh Farms', status:'received',
    items:[{name:'Chicken Patty',qty:100,unit:'pcs',cost:45},{name:'Mutton Patty',qty:50,unit:'pcs',cost:90}],
    total:9000, notes:'Urgent restock', createdAt:'May 8, 2026', expectedDelivery:'May 10, 2026', receivedAt:'May 10, 2026' },
  { id:2, poNumber:'PO-202605-002', supplier:'Green Valley', status:'sent',
    items:[{name:'Lettuce',qty:20,unit:'kg',cost:80},{name:'Tomato',qty:30,unit:'kg',cost:40},{name:'Onion',qty:40,unit:'kg',cost:30}],
    total:4400, notes:'Weekly vegetables', createdAt:'May 10, 2026', expectedDelivery:'May 12, 2026', receivedAt:null },
  { id:3, poNumber:'PO-202605-003', supplier:'Bake House', status:'draft',
    items:[{name:'Burger Bun',qty:200,unit:'pcs',cost:8},{name:'Pizza Base',qty:100,unit:'pcs',cost:25}],
    total:4100, notes:'', createdAt:'May 11, 2026', expectedDelivery:'May 13, 2026', receivedAt:null },
  { id:4, poNumber:'PO-202605-004', supplier:'Dairy Direct', status:'draft',
    items:[{name:'Cheese Slice',qty:150,unit:'pcs',cost:15},{name:'Mozzarella',qty:10,unit:'kg',cost:280}],
    total:5050, notes:'For weekend', createdAt:'May 11, 2026', expectedDelivery:'May 14, 2026', receivedAt:null },
];

let poCounter = 5;
const genPONumber = () => { const n = `PO-202605-00${poCounter++}`; return n; };

export default function PurchaseOrders() {
  const [pos,        setPos]        = useState(INIT_POS);
  const [showModal,  setShowModal]  = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [filterStatus,setFilterStatus]=useState('all');
  const [search,     setSearch]     = useState('');
  const [toast,      setToast]      = useState('');
  const [form,       setForm]       = useState({ supplier:'Fresh Farms', expectedDelivery:'', notes:'', items:[] });

  const showToast = msg => { setToast(msg); setTimeout(()=>setToast(''),3000); };

  const addItem = () => setForm(f=>({...f, items:[...f.items,{name:'Chicken Patty',qty:1,unit:'pcs',cost:45}]}));
  const removeItem = i => setForm(f=>({...f, items:f.items.filter((_,j)=>j!==i)}));
  const updateItem = (i,field,val) => {
    const items = [...form.items];
    items[i] = {...items[i],[field]:val};
    if (field==='name') {
      const ing = INGREDIENTS.find(x=>x.name===val);
      if (ing) { items[i].unit=ing.unit; items[i].cost=ing.cost; }
    }
    setForm(f=>({...f,items}));
  };

  const handleCreate = () => {
    if (!form.items.length) { showToast('Add at least one item'); return; }
    if (form.items.some(i=>!i.qty||i.qty<=0)) { showToast('Enter valid quantities'); return; }
    const total = form.items.reduce((s,i)=>s+parseFloat(i.qty)*parseFloat(i.cost),0);
    const newPO = {
      id: Date.now(), poNumber: genPONumber(), supplier: form.supplier,
      status:'draft', items: form.items.map(i=>({...i,qty:parseFloat(i.qty),cost:parseFloat(i.cost)})),
      total, notes:form.notes, createdAt:'Today',
      expectedDelivery:form.expectedDelivery||'TBD', receivedAt:null,
    };
    setPos(p=>[newPO,...p]);
    setForm({supplier:'Fresh Farms',expectedDelivery:'',notes:'',items:[]});
    setShowModal(false);
    showToast('Purchase order created');
  };

  const handleAdvanceStatus = id => {
    setPos(p=>p.map(po=>{
      if (po.id!==id) return po;
      const next = STATUS_FLOW[po.status];
      if (!next) return po;
      return {...po, status:next, receivedAt:next==='received'?'Today':po.receivedAt};
    }));
    const po = pos.find(p=>p.id===id);
    const next = STATUS_FLOW[po?.status];
    showToast(next==='received'?'PO marked as received — stock updated':'PO marked as sent to supplier');
  };

  const handleCancel = id => {
    if (!window.confirm('Cancel this purchase order?')) return;
    setPos(p=>p.map(po=>po.id===id?{...po,status:'cancelled'}:po));
    showToast('Purchase order cancelled');
  };

  const exportCSV = () => {
    const rows=[['PO Number','Supplier','Status','Items','Total (₹)','Created','Expected','Received'],...filtered.map(po=>[po.poNumber,po.supplier,po.status,po.items.length,po.total,po.createdAt,po.expectedDelivery,po.receivedAt||'—'])];
    const blob=new Blob([rows.map(r=>r.join(',')).join('\n')],{type:'text/csv'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
    a.download='BlueBliss-POs-'+new Date().toISOString().split('T')[0]+'.csv'; a.click();
    showToast('PO report exported');
  };

  const filtered = useMemo(()=>{
    let list=[...pos];
    if(filterStatus!=='all') list=list.filter(p=>p.status===filterStatus);
    if(search.trim()) list=list.filter(p=>p.poNumber.toLowerCase().includes(search.toLowerCase())||p.supplier.toLowerCase().includes(search.toLowerCase()));
    return list;
  },[pos,filterStatus,search]);

  const stats = {
    total:   pos.length,
    draft:   pos.filter(p=>p.status==='draft').length,
    sent:    pos.filter(p=>p.status==='sent').length,
    received:pos.filter(p=>p.status==='received').length,
    value:   pos.filter(p=>p.status!=='cancelled').reduce((s,p)=>s+p.total,0),
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
        {filtered.length===0&&<div className="po-empty"><span>🛒</span><p>No purchase orders found</p></div>}
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
                <p className="po-total">₹{po.total.toLocaleString('en-IN')}</p>
              </div>
            </div>

            <div className="po-card-body">
              <div className="po-items-preview">
                {po.items.slice(0,3).map((item,j)=>(
                  <span key={j} className="po-item-tag">{item.name} ×{item.qty}</span>
                ))}
                {po.items.length>3&&<span className="po-item-tag po-more">+{po.items.length-3} more</span>}
              </div>
              <div className="po-meta">
                <span>📅 Created: {po.createdAt}</span>
                <span>🚚 Expected: {po.expectedDelivery}</span>
                {po.receivedAt&&<span>✅ Received: {po.receivedAt}</span>}
                {po.notes&&<span>📝 {po.notes}</span>}
              </div>
            </div>

            <div className="po-card-foot">
              <button className="po-btn-detail" onClick={()=>setShowDetail(po)}>View Details</button>
              {STATUS_FLOW[po.status]&&(
                <button className={'po-btn-advance pba-'+STATUS_FLOW[po.status]} onClick={()=>handleAdvanceStatus(po.id)}>
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
              <div className="po-mfrow">
                <div className="po-mf"><label>Supplier</label>
                  <select className="po-minp" value={form.supplier} onChange={e=>setForm({...form,supplier:e.target.value})}>
                    {SUPPLIERS.map(s=><option key={s}>{s}</option>)}
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
                  <button className="po-btn-add-item" onClick={addItem}>+ Add Item</button>
                </div>
                {form.items.length===0&&<p className="po-no-items">No items added. Click + Add Item.</p>}
                {form.items.map((item,i)=>(
                  <div key={i} className="po-item-row">
                    <select className="po-minp po-item-sel" value={item.name} onChange={e=>updateItem(i,'name',e.target.value)}>
                      {INGREDIENTS.map(ing=><option key={ing.name}>{ing.name}</option>)}
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
              {[['Created',showDetail.createdAt],['Expected',showDetail.expectedDelivery],['Received',showDetail.receivedAt||'—'],['Notes',showDetail.notes||'—']].map(([l,v],i)=>(
                <div key={i} className="po-detail-meta-item"><p className="po-detail-lbl">{l}</p><p className="po-detail-val">{v}</p></div>
              ))}
            </div>
            <div className="po-detail-items">
              <p className="po-items-title">Order Items</p>
              <table className="po-detail-table">
                <thead><tr><th>Item</th><th>Qty</th><th>Unit</th><th>Cost/Unit</th><th>Total</th></tr></thead>
                <tbody>
                  {showDetail.items.map((item,i)=>(
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
                <span className="po-detail-grand-val">₹{showDetail.total.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}