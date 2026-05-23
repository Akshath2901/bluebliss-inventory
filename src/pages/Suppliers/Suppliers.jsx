import React, { useState, useMemo, useEffect } from 'react';
import './Suppliers.css';
import { subscribeSuppliers, addSupplier as fbAddSupplier, updateSupplier as fbUpdateSupplier, deleteSupplier as fbDeleteSupplier } from '../../lib/firebase.js';
import { useAuth } from '../../context/AuthContext.jsx';

const CATEGORIES = ['All','Proteins','Vegetables','Bakery','Dairy','Condiments','Beverages'];

const INIT_SUPPLIERS = [
  { id:1, name:'Fresh Farms', contact:'Ravi Kumar', phone:'98765 43210', email:'ravi@freshfarms.in', address:'Secunderabad, Hyderabad', category:'Proteins', ingredients:['Chicken Patty','Mutton Patty'], leadTimeDays:1, rating:4.8, paymentTerms:'Net 7', totalOrders:24, totalSpent:186000, lastOrder:'May 10, 2026', notes:'Reliable, always on time. Call before 10am.' },
  { id:2, name:'Green Valley', contact:'Sunita Rao', phone:'91234 56789', email:'sunita@greenvalley.in', address:'LB Nagar, Hyderabad', category:'Vegetables', ingredients:['Lettuce','Tomato','Onion'], leadTimeDays:1, rating:4.5, paymentTerms:'Net 14', totalOrders:18, totalSpent:72000, lastOrder:'May 11, 2026', notes:'Fresh produce daily. WhatsApp orders preferred.' },
  { id:3, name:'Bake House', contact:'Ahmed Khan', phone:'87654 32109', email:'ahmed@bakehouse.in', address:'Jubilee Hills, Hyderabad', category:'Bakery', ingredients:['Burger Bun','Pizza Base'], leadTimeDays:2, rating:4.2, paymentTerms:'Cash on delivery', totalOrders:15, totalSpent:61500, lastOrder:'May 9, 2026', notes:'Order 2 days in advance. Minimum order 100 pcs.' },
  { id:4, name:'Dairy Direct', contact:'Meera Sharma', phone:'76543 21098', email:'meera@dairydirect.in', address:'Begumpet, Hyderabad', category:'Dairy', ingredients:['Cheese Slice','Mozzarella'], leadTimeDays:1, rating:4.6, paymentTerms:'Net 7', totalOrders:20, totalSpent:148000, lastOrder:'May 11, 2026', notes:'Cold chain maintained. Early morning delivery.' },
  { id:5, name:'Spice Route', contact:'Farhan Ali', phone:'65432 10987', email:'farhan@spiceroute.in', address:'Old City, Hyderabad', category:'Condiments', ingredients:['Tandoori Sauce'], leadTimeDays:3, rating:4.0, paymentTerms:'Net 30', totalOrders:8, totalSpent:38400, lastOrder:'May 5, 2026', notes:'Bulk orders get 10% discount.' },
  { id:6, name:'Metro Cash & Carry', contact:'Manager', phone:'044-12345678', email:'hyd@metro.in', address:'Kukatpally, Hyderabad', category:'Vegetables', ingredients:['Onion','Tomato','Lettuce'], leadTimeDays:0, rating:4.3, paymentTerms:'Cash', totalOrders:12, totalSpent:28000, lastOrder:'May 8, 2026', notes:'Self pickup. Open 6am–10pm.' },
];

function StarRating({ rating }) {
  return (
    <div className="sp-stars">
      {[1,2,3,4,5].map(i => (
        <span key={i} className={'sp-star'+(i<=Math.round(rating)?' sp-star-on':'')}>★</span>
      ))}
      <span className="sp-rating-num">{rating}</span>
    </div>
  );
}

