import { useEffect, useMemo, useState } from 'react'
import { auth, googleProvider, db } from './firebase'
import { signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth'
import { collection, doc, setDoc, getDoc, deleteDoc, updateDoc, onSnapshot } from 'firebase/firestore'

const CATEGORIES = ['🛋️ Muebles','🍳 Cocina','🛁 Baño','🛏️ Dormitorio','💡 Electro / Iluminación','🧹 Limpieza','🔧 Herramientas','📦 Otros']
const PRIORITY_COLORS = { alta:'#ef5350', media:'#ffb020', baja:'#66bb6a' }

const clampInt = (v,min,max) => {
  const n = Number(v)
  if (!Number.isFinite(n)) return min
  return Math.max(min, Math.min(max, Math.trunc(n)))
}
const parseMoneyToCents = (raw) => {
  if (raw == null) return null
  let s = String(raw).trim()
  if (!s) return null
  s = s.replace(/[^0-9,.-]/g,'')
  const pos = Math.max(s.lastIndexOf(','), s.lastIndexOf('.'))
  let intPart = s, decPart = ''
  if (pos !== -1) { intPart = s.slice(0,pos); decPart = s.slice(pos+1) }
  const negative = intPart.startsWith('-')
  intPart = intPart.replace(/-/g,'').replace(/[.,]/g,'')
  const whole = intPart ? Number(intPart) : 0
  if (!Number.isFinite(whole)) return null
  decPart = (decPart || '').replace(/[^0-9]/g,'')
  decPart = (decPart + '00').slice(0,2)
  return (negative ? -1 : 1) * (whole * 100 + Number(decPart))
}
const formatARS = (cents) => ((Number(cents) || 0)/100).toLocaleString('es-AR', { style:'currency', currency:'ARS' })
const getPriceCents = (item) => item?.priceCents != null ? Math.round(Number(item.priceCents) || 0) : item?.price != null ? Math.round((Number(item.price) || 0) * 100) : 0
const getInstallments = (item) => {
  const inst = item?.installments
  if (!inst || !inst.enabled) return null
  const totalCents = inst.totalCents != null ? Number(inst.totalCents) : Math.round((Number(inst.total) || 0) * 100)
  const count = clampInt(inst.count ?? inst.cuotas ?? 1, 1, 120)
  const paid = clampInt(inst.paidCount ?? inst.pagadas ?? 0, 0, count)
  return { totalCents: Math.round(Number.isFinite(totalCents) ? totalCents : 0), count, paid }
}
const getCommitmentCents = (item) => getInstallments(item)?.totalCents ?? getPriceCents(item)
const initials = (name) => (name || 'MT').split(' ').filter(Boolean).slice(0,2).map(x => x[0]?.toUpperCase()).join('') || 'MT'

function Avatar({ user, size=34 }) {
  const [failed, setFailed] = useState(false)
  if (user?.photoURL && !failed) return <img className="avatar" src={user.photoURL} alt="avatar" style={{width:size,height:size}} onError={() => setFailed(true)} />
  return <div className="avatar avatarFallback" style={{width:size,height:size}}>{initials(user?.displayName || user?.name)}</div>
}

export default function App(){
  const [user,setUser]=useState(null), [loading,setLoading]=useState(true)
  const [activeListType,setActiveListType]=useState('personal'), [viewMode,setViewMode]=useState('items')
  const [personalListId,setPersonalListId]=useState(null), [sharedListId,setSharedListId]=useState(null)
  const [personalItems,setPersonalItems]=useState([]), [sharedItems,setSharedItems]=useState([]), [sharedMembers,setSharedMembers]=useState([])
  const [showForm,setShowForm]=useState(false), [filter,setFilter]=useState('all'), [searchTerm,setSearchTerm]=useState(''), [editingId,setEditingId]=useState(null)
  const [showSharePanel,setShowSharePanel]=useState(false), [showJoinPanel,setShowJoinPanel]=useState(false), [joinCode,setJoinCode]=useState(''), [copied,setCopied]=useState(false)
  const [name,setName]=useState(''), [link,setLink]=useState(''), [category,setCategory]=useState(CATEGORIES[0]), [priority,setPriority]=useState('media'), [price,setPrice]=useState(''), [notes,setNotes]=useState('')
  const [installmentsEnabled,setInstallmentsEnabled]=useState(false), [installmentsCount,setInstallmentsCount]=useState('12'), [installmentsPaid,setInstallmentsPaid]=useState('0'), [installmentsTotal,setInstallmentsTotal]=useState('')

  const currentListId = activeListType === 'personal' ? personalListId : sharedListId
  const items = activeListType === 'personal' ? personalItems : sharedItems

  useEffect(() => onAuthStateChanged(auth, u => { setUser(u); setLoading(false) }), [])

  const createList = async (listName) => {
    const id = user.uid.slice(0,8) + '-' + Date.now().toString(36)
    await setDoc(doc(db,'lists',id), { name:listName, createdBy:user.uid, createdAt:Date.now() })
    await setDoc(doc(db,'lists',id,'members',user.uid), { name:user.displayName, photo:user.photoURL, joinedAt:Date.now() })
    return id
  }
  useEffect(() => {
    if (!user) { setPersonalListId(null); setSharedListId(null); setPersonalItems([]); setSharedItems([]); setSharedMembers([]); return }
    const init = async () => {
      const userRef = doc(db,'users',user.uid)
      const snap = await getDoc(userRef)
      if (snap.exists()) {
        const data = snap.data()
        if (data.personalListId) setPersonalListId(data.personalListId)
        else { const id = await createList('Mi lista'); await updateDoc(userRef,{personalListId:id}); setPersonalListId(id) }
        setSharedListId(data.sharedListId || null)
      } else {
        const id = await createList('Mi lista')
        await setDoc(userRef,{personalListId:id,sharedListId:null})
        setPersonalListId(id)
      }
    }
    init()
  }, [user])
  useEffect(() => personalListId ? onSnapshot(collection(db,'lists',personalListId,'items'), snap => setPersonalItems(snap.docs.map(d => ({id:d.id,...d.data()})))) : undefined, [personalListId])
  useEffect(() => {
    if (!sharedListId) { setSharedItems([]); setSharedMembers([]); return }
    const u1 = onSnapshot(collection(db,'lists',sharedListId,'items'), snap => setSharedItems(snap.docs.map(d => ({id:d.id,...d.data()}))))
    const u2 = onSnapshot(collection(db,'lists',sharedListId,'members'), snap => setSharedMembers(snap.docs.map(d => ({id:d.id,...d.data()}))))
    return () => { u1(); u2() }
  }, [sharedListId])

  const resetForm = () => { setName(''); setLink(''); setCategory(CATEGORIES[0]); setPriority('media'); setPrice(''); setNotes(''); setInstallmentsEnabled(false); setInstallmentsCount('12'); setInstallmentsPaid('0'); setInstallmentsTotal(''); setEditingId(null) }
  const switchList = (type) => { setActiveListType(type); setViewMode('items'); setShowForm(false); setShowJoinPanel(false); setShowSharePanel(false); setSearchTerm(''); setFilter('all'); resetForm() }
  const handleLogin = async () => { try { await signInWithPopup(auth, googleProvider) } catch(e) { console.error(e) } }
  const handleLogout = async () => { try { await signOut(auth) } catch(e) { console.error(e) } }
  const handleCreateShared = async () => { const id = await createList('Lista compartida'); await updateDoc(doc(db,'users',user.uid), { sharedListId:id }); setSharedListId(id); setActiveListType('shared'); setViewMode('items'); setShowJoinPanel(false); setShowSharePanel(false) }
  const handleJoinList = async () => {
    const code = joinCode.trim(); if (!code) return
    const snap = await getDoc(doc(db,'lists',code))
    if (!snap.exists()) { alert('Código no encontrado. Verificá que esté bien escrito.'); return }
    await setDoc(doc(db,'lists',code,'members',user.uid), { name:user.displayName, photo:user.photoURL, joinedAt:Date.now() }, { merge:true })
    await updateDoc(doc(db,'users',user.uid), { sharedListId:code })
    setSharedListId(code); setJoinCode(''); setShowJoinPanel(false); setActiveListType('shared'); setViewMode('items')
  }
  const handleLeaveShared = async () => { if (!sharedListId || !confirm('¿Salir de la lista compartida?')) return; await deleteDoc(doc(db,'lists',sharedListId,'members',user.uid)); await updateDoc(doc(db,'users',user.uid), { sharedListId:null }); setSharedListId(null); setActiveListType('personal'); setViewMode('items'); setShowSharePanel(false) }
  const copyCode = () => { if (!sharedListId) return; navigator.clipboard.writeText(sharedListId); setCopied(true); setTimeout(() => setCopied(false),2000) }

  const totalItems = items.length, doneItems = items.filter(i => i.done).length, pendingItems = totalItems - doneItems
  const completion = totalItems === 0 ? 0 : Math.round((doneItems / totalItems) * 100)
  const budgetTotalCents = items.reduce((s,i) => s + getCommitmentCents(i), 0), budgetDoneCents = items.reduce((s,i) => s + (i.done ? getCommitmentCents(i) : 0), 0), budgetPendingCents = budgetTotalCents - budgetDoneCents
  const installmentItems = useMemo(() => items.filter(i => !!getInstallments(i)), [items])
  const installmentsTotalCents = installmentItems.reduce((s,i) => s + getInstallments(i).totalCents, 0)
  const installmentsPaidCents = installmentItems.reduce((s,i) => { const inst=getInstallments(i); const per=inst.count?Math.round(inst.totalCents/inst.count):0; return s + per * inst.paid }, 0)
  const installmentsRemainingCents = installmentsTotalCents - installmentsPaidCents
  const filteredItems = useMemo(() => { const q = searchTerm.trim().toLowerCase(); return items.filter(i => filter === 'pending' ? !i.done : filter === 'done' ? i.done : true).filter(i => !q || `${i.name || ''} ${i.notes || ''}`.toLowerCase().includes(q)) }, [items, filter, searchTerm])
  const groupedItems = useMemo(() => { const groups = {}; filteredItems.forEach(i => { const cat=i.category || '📦 Otros'; if(!groups[cat]) groups[cat]=[]; groups[cat].push(i) }); return groups }, [filteredItems])

  const handleSubmit = async () => {
    if (!name.trim() || !currentListId) return
    const priceCents = parseMoneyToCents(price), enabled = !!installmentsEnabled, count = clampInt(installmentsCount,1,120), paidCount = clampInt(installmentsPaid,0,count), totalCents = enabled ? (parseMoneyToCents(installmentsTotal) ?? priceCents ?? 0) : 0
    const payload = { name:name.trim(), link:link.trim(), category, priority, priceCents:priceCents ?? null, notes:notes.trim(), installments: enabled ? { enabled:true, totalCents, count, paidCount } : { enabled:false } }
    if (editingId) await updateDoc(doc(db,'lists',currentListId,'items',editingId), payload)
    else await setDoc(doc(db,'lists',currentListId,'items',String(Date.now())), { ...payload, done:false, createdAt:Date.now(), addedBy:user?.displayName || 'user' })
    resetForm(); setShowForm(false)
  }
  const startEdit = (item) => {
    setName(item.name || ''); setLink(item.link || ''); setCategory(item.category || CATEGORIES[0]); setPriority(item.priority || 'media')
    const cents = item.priceCents != null ? Number(item.priceCents) : item.price != null ? Math.round(Number(item.price)*100) : null
    setPrice(cents != null ? String((cents/100).toFixed(2)).replace(/\.00$/,'') : '')
    setNotes(item.notes || '')
    const inst = getInstallments(item)
    if (inst) { setInstallmentsEnabled(true); setInstallmentsCount(String(inst.count)); setInstallmentsPaid(String(inst.paid)); setInstallmentsTotal(String((inst.totalCents/100).toFixed(2)).replace(/\.00$/,'')) }
    else { setInstallmentsEnabled(false); setInstallmentsCount('12'); setInstallmentsPaid('0'); setInstallmentsTotal('') }
    setEditingId(item.id); setShowForm(true); setViewMode('items')
  }
  const deleteItem = async (id) => { if (!currentListId) return; await deleteDoc(doc(db,'lists',currentListId,'items',id)) }
  const toggleDone = async (item) => { if (!currentListId) return; await updateDoc(doc(db,'lists',currentListId,'items',item.id), { done: !item.done }) }
  const updateInstallmentPaidCount = async (item, delta) => { const inst = getInstallments(item); if (!inst || !currentListId) return; await updateDoc(doc(db,'lists',currentListId,'items',item.id), { installments:{ enabled:true, totalCents:inst.totalCents, count:inst.count, paidCount:clampInt(inst.paid+delta,0,inst.count) } }) }

  if (loading) return <div className="screenCenter">Cargando…</div>
  if (!user) return <div className="loginShell"><section className="loginCard"><div className="loginIcon">📦</div><h1>MudaTrack</h1><p>Tu checklist de mudanza, clara y sincronizada.</p><button className="googleButton" onClick={handleLogin}>Iniciar con Google</button><div className="loginHighlights"><div><strong>Cloud sync</strong><span>PC + móvil</span></div><div><strong>Listas</strong><span>personal + compartida</span></div></div></section></div>

  return <div className="appShell"><main className="appLayout"><aside className="sidePanel"><header className="userBar"><div className="userIdentity"><Avatar user={user}/><span>{user.displayName}</span></div><button className="outlineButton" onClick={handleLogout}>Salir</button></header><section className="brandBlock"><h1>MudaTrack</h1><p>Tu checklist de mudanza</p></section><div className="segmentedControl"><button className={activeListType==='personal'?'active':''} onClick={()=>switchList('personal')}>📋 Mi lista</button><button className={activeListType==='shared'?'active':''} onClick={()=>switchList('shared')}>👥 Compartida</button></div>{activeListType==='shared' && !sharedListId && <section className="panelNotice"><strong>Aún no tenés una lista compartida</strong><p>Creá una nueva o sumate con un código.</p><div className="buttonRow"><button className="primaryButton small" onClick={handleCreateShared}>➕ Crear</button><button className="outlineButton" onClick={()=>setShowJoinPanel(!showJoinPanel)}>🤝 Unirme</button></div>{showJoinPanel && <div className="joinRow"><input className="input" placeholder="Código de lista" value={joinCode} onChange={e=>setJoinCode(e.target.value)}/><button className="primaryButton small" onClick={handleJoinList}>OK</button></div>}</section>}{activeListType==='shared' && sharedListId && <section className="sharedPanel"><div className="memberRow">{sharedMembers.map(m=><Avatar key={m.id} user={{displayName:m.name,photoURL:m.photo}} size={30}/>)}<span>{sharedMembers.length} {sharedMembers.length===1?'persona':'personas'}</span></div><div className="buttonRow"><button className="outlineButton" onClick={()=>setShowSharePanel(!showSharePanel)}>🔗 Código</button><button className="dangerButton" onClick={handleLeaveShared}>Salir</button></div>{showSharePanel && <div className="shareCodeBox"><span>Código para compartir</span><code>{sharedListId}</code><button className="outlineButton compact" onClick={copyCode}>{copied?'Copiado ✅':'Copiar'}</button></div>}</section>}<section className="kpiGrid"><div><strong>{totalItems}</strong><span>Total</span></div><div><strong className="ok">{doneItems}</strong><span>Listo</span></div><div><strong className="warn">{pendingItems}</strong><span>Pendiente</span></div></section><section className="budgetHero"><div className="budgetTitle">💰 Presupuesto total a pagar</div><div className="budgetAmount">{formatARS(budgetTotalCents)}</div><div className="budgetSplit"><span>Pendiente <strong>{formatARS(budgetPendingCents)}</strong></span><span>Listo <strong>{formatARS(budgetDoneCents)}</strong></span>{installmentsTotalCents>0 && <span>Incluye cuotas <strong>{formatARS(installmentsTotalCents)}</strong></span>}</div></section><section className="progressBlock"><div className="progressTrack"><div className="progressFill" style={{width:`${completion}%`}} /></div><strong>{completion}%</strong></section><div className="segmentedControl secondary"><button className={viewMode==='items'?'active':''} onClick={()=>setViewMode('items')}>🧾 Items</button><button className={viewMode==='cuotas'?'active':''} onClick={()=>setViewMode('cuotas')}>💳 Cuotas</button></div>{viewMode==='cuotas' && <section className="installmentSummary"><strong>Resumen de cuotas</strong><span>Total financiado: <b>{formatARS(installmentsTotalCents)}</b></span><span>Pagado: <b>{formatARS(installmentsPaidCents)}</b></span><span>Pendiente: <b>{formatARS(installmentsRemainingCents)}</b></span></section>}</aside><section className="contentPanel">{viewMode==='items' && <><div className="toolbar"><div className="filters"><button className={filter==='all'?'active':''} onClick={()=>setFilter('all')}>🏠 Todos</button><button className={filter==='pending'?'active':''} onClick={()=>setFilter('pending')}>⏳ Pendientes</button><button className={filter==='done'?'active':''} onClick={()=>setFilter('done')}>✅ Listos</button></div><div className="searchBox"><input placeholder="🔍 Buscar por nombre o notas" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>{searchTerm.trim() && <button onClick={()=>setSearchTerm('')}>✕</button>}</div><button className="primaryButton addButton" onClick={()=>{ if(showForm&&editingId) resetForm(); setShowForm(!showForm) }}>{showForm?'✕ Cerrar':'＋ Agregar artículo'}</button></div>{showForm && <section className="itemForm"><input className="input" placeholder="Nombre del artículo *" value={name} onChange={e=>setName(e.target.value)}/><select className="input" value={category} onChange={e=>setCategory(e.target.value)}>{CATEGORIES.map(o=><option key={o} value={o}>{o}</option>)}</select><div className="formGrid two"><input className="input" placeholder="🔗 Link (opcional)" value={link} onChange={e=>setLink(e.target.value)}/><input className="input" type="text" inputMode="decimal" placeholder="💲 Precio (ARS)" value={price} onChange={e=>setPrice(e.target.value)}/></div><div className="formGrid two"><select className="input" value={priority} onChange={e=>setPriority(e.target.value)}><option value="alta">🔴 Prioridad Alta</option><option value="media">🟡 Prioridad Media</option><option value="baja">🟢 Prioridad Baja</option></select><label className="installmentToggle"><span>💳 En cuotas</span><input type="checkbox" checked={installmentsEnabled} onChange={e=>{ const enabled=e.target.checked; setInstallmentsEnabled(enabled); if(enabled&&!installmentsTotal) setInstallmentsTotal(price||'') }}/></label></div>{installmentsEnabled && <section className="installmentConfig"><strong>💳 Configuración de cuotas</strong><div className="formGrid three"><label><span>Cantidad de cuotas</span><input className="input" type="number" min="1" value={installmentsCount} onChange={e=>setInstallmentsCount(e.target.value)}/></label><label><span>Cuotas pagadas</span><input className="input" type="number" min="0" value={installmentsPaid} onChange={e=>setInstallmentsPaid(e.target.value)}/></label><label><span>Total financiado</span><input className="input" type="text" inputMode="decimal" placeholder="Ej: 150000" value={installmentsTotal} onChange={e=>setInstallmentsTotal(e.target.value)}/></label></div></section>}<textarea className="input textarea" placeholder="📝 Notas (opcional)" value={notes} onChange={e=>setNotes(e.target.value)}/><button className="primaryButton full" onClick={handleSubmit}>{editingId?'💾 Guardar cambios':'➕ Agregar a la lista'}</button></section>}<section className="itemsArea">{filteredItems.length===0 && <div className="emptyState"><div>📦</div><strong>No hay artículos en esta vista.</strong><span>Probá agregando uno con el botón de arriba.</span></div>}{Object.entries(groupedItems).map(([groupName,groupItems])=><section className="categoryGroup" key={groupName}><h3>{groupName}</h3><div className="itemGrid">{groupItems.map(item=>{ const inst=getInstallments(item); const pay=inst?.count?Math.round(inst.totalCents/inst.count):0; return <article className={item.done?'itemCard done':'itemCard'} key={item.id}><div className="itemMain"><input type="checkbox" checked={!!item.done} onChange={()=>toggleDone(item)}/><div className="itemText"><div className="itemTitleRow"><strong>{item.name}</strong><i style={{background:PRIORITY_COLORS[item.priority]||PRIORITY_COLORS.media}} /></div>{(item.priceCents!=null||item.price!=null) && <b className="itemPrice">{formatARS(getPriceCents(item))}</b>}{inst && <div className="installmentBadge"><span>💳 {inst.count} cuotas</span><span>{formatARS(pay)} c/u</span><small>Pagadas: {inst.paid}/{inst.count}</small></div>}{item.notes && <p className="itemNotes">{item.notes}</p>}{item.link && <a className="itemLink" href={item.link} target="_blank" rel="noopener noreferrer">🔗 Ver artículo</a>}</div></div><div className="itemActions"><button onClick={()=>startEdit(item)}>✏️</button><button onClick={()=>deleteItem(item.id)}>🗑️</button></div></article>})}</div></section>)}</section></>}{viewMode==='cuotas' && <section className="installmentsView"><header><h2>💳 Seguimiento de cuotas</h2><p>Aparecen solo los artículos con “En cuotas” activado.</p></header>{installmentItems.length===0 ? <div className="emptyState"><div>💳</div><strong>Todavía no tenés compras en cuotas.</strong><span>Editá un artículo y activá “En cuotas”.</span></div> : <div className="installmentGrid">{installmentItems.map(item=>{ const inst=getInstallments(item); const pay=inst.count?Math.round(inst.totalCents/inst.count):0; const paid=pay*inst.paid; const remaining=inst.totalCents-paid; const pct=inst.count?Math.round((inst.paid/inst.count)*100):0; return <article className="installmentCard" key={item.id}><div className="installmentHeader"><div><strong>{item.name}</strong><span>{item.category||'📦 Otros'}</span></div><button onClick={()=>startEdit(item)}>✏️ Editar</button></div><div className="installmentData"><span>Total financiado <b>{formatARS(inst.totalCents)}</b></span><span>Cuota estimada <b>{formatARS(pay)}</b></span><span>Pagadas <b>{inst.paid}/{inst.count}</b></span></div><div className="progressLine"><div style={{width:`${pct}%`}} /></div><div className="installmentMoneySplit"><span>Pagado <b>{formatARS(paid)}</b></span><span>Pendiente <b>{formatARS(remaining)}</b></span></div><div className="buttonRow"><button className="outlineButton" onClick={()=>updateInstallmentPaidCount(item,1)}>✅ +1 pagada</button><button className="outlineButton" onClick={()=>updateInstallmentPaidCount(item,-1)}>↩︎ -1</button></div></article>})}</div>}</section>}</section></main></div>
}
