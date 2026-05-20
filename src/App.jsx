import { useState, useEffect } from 'react'

const STORAGE_KEY = 'mudatrack'

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
  const [items, setItems] = useState(() => {
    const s = localStorage.getItem(STORAGE_KEY)
    return s ? JSON.parse(s) : []
  })

  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState("all")
  const [editingId, setEditingId] = useState(null)

  // Form fields
  const [name, setName] = useState("")
  const [link, setLink] = useState("")
  const [category, setCategory] = useState(CATEGORIES[0])
  const [priority, setPriority] = useState("media")
  const [price, setPrice] = useState("")

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  // Metrics
  const total = items.length
  const done = items.filter(i => i.done).length
  const pending = total - done
  const percent = total === 0 ? 0 : Math.round((done / total) * 100)

  // Filtered items
  const filteredItems = items.filter(i => {
    if (filter === "pending") return !i.done
    if (filter === "done") return i.done
    return true
  })

  // Group by category
  const grouped = {}
  filteredItems.forEach(i => {
    if (!grouped[i.category]) grouped[i.category] = []
    grouped[i.category].push(i)
  })

  const resetForm = () => {
    setName("")
    setLink("")
    setCategory(CATEGORIES[0])
    setPriority("media")
    setPrice("")
    setEditingId(null)
  }

  const handleSubmit = () => {
    if (!name.trim()) return

    if (editingId) {
      setItems(items.map(i =>
        i.id === editingId
          ? { ...i, name: name.trim(), link: link.trim(), category, priority, price: price ? parseFloat(price) : null }
          : i
      ))
    } else {
      setItems([
        ...items,
        {
          id: Date.now(),
          name: name.trim(),
          link: link.trim(),
          category,
          priority,
          price: price ? parseFloat(price) : null,
          done: false
        }
      ])
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

  const deleteItem = (id) => {
    setItems(items.filter(i => i.id !== id))
  }

  const priorityColors = { alta: "#ef5350", media: "#ffa726", baja: "#66bb6a" }
  const priorityLabels = { alta: "🔴 Alta", media: "🟡 Media", baja: "🟢 Baja" }

  const filterBtn = (key, label) => ({
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
        <h1 style={{
          margin: 0,
          fontSize: 32,
          background: "linear-gradient(135deg, #e040a0, #b388ff)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent"
        }}>
          📦 MudaTrack
        </h1>
        <p style={{ color: "#cbb6ff", margin: "4px 0 0" }}>Tu checklist de mudanza</p>

        {/* Stats */}
        
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, width: "100%", maxWidth: 300,marginLeft: "auto", marginRight: "auto"}}>

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
                  {/* Left side */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                    <input
                      type="checkbox"
                      checked={i.done}
                      onChange={() =>
                        setItems(items.map(x =>
                          x.id === i.id ? { ...x, done: !x.done } : x
                        ))
                      }
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

                  {/* Right side - actions */}
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