export default function Suppliers() {
  const [suppliers,   setSuppliers]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const unsub = subscribeSuppliers(data => { setSuppliers(data); setLoading(false); });
    return unsub;
  }, []);
  const [showModal,   setShowModal]   = useState(false);
  const [showDetail,  setShowDetail]  = useState(null);
  const [editingId,   setEditingId]   = useState(null);
  const [search,      setSearch]      = useState('');
  const [filterCat,   setFilterCat]   = useState('All');
  const [toast,       setToast]       = useState('');
  const [form,        setForm]        = useState({ name:'', contact:'', phone:'', email:'', address:'', category:'Proteins', ingredients:'', leadTimeDays:1, rating:4.5, paymentTerms:'Net 7', notes:'' });

  const showToast = msg => { setToast(msg); setTimeout(()=>setToast(''),3000); };

  const handleAdd = () => {
    if (!form.name.trim()) { showToast('Enter supplier name'); return; }
    const newS = { ...form, id:Date.now(), ingredients:form.ingredients.split(',').map(s=>s.trim()).filter(Boolean), leadTimeDays:parseInt(form.leadTimeDays)||1, rating:parseFloat(form.rating)||4.0, totalOrders:0, totalSpent:0, lastOrder:'Never' };
    if (editingId) {
      setSuppliers(p=>p.map(s=>s.id===editingId?{...s,...newS,id:editingId}:s));
      showToast('Supplier updated');
    } else {
      setSuppliers(p=>[newS,...p]);
      showToast('Supplier added');
    }
    setForm({name:'',contact:'',phone:'',email:'',address:'',category:'Proteins',ingredients:'',leadTimeDays:1,rating:4.5,paymentTerms:'Net 7',notes:''});
    setShowModal(false); setEditingId(null);
  };

  const handleEdit = s => {
    setEditingId(s.id);
    setForm({...s, ingredients:s.ingredients.join(', ')});
    setShowModal(true);
  };

  const handleDelete = id => {
    if (!window.confirm('Remove this supplier?')) return;
    setSuppliers(p=>p.filter(s=>s.id!==id));
    setShowDetail(null); showToast('Supplier removed');
  };

  const exportCSV = () => {
    const rows=[['Name','Contact','Phone','Email','Category','Lead Time','Rating','Payment Terms','Total Orders','Total Spent','Last Order'],...filtered.map(s=>[s.name,s.contact,s.phone,s.email,s.category,s.leadTimeDays+'d',s.rating,s.paymentTerms,s.totalOrders,'₹'+s.totalSpent,s.lastOrder])];
    const blob=new Blob([rows.map(r=>r.join(',')).join('\n')],{type:'text/csv'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='BlueBliss-Suppliers-'+new Date().toISOString().split('T')[0]+'.csv';a.click();
    showToast('Suppliers exported');
  };

  const filtered = useMemo(()=>{
    let list=[...suppliers];
    if(search.trim()) list=list.filter(s=>s.name.toLowerCase().includes(search.toLowerCase())||s.contact.toLowerCase().includes(search.toLowerCase())||s.ingredients.some(i=>i.toLowerCase().includes(search.toLowerCase())));
    if(filterCat!=='All') list=list.filter(s=>s.category===filterCat);
    return list;
  },[suppliers,search,filterCat]);

  const stats = {
    total:      suppliers.length,
    avgRating:  (suppliers.reduce((s,x)=>s+x.rating,0)/suppliers.length).toFixed(1),
    totalSpent: suppliers.reduce((s,x)=>s+x.totalSpent,0),
    fastestLead:Math.min(...suppliers.map(s=>s.leadTimeDays)),
  };

  return (
    <div className="sp-page">
      {toast&&<div className="sp-toast">{toast}</div>}

      <div className="sp-header">
        <div><p className="sp-eyebrow">Procurement</p><h1 className="sp-title">Suppliers</h1><p className="sp-sub">Manage supplier contacts, ratings and order history</p></div>
        <div className="sp-hactions">
          <button className="sp-btn-exp" onClick={exportCSV}>📊 Export CSV</button>
          <button className="sp-btn-add" onClick={()=>{setEditingId(null);setForm({name:'',contact:'',phone:'',email:'',address:'',category:'Proteins',ingredients:'',leadTimeDays:1,rating:4.5,paymentTerms:'Net 7',notes:''});setShowModal(true);}}>+ Add Supplier</button>
        </div>
      </div>

      <div className="sp-stats">
        {[
          {l:'Total Suppliers', v:stats.total,              a:'primary', i:'🏭'},
          {l:'Avg Rating',      v:stats.avgRating+'★',      a:'gold',    i:'⭐'},
          {l:'Total Spent',     v:'₹'+Math.round(stats.totalSpent/1000)+'k', a:'green', i:'💰'},
          {l:'Fastest Lead',    v:stats.fastestLead+'d',    a:'blue',    i:'⚡'},
        ].map((s,i)=>(
          <div key={i} className={'sp-stat sp-stat-'+s.a} style={{animationDelay:i*.08+'s'}}>
            <span className="sp-stat-icon">{s.i}</span>
            <p className="sp-stat-val">{s.v}</p>
            <p className="sp-stat-lbl">{s.l}</p>
          </div>
        ))}
      </div>

      <div className="sp-controls">
        <input className="sp-search" placeholder="🔍 Search suppliers or ingredients…" value={search} onChange={e=>setSearch(e.target.value)}/>
        <div className="sp-ftabs">
          {CATEGORIES.map(c=>(
            <button key={c} className={'sp-ftab'+(filterCat===c?' active':'')} onClick={()=>setFilterCat(c)}>{c}</button>
          ))}
        </div>
      </div>

      <div className="sp-grid">
        {filtered.length===0&&<div className="sp-empty"><span>🏭</span><p>No suppliers found</p></div>}
        {filtered.map((s,i)=>(
          <div key={s.id} className="sp-card" style={{animationDelay:i*.07+'s'}}>
            <div className="sp-card-head">
              <div className="sp-card-avatar">{s.name.charAt(0)}</div>
              <div className="sp-card-info">
                <h3 className="sp-card-name">{s.name}</h3>
                <p className="sp-card-contact">{s.contact}</p>
              </div>
              <span className="sp-cat-badge">{s.category}</span>
            </div>

            <StarRating rating={s.rating}/>

            <div className="sp-card-details">
              <div className="sp-detail-row"><span>📞</span><a href={'tel:'+s.phone} className="sp-phone">{s.phone}</a></div>
              <div className="sp-detail-row"><span>📧</span><span>{s.email}</span></div>
              <div className="sp-detail-row"><span>📍</span><span>{s.address}</span></div>
              <div className="sp-detail-row"><span>⚡</span><span>{s.leadTimeDays===0?'Same day':s.leadTimeDays+'d lead time'}</span></div>
              <div className="sp-detail-row"><span>💳</span><span>{s.paymentTerms}</span></div>
            </div>

            <div className="sp-ingredients">
              {s.ingredients.map((ing,j)=>(
                <span key={j} className="sp-ing-tag">{ing}</span>
              ))}
            </div>

            <div className="sp-card-metrics">
              <div className="sp-metric">
                <p className="sp-metric-val">{s.totalOrders}</p>
                <p className="sp-metric-lbl">Orders</p>
              </div>
              <div className="sp-metric">
                <p className="sp-metric-val">₹{Math.round(s.totalSpent/1000)}k</p>
                <p className="sp-metric-lbl">Total Spent</p>
              </div>
              <div className="sp-metric">
                <p className="sp-metric-val">{s.lastOrder}</p>
                <p className="sp-metric-lbl">Last Order</p>
              </div>
            </div>

            <div className="sp-card-actions">
              <button className="sp-btn-view" onClick={()=>setShowDetail(s)}>View Details</button>
              <button className="sp-btn-edit" onClick={()=>handleEdit(s)}>✏️ Edit</button>
              <button className="sp-btn-call" onClick={()=>window.open('tel:'+s.phone)}>📞</button>
            </div>
          </div>
        ))}
      </div>

      {showDetail&&(
        <div className="sp-overlay" onClick={()=>setShowDetail(null)}>
          <div className="sp-modal" onClick={e=>e.stopPropagation()}>
            <div className="sp-modal-hd">
              <div className="sp-modal-avatar">{showDetail.name.charAt(0)}</div>
              <div>
                <p className="sp-eyebrow">{showDetail.category}</p>
                <h2 className="sp-modal-title">{showDetail.name}</h2>
                <StarRating rating={showDetail.rating}/>
              </div>
              <button className="sp-modal-x" onClick={()=>setShowDetail(null)}>✕</button>
            </div>
            <div className="sp-detail-grid">
              {[['Contact',showDetail.contact],['Phone',showDetail.phone],['Email',showDetail.email],['Address',showDetail.address],['Lead Time',showDetail.leadTimeDays===0?'Same day':showDetail.leadTimeDays+' days'],['Payment',showDetail.paymentTerms],['Total Orders',showDetail.totalOrders],['Total Spent','₹'+showDetail.totalSpent.toLocaleString('en-IN')],['Last Order',showDetail.lastOrder]].map(([l,v],i)=>(
                <div key={i} className="sp-dg-item"><p className="sp-dg-lbl">{l}</p><p className="sp-dg-val">{v}</p></div>
              ))}
            </div>
            <div className="sp-detail-ings">
              <p className="sp-eyebrow">Supplies</p>
              <div className="sp-ingredients">{showDetail.ingredients.map((ing,i)=><span key={i} className="sp-ing-tag">{ing}</span>)}</div>
            </div>
            {showDetail.notes&&(
              <div className="sp-detail-notes">
                <p className="sp-eyebrow">Notes</p>
                <p className="sp-notes-text">{showDetail.notes}</p>
              </div>
            )}
            <div className="sp-detail-actions">
              <button className="sp-btn-confirm" onClick={()=>{handleEdit(showDetail);setShowDetail(null);}}>✏️ Edit Supplier</button>
              <button className="sp-btn-del-full" onClick={()=>handleDelete(showDetail.id)}>🗑️ Remove</button>
            </div>
          </div>
        </div>
      )}

      {showModal&&(
        <div className="sp-overlay" onClick={()=>{setShowModal(false);setEditingId(null);}}>
          <div className="sp-modal" onClick={e=>e.stopPropagation()}>
            <div className="sp-modal-hd">
              <div><p className="sp-eyebrow">{editingId?'Edit':'New'} Supplier</p><h2 className="sp-modal-title">{editingId?'Update Supplier':'Add Supplier'}</h2></div>
              <button className="sp-modal-x" onClick={()=>{setShowModal(false);setEditingId(null);}}>✕</button>
            </div>
            <div className="sp-mform">
              <div className="sp-mfrow">
                <div className="sp-mf"><label>Company Name</label><input className="sp-minp" type="text" placeholder="e.g., Fresh Farms" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
                <div className="sp-mf"><label>Contact Person</label><input className="sp-minp" type="text" placeholder="Full name" value={form.contact} onChange={e=>setForm({...form,contact:e.target.value})}/></div>
              </div>
              <div className="sp-mfrow">
                <div className="sp-mf"><label>Phone</label><input className="sp-minp" type="tel" placeholder="98765 43210" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></div>
                <div className="sp-mf"><label>Email</label><input className="sp-minp" type="email" placeholder="email@example.com" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></div>
              </div>
              <div className="sp-mf"><label>Address</label><input className="sp-minp" type="text" placeholder="Area, City" value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/></div>
              <div className="sp-mfrow">
                <div className="sp-mf"><label>Category</label>
                  <select className="sp-minp" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>
                    {CATEGORIES.filter(c=>c!=='All').map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="sp-mf"><label>Lead Time (days)</label><input className="sp-minp" type="number" min="0" max="30" value={form.leadTimeDays} onChange={e=>setForm({...form,leadTimeDays:e.target.value})}/></div>
              </div>
              <div className="sp-mfrow">
                <div className="sp-mf"><label>Payment Terms</label><input className="sp-minp" type="text" placeholder="Net 7, Cash, etc." value={form.paymentTerms} onChange={e=>setForm({...form,paymentTerms:e.target.value})}/></div>
                <div className="sp-mf"><label>Rating (1-5)</label><input className="sp-minp" type="number" min="1" max="5" step="0.1" value={form.rating} onChange={e=>setForm({...form,rating:e.target.value})}/></div>
              </div>
              <div className="sp-mf"><label>Ingredients Supplied (comma separated)</label><input className="sp-minp" type="text" placeholder="Chicken Patty, Mutton Patty" value={form.ingredients} onChange={e=>setForm({...form,ingredients:e.target.value})}/></div>
              <div className="sp-mf"><label>Notes</label><input className="sp-minp" type="text" placeholder="Any special instructions…" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></div>
            </div>
            <div className="sp-mactions">
              <button className="sp-btn-confirm" onClick={handleAdd}>{editingId?'Update Supplier':'Add Supplier'}</button>
              <button className="sp-btn-cx" onClick={()=>{setShowModal(false);setEditingId(null);}}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}