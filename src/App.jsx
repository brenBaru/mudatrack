import { useState, useEffect } from 'react'
import { auth, googleProvider, db } from './firebase'
import { signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth'
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  onSnapshot
} from 'firebase/firestore'

const CATEGORIES = [
  "🛋️ Muebles",
  "🍳 Cocina",
  "🛁 Baño",
  "🛏️ Dormitorio",
  "💡 Electro / Iluminación",
  "🧹 Limpieza",
  "🔧 Herramientas",
  "📦 Otros"
]

const inputStyle = {
  display: "block",
  width: "100%",
  padding: "10px 12px",
  marginBottom: 10,
  background: "#1a0a2e",
  color: "#f3e5f5",
  border: "1px solid #3b2667",
  borderRadius: 8,
  fontSize: 14,
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box"
}

const btnGradient = {
  background: "linear-gradient(135deg, #e040a0, #b388ff)",
  border: "none",
  padding: "10px 20px",
  borderRadius: 10,
  color: "white",
  fontWeight: "bold",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: 14
}

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState("all")
  const [editingId, setEditingId] = useState(null)

  const [name, setName] = useState("")
  const [link, setLink] = useState("")
  const [category, setCategory] = useState(CATEGORIES[0])
  const [priority, setPriority] = useState("media")
  const [price, setPrice] = useState("")

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) {
      setItems([])
      return
    }
    const itemsRef = collection(db, "users", user.uid, "items")
    const unsubscribe = onSnapshot(itemsRef, (snapshot) => {
      const itemsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setItems(itemsList)
    })
    return () => unsubscribe()
  }, [user])

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (error) {
      console.error("Error al iniciar sesión:", error)
    }
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
    } catch (error) {
      console.error("Error al cerrar sesión:", error)
    }
  }

  const total = items.length
  const done = items.filter(i => i.done).length
  const pending = total - done
  const percent = total === 0 ? 0 : Math.round((done / total) * 100)

  const filteredItems = items.filter(i => {
    if (filter === "pending") return !i.done
    if (filter === "done") return i.done
    return true
  })

  const grouped = {}
  filteredItems.forEach(i => {
    const cat = i.category || "📦 Otros"
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(i)
  })

  const resetForm = () => {
    setName("")
    setLink("")
    setCategory(CATEGORIES[0])
    setPriority("media")
    setPrice("")
    setEditingId(null)
  }

  const handleSubmit = async () => {
    if (!name.trim() || !user) return

    if (editingId) {
      const itemRef = doc(db, "users", user.uid, "items", editingId)
      await updateDoc(itemRef, {
        name: name.trim(),
        link: link.trim(),
        category,
        priority,
        price: price ? parseFloat(price) : null
      })
    } else {
      const newId = String(Date.now())
      const itemRef = doc(db, "users", user.uid, "items", newId)
      await setDoc(itemRef, {
        name: name.trim(),
        link: link.trim(),
        category,
        priority,
        price: price ? parseFloat(price) : null,
        done: false,
        createdAt: Date.now()
      })
    }

    resetForm()
    setShowForm(false)
  }

  const startEdit = (item) => {
    setName(item.name)
    setLink(item.link || "")
    setCategory(item.category || CATEGORIES[0])
    setPriority(item.priority || "media")
    setPrice(item.price ? String(item.price) : "")
    setEditingId(item.id)
    setShowForm(true)
  }

  const deleteItem = async (id) => {
    if (!user) return
    const itemRef = doc(db, "users", user.uid, "items", id)
    await deleteDoc(itemRef)
  }

  const toggleDone = async (item) => {
    if (!user) return
    const itemRef = doc(db, "users", user.uid, "items", item.id)
    await updateDoc(itemRef, { done: !item.done })
  }

  const priorityColors = { alta: "#ef5350", media: "#ffa726", baja: "#66bb6a" }

  const filterBtn = (key) => ({
    background: filter === key ? "linear-gradient(135deg, #e040a0, #b388ff)" : "#2d1b4e",
    color: filter === key ? "white" : "#cbb6ff",
    border: filter === key ? "none" : "1px solid #3b2667",
    padding: "8px 18px",
    borderRadius: 20,
    cursor: "pointer",
    fontFamily: "inherit",
    fontWeight: 600,
    fontSize: 13
  })

  if (loading) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        color: "#cbb6ff",
        fontSize: 18
      }}>
        Cargando...
      </div>
    )
  }

  if (!user) {
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        padding: 20,
        textAlign: "center"
      }}>
        <h1 style={{
          fontSize: 48,
          margin: 0,
          background: "linear-gradient(135deg, #e040a0, #b388ff)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent"
        }}>
          MudaTrack
        </h1>
        <p style={{ color: "#cbb6ff", fontSize: 18, margin: "8px 0 32px" }}>
          Tu checklist de mudanza
        </p>

        <button
          onClick={handleLogin}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "14px 32px",
            borderRadius: 12,
            border: "1px solid rgba(224, 64, 160, 0.3)",
            background: "#2d1b4e",
            color: "white",
            fontSize: 16,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit"
          }}
        >
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
            <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
            <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
            <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
          </svg>
          Iniciar con Google
        </button>

        <p style={{ color: "#7c6a8a", fontSize: 13, marginTop: 24, maxWidth: 300 }}>
          Iniciá sesión para guardar tu lista en la nube y acceder desde cualquier dispositivo 📱💻
        </p>
      </div>
    )
  }

  return (
    <div style={{ padding: "20px 16px", maxWidth: 700, margin: "0 auto" }}>

      {/* HEADER */}
      <div style={{
        textAlign: "center",
        padding: 24,
        background: "#2d1b4e",
        borderRadius: 16,
        border: "1px solid rgba(224, 64, 160, 0.3)"
      }}>
        <div style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: 10,
          marginBottom: 12
        }}>
          {user.photoURL && (
            <img
              src={user.photoURL}
              alt="avatar"
              style={{ width: 28, height: 28, borderRadius: "50%" }}
            />
          )}
          <span style={{ fontSize: 13, color: "#cbb6ff" }}>
            {user.displayName}
          </span>
          <button
            onClick={handleLogout}
            style={{
              background: "transparent",
              border: "1px solid #3b2667",
              color: "#cbb6ff",
              padding: "4px 10px",
              borderRadius: 6,
              fontSize: 11,
              cursor: "pointer",
              fontFamily: "inherit"
            }}
          >
            Salir
          </button>
        </div>

        <h1 style={{
          margin: 0,
          fontSize: 32,
          background: "linear-gradient(135deg, #e040a0, #b388ff)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent"
        }}>
          MudaTrack
        </h1>
        <p style={{ color: "#cbb6ff", margin: "4px 0 0" }}>Tu checklist de mudanza</p>

        {/* Stats */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, width: "100%", maxWidth: 360, marginLeft: "auto", marginRight: "auto" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{total}</div>
            <div style={{ fontSize: 11, color: "#cbb6ff", textTransform: "uppercase" }}>Total</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#66bb6a" }}>{done}</div>
            <div style={{ fontSize: 11, color: "#cbb6ff", textTransform: "uppercase" }}>Listo ✓</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#ff8a65" }}>{pending}</div>
            <div style={{ fontSize: 11, color: "#cbb6ff", textTransform: "uppercase" }}>Pendiente</div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{
          marginTop: 16,
          display: "flex",
          alignItems: "center",
          gap: 10
        }}>
          <div style={{
            flex: 1,
            background: "#1a0a2e",
            borderRadius: 10,
            overflow: "hidden",
            height: 24
          }}>
            <div style={{
              width: `${percent}%`,
              background: "linear-gradient(90deg, #e040a0, #b388ff)",
              height: "100%",
              transition: "width 0.5s ease",
              borderRadius: 10
            }} />
          </div>
          <span style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#cbb6ff",
            minWidth: 50,
            textAlign: "right"
          }}>
            {percent}%
          </span>
        </div>
      </div>

      {/* FILTERS */}
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16 }}>
        <button onClick={() => setFilter("all")} style={filterBtn("all")}>🏠 Todos</button>
        <button onClick={() => setFilter("pending")} style={filterBtn("pending")}>⏳ Pendientes</button>
        <button onClick={() => setFilter("done")} style={filterBtn("done")}>✅ Listos</button>
      </div>

      {/* ADD BUTTON */}
      <button
        onClick={() => {
          if (showForm && editingId) {
            resetForm()
          }
          setShowForm(!showForm)
        }}
        style={{ ...btnGradient, marginTop: 16, width: "100%" }}
      >
        {showForm ? "✕ Cerrar" : "＋ Agregar artículo"}
      </button>

      {/* FORM */}
      {showForm && (
        <div style={{
          marginTop: 12,
          padding: 20,
          background: "#2d1b4e",
          borderRadius: 14,
          border: "1px solid rgba(224, 64, 160, 0.3)"
        }}>
          <input
            placeholder="Nombre del artículo *"
            value={name}
            onChange={e => setName(e.target.value)}
            style={inputStyle}
            autoFocus
          />

          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            style={{ ...inputStyle, cursor: "pointer" }}
          >
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <input
            placeholder="🔗 Link donde lo viste (opcional)"
            value={link}
            onChange={e => setLink(e.target.value)}
            style={inputStyle}
          />

          <input
            type="number"
            placeholder="💲 Precio estimado (opcional)"
            value={price}
            onChange={e => setPrice(e.target.value)}
            min="0"
            step="0.01"
            style={inputStyle}
          />

          <select
            value={priority}
            onChange={e => setPriority(e.target.value)}
            style={{ ...inputStyle, cursor: "pointer" }}
          >
            <option value="alta">🔴 Prioridad Alta</option>
            <option value="media">🟡 Prioridad Media</option>
            <option value="baja">🟢 Prioridad Baja</option>
          </select>

          <button onClick={handleSubmit} style={{ ...btnGradient, width: "100%", marginTop: 4 }}>
            {editingId ? "💾 Guardar cambios" : "➕ Agregar a la lista"}
          </button>
        </div>
      )}

      {/* ITEMS LIST */}
      <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 20, paddingBottom: 40 }}>

        {filteredItems.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 24px", color: "#cbb6ff" }}>
            <div style={{ fontSize: 48 }}>📦</div>
            <p>No hay artículos en esta vista.</p>
            <p style={{ fontSize: 13, opacity: 0.7 }}>¡Agregá uno con el botón de arriba!</p>
          </div>
        )}

        {Object.entries(grouped).map(([cat, catItems]) => (
          <div key={cat}>
            <h3 style={{
              fontSize: 14,
              color: "#b388ff",
              borderBottom: "1px solid #3b2667",
              paddingBottom: 6,
              marginBottom: 8
            }}>
              {cat}
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {catItems.map(i => (
                <div
                  key={i.id}
                  style={{
                    background: i.done ? "#1e1238" : "#2d1b4e",
                    opacity: i.done ? 0.65 : 1,
                    padding: "14px 16px",
                    borderRadius: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    border: "1px solid transparent",
                    transition: "all 0.2s"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                    <input
                      type="checkbox"
                      checked={i.done}
                      onChange={() => toggleDone(i)}
                      style={{ width: 18, height: 18, cursor: "pointer", accentColor: "#e040a0" }}
                    />

                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{
                          fontSize: 15,
                          fontWeight: 700,
                          textDecoration: i.done ? "line-through" : "none"
                        }}>
                          {i.name}
                        </span>
                        <span style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: priorityColors[i.priority] || priorityColors.media,
                          display: "inline-block"
                        }} />
                      </div>

                      {i.price && (
                        <span style={{ fontSize: 13, color: "#ce93d8", fontWeight: 600 }}>
                          ${i.price.toLocaleString("es-AR")}
                        </span>
                      )}

                      {i.link && (
                        <a
                          href={i.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: 13, color: "#b388ff", textDecoration: "none" }}
                        >
                          🔗 Ver artículo
                        </a>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={() => startEdit(i)}
                      title="Editar"
                      style={{
                        background: "transparent",
                        border: "none",
                        fontSize: 16,
                        cursor: "pointer",
                        padding: 4,
                        borderRadius: 6
                      }}
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => deleteItem(i.id)}
                      title="Eliminar"
                      style={{
                        background: "transparent",
                        border: "none",
                        fontSize: 16,
                        cursor: "pointer",
                        padding: 4,
                        borderRadius: 6
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
