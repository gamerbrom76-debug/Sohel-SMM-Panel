import React, { useEffect, useMemo, useState } from 'react';
import { LayoutDashboard, PlusCircle, ShoppingBag, Layers, Wallet, Headset, Users, Code2, Settings, Bell, Search, Menu, ArrowUpRight, Clock3, CheckCircle2, CircleDollarSign, X, RefreshCw, ShieldCheck } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const demoServices = [
 {id:1,name:'Social media content audit',category:'Consulting',description:'Review public-facing content and provide improvement recommendations.',unit_price:'199.00',min_quantity:1,max_quantity:10},
 {id:2,name:'Content calendar setup',category:'Content Planning',description:'A tailored content calendar for a brand or creator.',unit_price:'499.00',min_quantity:1,max_quantity:5},
 {id:3,name:'Profile optimisation review',category:'Consulting',description:'Recommendations for profile clarity and discoverability.',unit_price:'149.00',min_quantity:1,max_quantity:20},
 {id:4,name:'Campaign reporting setup',category:'Analytics',description:'A reporting template for compliant marketing campaigns.',unit_price:'299.00',min_quantity:1,max_quantity:10}
];
const nav = [
 ['Dashboard',LayoutDashboard],['New Order',PlusCircle],['Orders',ShoppingBag],['Services',Layers],
 ['Add Funds',Wallet],['Support',Headset],['Affiliate',Users],['API',Code2],['Settings',Settings]
];
function money(n){return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(Number(n||0));}
export default function App(){
 const [page,setPage]=useState('Dashboard'),[mobileOpen,setMobileOpen]=useState(false);
 const [services,setServices]=useState(demoServices),[orders,setOrders]=useState([]),[balance,setBalance]=useState(0);
 const [notice,setNotice]=useState(''),[serviceId,setServiceId]=useState(1),[targetUrl,setTargetUrl]=useState(''),[quantity,setQuantity]=useState(1);
 const [loading,setLoading]=useState(false);
 useEffect(()=>{ Promise.all([
 fetch(`${API}/api/services`).then(r=>r.ok?r.json():Promise.reject()).catch(()=>demoServices),
 fetch(`${API}/api/orders?userId=1`).then(r=>r.ok?r.json():[]).catch(()=>[]),
 fetch(`${API}/api/wallet/1`).then(r=>r.ok?r.json():{balance:0}).catch(()=>({balance:0}))
 ]).then(([s,o,w])=>{setServices(Array.isArray(s)&&s.length?s:demoServices);setOrders(Array.isArray(o)?o:[]);setBalance(Number(w.balance||0));}); },[]);
 const selected=services.find(s=>Number(s.id)===Number(serviceId));
 const estimate=useMemo(()=>selected?Number(selected.unit_price)*Number(quantity||0):0,[selected,quantity]);
 async function placeOrder(e){
  e.preventDefault(); setNotice('');
  (!targetUrl || !targetUrl.startsWith('http'))
  if(quantity<selected.min_quantity||quantity>selected.max_quantity){setNotice(`Quantity ${selected.min_quantity} से ${selected.max_quantity} के बीच रखें।`);return;}
  setLoading(true);
  try{
   const r=await fetch(`${API}/api/orders`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:1,serviceId:Number(serviceId),targetUrl,quantity:Number(quantity)})});
   const data=await r.json(); if(!r.ok) throw new Error(data.error||'ऑर्डर नहीं बना।');
   setNotice(`Order #${data.id} सेव हुआ। Provider dispatch अभी configure नहीं है।`);
   setOrders(old=>[{id:data.id,service_name:selected.name,status:data.status,target_url:targetUrl,quantity,amount:data.amount},...old]); setTargetUrl('');
  }catch(err){setNotice(err.message+' (Backend/DB उपलब्ध न हो तो यह starter demo mode है।)');}
  finally{setLoading(false);}
 }
 const Sidebar=()=> <aside className="sidebar"><div className="brand"><span className="brandmark">✦</span><div><b>SOHEL SMM</b><small>MANAGEMENT PANEL</small></div></div><div className="navlabel">WORKSPACE</div>{nav.map(([name,Icon])=><button key={name} onClick={()=>{setPage(name);setMobileOpen(false)}} className={`navitem ${page===name?'active':''}`}><Icon size={18}/><span>{name}</span>{name==='Orders'&&orders.length>0&&<em>{orders.length}</em>}</button>)}<div className="sidebottom"><ShieldCheck size={17}/><span>Secure workspace</span></div></aside>;
 return <div className="app"><Sidebar/>{mobileOpen&&<div className="mobileShade" onClick={()=>setMobileOpen(false)}><div onClick={e=>e.stopPropagation()}><button className="close" onClick={()=>setMobileOpen(false)}><X/></button><Sidebar/></div></div>}
 <main className="main"><header className="topbar"><button className="mobileMenu" onClick={()=>setMobileOpen(true)}><Menu/></button><div><div className="crumb">Workspace / <b>{page}</b></div><h1>{page}</h1></div><div className="topactions"><button className="iconbtn" aria-label="Search"><Search/></button><button className="iconbtn" aria-label="Notifications"><Bell/></button><div className="avatar">S</div></div></header>
 {page==='Dashboard'&&<><section className="welcome"><div><span className="eyebrow">YOUR WORKSPACE</span><h2>Welcome back 👋</h2><p>Manage your services, orders and customer activity in one place.</p></div><button className="primary" onClick={()=>setPage('New Order')}><PlusCircle size={17}/> Create order</button></section>
 <section className="stats"><Stat icon={Wallet} label="Wallet balance" value={money(balance)} tone="purple"/><Stat icon={ShoppingBag} label="Total orders" value={orders.length} tone="blue"/><Stat icon={Clock3} label="Pending orders" value={orders.filter(o=>o.status==='pending'||o.status==='processing').length} tone="amber"/><Stat icon={CheckCircle2} label="Active services" value={services.length} tone="green"/></section>
 <section className="panel"><div className="panelhead"><div><h3>Recent orders</h3><p>Your latest order activity</p></div><button className="textbtn" onClick={()=>setPage('Orders')}>View all <ArrowUpRight size={15}/></button></div><OrderTable orders={orders.slice(0,5)}/></section>
 <section className="notice"><ShieldCheck size={19}/><div><b>Starter project status</b><p>UI and backend foundation included. Real login, verified payments and provider dispatch must be configured before production.</p></div></section></>}
 {page==='New Order'&&<section className="panel formpanel"><div className="panelhead"><div><h3>Create a new order</h3><p>Choose an approved service and provide its destination link.</p></div></div><form onSubmit={placeOrder} className="orderform"><label>Service<select value={serviceId} onChange={e=>setServiceId(e.target.value)}>{services.map(s=><option key={s.id} value={s.id}>{s.category} — {s.name}</option>)}</select></label><div className="serviceinfo">{selected?.description||'Select a service to view details.'}</div><label>Target URL<input value={targetUrl} onChange={e=>setTargetUrl(e.target.value)} placeholder="https://example.com/your-page" required/></label><div className="two"><label>Quantity<input type="number" min={selected?.min_quantity||1} max={selected?.max_quantity||10000} value={quantity} onChange={e=>setQuantity(e.target.value)}/></label><div className="estimate"><small>Estimated total</small><b>{money(estimate)}</b></div></div><button className="primary" disabled={loading}>{loading?'Submitting…':'Submit order'} <ArrowUpRight size={16}/></button>{notice&&<p className="feedback">{notice}</p>}</form></section>}
 {page==='Orders'&&<section className="panel"><div className="panelhead"><div><h3>Order history</h3><p>Orders saved in your account</p></div><button className="textbtn" onClick={()=>location.reload()}><RefreshCw size={15}/> Refresh</button></div><OrderTable orders={orders}/></section>}
 {page==='Services'&&<section className="panel"><div className="panelhead"><div><h3>Service catalogue</h3><p>Starter catalogue — replace with approved offerings.</p></div></div><div className="servicegrid">{services.map(s=><article className="servicecard" key={s.id}><span className="tag">{s.category}</span><h3>{s.name}</h3><p>{s.description}</p><b>{money(s.unit_price)} <small>/ unit</small></b><small>Min {s.min_quantity} · Max {s.max_quantity}</small></article>)}</div></section>}
 {page==='Add Funds'&&<section className="panel"><h3>Wallet & payments</h3><p className="muted">Current balance: <b>{money(balance)}</b></p><div className="notice"><Wallet/><div><b>Payment gateway not connected</b><p>Connect a payment provider and verify signed server-side webhooks before enabling wallet top-ups. Do not use manual browser-side balance credits.</p></div></div></section>}
 {page==='Support'&&<Placeholder icon={Headset} title="Support centre" desc="Ticket creation, replies and attachments are planned. Connect an authenticated ticket API before launch."/>}
 {page==='Affiliate'&&<Placeholder icon={Users} title="Affiliate programme" desc="Referral links, commission rules and payouts are planned; configure transparent terms before activation."/>}
 {page==='API'&&<Placeholder icon={Code2} title="Provider API integration" desc="Provider credentials belong on the server only. The adapter is a safe placeholder until an approved provider API is configured."/>}
 {page==='Settings'&&<Placeholder icon={Settings} title="Settings" desc="Profile, security, language and notification preferences are planned for the next development phase."/>}
 <footer>© {new Date().getFullYear()} Sohel SMM · Starter build</footer></main></div>;
}
function Stat({icon:Icon,label,value,tone}){return <div className="stat"><span className={`staticon ${tone}`}><Icon size={19}/></span><div><small>{label}</small><b>{value}</b></div></div>}
function OrderTable({orders}){return <div className="tablewrap"><table><thead><tr><th>ORDER</th><th>SERVICE</th><th>QUANTITY</th><th>AMOUNT</th><th>STATUS</th></tr></thead><tbody>{orders.length?orders.map((o,i)=><tr key={o.id||i}><td>#{o.id}</td><td>{o.service_name||'—'}</td><td>{o.quantity}</td><td>{money(o.amount)}</td><td><span className={`status ${o.status}`}>{o.status}</span></td></tr>):<tr><td colSpan="5" className="empty">No orders yet. Create your first order.</td></tr>}</tbody></table></div>}
function Placeholder({icon:Icon,title,desc}){return <section className="panel placeholder"><span className="staticon purple"><Icon size={24}/></span><h3>{title}</h3><p>{desc}</p></section>}
