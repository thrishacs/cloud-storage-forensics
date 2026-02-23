import { useState, useEffect, useCallback, useRef } from "react"

const API = "http://localhost:5000"

const COUNTRIES = {
  IN:"India",US:"United States",BR:"Brazil",CN:"China",
  FR:"France",RU:"Russia",GB:"United Kingdom",DE:"Germany",
  JP:"Japan",AU:"Australia",CA:"Canada",MX:"Mexico"
}
const fullCountry = c => COUNTRIES[c] || c

const ACT_COLOR = {
  bulk_download:     {bg:"rgba(255,68,102,0.2)",  color:"#ff4466"},
  login:             {bg:"rgba(255,215,0,0.15)",   color:"#ffd700"},
  upload:            {bg:"rgba(0,212,255,0.12)",   color:"#00d4ff"},
  download:          {bg:"rgba(162,89,255,0.15)",  color:"#a259ff"},
  share:             {bg:"rgba(0,255,136,0.12)",   color:"#00ff88"},
  permission_change: {bg:"rgba(255,107,53,0.15)",  color:"#ff6b35"},
}
const ACT_ICON = {upload:"⬆",download:"⬇",share:"🔗",login:"🔑",bulk_download:"⚠",permission_change:"🔧"}

/* ═══ Upload Modal ═══ */
function UploadModal({ onClose, onSuccess, showToast }) {
  const [file,        setFile]        = useState(null)
  const [dragging,    setDragging]    = useState(false)
  const [uploading,   setUploading]   = useState(false)
  const [result,      setResult]      = useState(null)
  const [error,       setError]       = useState(null)
  const fileRef = useRef()

  const handleDrop = e => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if(f && f.name.endsWith(".csv")) { setFile(f); setError(null) }
    else setError("Only CSV files are supported")
  }

  const handleFile = e => {
    const f = e.target.files[0]
    if(f && f.name.endsWith(".csv")) { setFile(f); setError(null) }
    else setError("Only CSV files are supported")
  }

  const handleUpload = async () => {
    if(!file) return
    setUploading(true); setResult(null); setError(null)
    const formData = new FormData()
    formData.append("file", file)
    try {
      const r = await fetch(`${API}/api/upload`, { method:"POST", body:formData })
      const d = await r.json()
      if(d.error) { setError(d.error) }
      else { setResult(d); onSuccess() }
    } catch(e) { setError("Cannot connect to Flask API") }
    setUploading(false)
  }

  const downloadTemplate = () => {
    window.open(`${API}/api/upload/template`, "_blank")
  }

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",zIndex:10000,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:"#0f1923",border:"1px solid #1a2535",borderRadius:"12px",padding:"1.5rem",width:"500px",maxWidth:"95vw",boxShadow:"0 20px 60px rgba(0,0,0,0.5)"}}>

        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.2rem"}}>
          <div>
            <div style={{fontSize:"1rem",fontWeight:"800",color:"#00d4ff"}}>⬆ Upload Cloud Logs</div>
            <div style={{fontSize:"0.68rem",color:"#475569",marginTop:"0.2rem"}}>Upload a CSV file to analyze with ML model</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#475569",fontSize:"1.2rem",cursor:"pointer"}}>✕</button>
        </div>

        {/* Drop Zone */}
        {!result && (
          <>
            <div
              onDragOver={e=>{e.preventDefault();setDragging(true)}}
              onDragLeave={()=>setDragging(false)}
              onDrop={handleDrop}
              onClick={()=>fileRef.current.click()}
              style={{border:`2px dashed ${dragging?"#00d4ff":file?"#00ff88":"#1a2535"}`,borderRadius:"8px",padding:"2rem",textAlign:"center",cursor:"pointer",background:dragging?"rgba(0,212,255,0.05)":file?"rgba(0,255,136,0.03)":"transparent",transition:"all 0.2s",marginBottom:"1rem"}}>
              <input ref={fileRef} type="file" accept=".csv" style={{display:"none"}} onChange={handleFile}/>
              <div style={{fontSize:"2rem",marginBottom:"0.5rem"}}>{file?"✅":"📂"}</div>
              {file ? (
                <>
                  <div style={{color:"#00ff88",fontWeight:"700",fontSize:"0.85rem"}}>{file.name}</div>
                  <div style={{color:"#475569",fontSize:"0.7rem",marginTop:"0.2rem"}}>{(file.size/1024).toFixed(1)} KB</div>
                </>
              ) : (
                <>
                  <div style={{color:"#64748b",fontSize:"0.82rem",marginBottom:"0.3rem"}}>Drag & drop your CSV file here</div>
                  <div style={{color:"#334155",fontSize:"0.7rem"}}>or click to browse</div>
                </>
              )}
            </div>

            {/* Required columns info */}
            <div style={{background:"#080d18",borderRadius:"6px",padding:"0.7rem",marginBottom:"1rem"}}>
              <div style={{color:"#475569",fontSize:"0.6rem",letterSpacing:"1.5px",marginBottom:"0.4rem"}}>REQUIRED CSV COLUMNS</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:"0.3rem"}}>
                {["timestamp","user_id","action","file_id","ip_address","location","device","file_size_mb"].map(col=>(
                  <span key={col} style={{background:"rgba(0,212,255,0.1)",color:"#00d4ff",padding:"0.1rem 0.4rem",borderRadius:"3px",fontSize:"0.62rem",fontFamily:"monospace"}}>{col}</span>
                ))}
              </div>
              <div style={{color:"#334155",fontSize:"0.62rem",marginTop:"0.4rem"}}>Optional: <span style={{fontFamily:"monospace",color:"#475569"}}>is_anomaly</span> (auto-scored by ML if missing)</div>
            </div>

            {error && <div style={{background:"rgba(255,68,102,0.1)",border:"1px solid rgba(255,68,102,0.3)",borderRadius:"6px",padding:"0.6rem",color:"#ff4466",fontSize:"0.72rem",marginBottom:"0.8rem"}}>{error}</div>}

            <div style={{display:"flex",gap:"0.5rem"}}>
              <button onClick={downloadTemplate}
                style={{flex:1,background:"rgba(0,212,255,0.1)",border:"1px solid rgba(0,212,255,0.22)",color:"#00d4ff",padding:"0.55rem",borderRadius:"5px",fontSize:"0.72rem",cursor:"pointer",fontWeight:"600"}}>
                ⬇ Download Template
              </button>
              <button onClick={handleUpload} disabled={!file||uploading}
                style={{flex:2,background:file?"linear-gradient(135deg,#00d4ff,#a259ff)":"#1a2535",border:"none",color:file?"#000":"#334155",padding:"0.55rem",borderRadius:"5px",fontSize:"0.72rem",cursor:file?"pointer":"not-allowed",fontWeight:"700"}}>
                {uploading?"⏳ Uploading & Analyzing...":"▷ Upload & Analyze"}
              </button>
            </div>
          </>
        )}

        {/* Success Result */}
        {result && (
          <div>
            <div style={{background:"rgba(0,255,136,0.08)",border:"1px solid rgba(0,255,136,0.25)",borderRadius:"8px",padding:"1rem",marginBottom:"1rem"}}>
              <div style={{color:"#00ff88",fontWeight:"800",fontSize:"0.9rem",marginBottom:"0.8rem"}}>✅ Upload Successful!</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.5rem"}}>
                {[
                  {label:"Records Uploaded", val:result.inserted,      color:"#00d4ff"},
                  {label:"Anomalies Found",  val:result.anomalies_detected, color:"#ff4466"},
                  {label:"Total Rows",       val:result.total_rows,    color:"#a259ff"},
                  {label:"Auto-Scored",      val:result.auto_scored,   color:"#ffd700"},
                ].map(({label,val,color})=>(
                  <div key={label} style={{background:"#080d18",borderRadius:"5px",padding:"0.5rem 0.7rem"}}>
                    <div style={{color:"#475569",fontSize:"0.6rem"}}>{label}</div>
                    <div style={{color,fontWeight:"800",fontSize:"1.1rem"}}>{val}</div>
                  </div>
                ))}
              </div>
              {result.anomalies_detected > 0 && (
                <div style={{marginTop:"0.7rem",background:"rgba(255,68,102,0.1)",border:"1px solid rgba(255,68,102,0.25)",borderRadius:"5px",padding:"0.5rem 0.7rem",color:"#ff9999",fontSize:"0.72rem"}}>
                  ⚠ {result.anomalies_detected} suspicious events detected — check the Alerts tab
                </div>
              )}
            </div>
            <button onClick={onClose}
              style={{width:"100%",background:"linear-gradient(135deg,#00d4ff,#a259ff)",border:"none",color:"#000",padding:"0.6rem",borderRadius:"5px",fontSize:"0.78rem",cursor:"pointer",fontWeight:"700"}}>
              ✓ View Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ═══ Gauge ═══ */
function Gauge({ score }) {
  const pct   = Math.min((score||0)*100,100)
  const color = pct>70?"#ff4466":pct>40?"#ffd700":"#00ff88"
  const level = pct>70?"HIGH":pct>40?"MEDIUM":"LOW"
  const r=52,cx=68,cy=68,circ=2*Math.PI*r
  const filled=(pct/100)*circ*0.75, off=-(circ*0.125)
  return (
    <div style={{textAlign:"center"}}>
      <svg width="136" height="110" viewBox="0 0 136 110">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e2d45" strokeWidth="13"
          strokeDasharray={`${circ*0.75} ${circ*0.25}`} strokeDashoffset={off} strokeLinecap="round"/>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="13"
          strokeDasharray={`${filled} ${circ-filled}`} strokeDashoffset={off} strokeLinecap="round"
          style={{transition:"stroke-dasharray 1s ease"}}/>
        <text x={cx} y={cy-4} textAnchor="middle" fill={color} fontSize="21" fontWeight="800">{pct.toFixed(2)}</text>
        <text x={cx} y={cy+13} textAnchor="middle" fill="#64748b" fontSize="8.5" letterSpacing="2">RISK SCORE</text>
      </svg>
      <div style={{background:color,color:"#000",fontWeight:"800",fontSize:"0.68rem",padding:"0.2rem 1.4rem",borderRadius:"3px",display:"inline-block",letterSpacing:"2px",marginTop:"-4px"}}>{level}</div>
    </div>
  )
}

/* ═══ Bar Chart ═══ */
function BarChart({ data }) {
  const max = Math.max(...Object.values(data||{}),1)
  return (
    <div style={{display:"flex",gap:"4px",alignItems:"flex-end",height:"54px"}}>
      {Object.entries(data||{}).map(([k,v])=>(
        <div key={k} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:"3px"}}>
          <div style={{width:"100%",background:"#00d4ff",borderRadius:"2px 2px 0 0",height:`${(v/max)*48}px`,opacity:0.8,transition:"height 0.6s ease"}}/>
          <div style={{fontSize:"0.5rem",color:"#475569",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:"36px",textAlign:"center"}}>{k.replace("_"," ").slice(0,6)}</div>
        </div>
      ))}
    </div>
  )
}

/* ═══ Alert Card ═══ */
function AlertCard({ log }) {
  const isLeak = log.action==="bulk_download"
  const c = isLeak?"#ff4466":"#ffd700"
  const loc = log.location_full || fullCountry(log.location)
  return (
    <div style={{background:`${c}08`,border:`1px solid ${c}28`,borderRadius:"6px",padding:"0.6rem",marginBottom:"0.45rem"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.28rem"}}>
        <span style={{background:`${c}22`,color:c,padding:"0.08rem 0.45rem",borderRadius:"3px",fontSize:"0.58rem",fontWeight:"bold",letterSpacing:"1px"}}>● {isLeak?"DATA LEAKAGE":"UNAUTHORIZED ACCESS"}</span>
        <span style={{color:"#475569",fontSize:"0.58rem"}}>{String(log.timestamp).slice(0,16)}</span>
      </div>
      <div style={{color:"#94a3b8",fontSize:"0.68rem",lineHeight:"1.4"}}>
        <strong style={{color:"#e2e8f0"}}>{log.user_id}</strong> {log.action?.replace(/_/g," ")} from <span style={{color:c}}>{log.ip_address}</span> ({loc}) · {log.device}
      </div>
    </div>
  )
}

/* ═══ Sidebar ═══ */
function Sidebar({ active, set }) {
  const nav=[{id:"dashboard",icon:"▣"},{id:"timeline",icon:"◷"},{id:"alerts",icon:"⚑"},{id:"predict",icon:"◈"},{id:"reports",icon:"☰"},{id:"settings",icon:"⚙"}]
  return (
    <div style={{width:"54px",background:"#080d18",borderRight:"1px solid #1a2535",display:"flex",flexDirection:"column",alignItems:"center",padding:"0.8rem 0",gap:"0.3rem",flexShrink:0}}>
      <div style={{width:"30px",height:"30px",background:"linear-gradient(135deg,#00d4ff,#a259ff)",borderRadius:"7px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.95rem",marginBottom:"1rem"}}>☁</div>
      {nav.map(n=>(
        <button key={n.id} onClick={()=>set(n.id)} title={n.id}
          style={{width:"34px",height:"34px",background:active===n.id?"rgba(0,212,255,0.15)":"transparent",border:active===n.id?"1px solid rgba(0,212,255,0.35)":"1px solid transparent",borderRadius:"7px",color:active===n.id?"#00d4ff":"#334155",fontSize:"0.9rem",cursor:"pointer",transition:"all 0.2s",display:"flex",alignItems:"center",justifyContent:"center"}}>
          {n.icon}
        </button>
      ))}
    </div>
  )
}

/* ═══ MAIN ═══ */
export default function App() {
  const [stats,      setStats]      = useState(null)
  const [logs,       setLogs]       = useState([])
  const [total,      setTotal]      = useState(0)
  const [reports,    setReports]    = useState([])
  const [pred,       setPred]       = useState(null)
  const [simData,    setSimData]    = useState([])
  const [loading,    setLoading]    = useState({predict:false,simulate:false,refresh:false,download:false})
  const [apiStatus,  setApiStatus]  = useState("checking")
  const [active,     setActive]     = useState("dashboard")
  const [search,     setSearch]     = useState("")
  const [filterAnomaly,setFilterAnomaly] = useState("")
  const [page,       setPage]       = useState(1)
  const [showUpload, setShowUpload] = useState(false)
  const [form,       setForm]       = useState({action:"bulk_download",location:"BR",device:"Chrome/Windows",file_size_mb:"450"})
  const [toast,      setToast]      = useState(null)

  const showToast = (msg,type="info")=>{ setToast({msg,type}); setTimeout(()=>setToast(null),3500) }

  const fetchStats   = useCallback(()=>{ fetch(`${API}/api/stats`).then(r=>r.json()).then(setStats).catch(()=>{}) },[])
  const fetchLogs    = useCallback((p=1,s="",fa="")=>{
    const params=new URLSearchParams({page:p,per_page:50,...(s&&{search:s}),...(fa&&{anomaly:fa})})
    fetch(`${API}/api/logs?${params}`).then(r=>r.json()).then(d=>{ setLogs(d.logs||[]); setTotal(d.total||0) }).catch(()=>{})
  },[])
  const fetchReports = useCallback(()=>{ fetch(`${API}/api/reports`).then(r=>r.json()).then(setReports).catch(()=>{}) },[])

  useEffect(()=>{
    fetch(`${API}/api/health`).then(r=>r.json()).then(d=>setApiStatus(d.status==="ok"?"online":"offline")).catch(()=>setApiStatus("offline"))
    fetchStats(); fetchLogs(1); fetchReports()
  },[fetchStats,fetchLogs,fetchReports])

  useEffect(()=>{
    const t=setTimeout(()=>{ setPage(1); fetchLogs(1,search,filterAnomaly) },400)
    return ()=>clearTimeout(t)
  },[search,filterAnomaly,fetchLogs])

  const handleRefresh = ()=>{
    setLoading(l=>({...l,refresh:true}))
    fetchStats(); fetchLogs(1,search,filterAnomaly); fetchReports()
    setTimeout(()=>{ setLoading(l=>({...l,refresh:false})); showToast("Data refreshed!","success") },800)
  }

  const handleUploadSuccess = ()=>{
    fetchStats(); fetchLogs(1); fetchReports()
    showToast("Logs uploaded and analyzed successfully!","success")
    setTimeout(()=>setShowUpload(false), 2000)
  }

  const handlePredict = async()=>{
    setLoading(l=>({...l,predict:true})); setPred(null)
    try {
      const r=await fetch(`${API}/api/predict`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,file_size_mb:parseFloat(form.file_size_mb)||0})})
      const d=await r.json()
      if(d.error){ showToast(d.error,"error") } else { setPred(d); fetchReports(); showToast("Analysis complete — report saved!","success") }
    } catch(e){ showToast("Cannot reach Flask API","error") }
    setLoading(l=>({...l,predict:false}))
  }

  const handleSimulate = async()=>{
    setLoading(l=>({...l,simulate:true})); setSimData([])
    try {
      const r=await fetch(`${API}/api/simulate`,{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"})
      const d=await r.json()
      setSimData(d.simulated||[])
      showToast(`Simulated ${d.count} events!`,"success")
    } catch(e){ showToast("Simulation failed","error") }
    setLoading(l=>({...l,simulate:false}))
  }

  const handleDownload = async()=>{
    setLoading(l=>({...l,download:true}))
    try {
      const r=await fetch(`${API}/api/reports/download`)
      const blob=await r.blob()
      const url=window.URL.createObjectURL(blob)
      const a=document.createElement("a"); a.href=url; a.download=`forensics_report_${new Date().toISOString().slice(0,10)}.txt`
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      showToast("Report downloaded!","success")
    } catch(e){ showToast("Download failed","error") }
    setLoading(l=>({...l,download:false}))
  }

  const handleClearReports = async()=>{
    await fetch(`${API}/api/reports/clear`,{method:"DELETE"})
    setReports([]); showToast("Reports cleared","info")
  }

  const anomalyLogs = logs.filter(l=>l.is_anomaly)
  const riskScore   = stats ? stats.anomalies/stats.total_events : 0

  // Styles
  const card  = {background:"#0f1923",border:"1px solid #1a2535",borderRadius:"8px",padding:"0.9rem"}
  const cardT = {color:"#475569",fontSize:"0.58rem",letterSpacing:"2.5px",marginBottom:"0.7rem",textTransform:"uppercase",fontWeight:"600"}
  const th    = {background:"#080d18",padding:"0.42rem 0.65rem",textAlign:"left",color:"#475569",fontSize:"0.58rem",letterSpacing:"1px",borderBottom:"1px solid #1a2535",whiteSpace:"nowrap"}
  const td    = {padding:"0.4rem 0.65rem",borderBottom:"1px solid #0d1420",fontSize:"0.72rem",verticalAlign:"middle"}
  const tag   = {padding:"0.12rem 0.42rem",borderRadius:"3px",fontSize:"0.58rem",fontWeight:"bold",display:"inline-block"}
  const inp   = {background:"#080d18",border:"1px solid #1a2535",color:"#e2e8f0",padding:"0.38rem 0.7rem",borderRadius:"5px",width:"100%",fontSize:"0.75rem",outline:"none",fontFamily:"monospace"}
  const btnB  = {background:"rgba(0,212,255,0.1)",border:"1px solid rgba(0,212,255,0.22)",color:"#00d4ff",padding:"0.33rem 0.85rem",borderRadius:"5px",fontSize:"0.7rem",cursor:"pointer",fontWeight:"600"}
  const btnG  = {background:"linear-gradient(135deg,#00d4ff,#a259ff)",border:"none",color:"#000",padding:"0.33rem 0.85rem",borderRadius:"5px",fontSize:"0.7rem",cursor:"pointer",fontWeight:"700"}
  const btnDl = {background:"rgba(0,255,136,0.12)",border:"1px solid rgba(0,255,136,0.25)",color:"#00ff88",padding:"0.33rem 0.85rem",borderRadius:"5px",fontSize:"0.7rem",cursor:"pointer",fontWeight:"700"}
  const btnR  = {background:"rgba(255,68,102,0.12)",border:"1px solid rgba(255,68,102,0.25)",color:"#ff4466",padding:"0.33rem 0.85rem",borderRadius:"5px",fontSize:"0.7rem",cursor:"pointer",fontWeight:"600"}

  return (
    <div style={{display:"flex",height:"100vh",width:"100vw",background:"#0a0f1a",color:"#e2e8f0",fontFamily:"'Segoe UI',monospace",overflow:"hidden"}}>

      {showUpload && <UploadModal onClose={()=>setShowUpload(false)} onSuccess={handleUploadSuccess} showToast={showToast}/>}

      <Sidebar active={active} set={setActive}/>

      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0}}>

        {/* Topbar */}
        <div style={{background:"#080d18",borderBottom:"1px solid #1a2535",padding:"0.5rem 1.1rem",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div style={{display:"flex",gap:"0.4rem",alignItems:"center",flexWrap:"wrap"}}>
            <span style={{fontSize:"0.78rem",fontWeight:"700",color:"#00d4ff",marginRight:"0.4rem"}}>☁ Cloud Storage Forensics</span>
            <button style={btnB} onClick={()=>setShowUpload(true)}>⬆ Upload Logs</button>
            <button style={btnB} onClick={handleSimulate} disabled={loading.simulate}>{loading.simulate?"⏳...":"⟳ Simulate Activity"}</button>
            <button style={btnG} onClick={handlePredict} disabled={loading.predict}>{loading.predict?"⏳ Analyzing...":"▷ Run Forensic Analysis"}</button>
            <button style={btnDl} onClick={handleDownload} disabled={loading.download}>{loading.download?"⏳...":"⬇ Generate Report"}</button>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:"0.5rem",flexShrink:0}}>
            <div style={{width:"6px",height:"6px",borderRadius:"50%",background:apiStatus==="online"?"#00ff88":"#ff4466",boxShadow:apiStatus==="online"?"0 0 7px #00ff88":"0 0 7px #ff4466"}}/>
            <span style={{fontSize:"0.62rem",color:apiStatus==="online"?"#00ff88":"#ff4466"}}>{apiStatus==="online"?"API ONLINE":"API OFFLINE"}</span>
            <input placeholder="🔍 Search..." value={search} onChange={e=>setSearch(e.target.value)} style={{...inp,width:"140px"}}/>
            <select value={filterAnomaly} onChange={e=>setFilterAnomaly(e.target.value)} style={{...inp,width:"105px"}}>
              <option value="">All Events</option>
              <option value="1">Anomalies Only</option>
              <option value="0">Normal Only</option>
            </select>
            <div style={{background:"rgba(0,212,255,0.08)",border:"1px solid rgba(0,212,255,0.18)",borderRadius:"20px",padding:"0.2rem 0.75rem",fontSize:"0.68rem",color:"#00d4ff"}}>◑ Admin</div>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div style={{position:"fixed",top:"60px",right:"20px",zIndex:9999,background:toast.type==="error"?"#ff4466":toast.type==="success"?"#00ff88":"#00d4ff",color:"#000",padding:"0.5rem 1.2rem",borderRadius:"6px",fontSize:"0.78rem",fontWeight:"700",boxShadow:"0 4px 20px rgba(0,0,0,0.5)"}}>
            {toast.msg}
          </div>
        )}

        {/* Content */}
        <div style={{flex:1,overflowY:"auto",padding:"0.8rem 1rem",display:"flex",flexDirection:"column",gap:"0.7rem"}}>

          {/* DASHBOARD */}
          {active==="dashboard" && <>
            {/* Stats */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"0.6rem"}}>
              {[
                {label:"TOTAL EVENTS",   val:stats?.total_events??"—",    color:"#00d4ff"},
                {label:"ANOMALIES",      val:stats?.anomalies??"—",        color:"#ff4466"},
                {label:"DETECTION RATE", val:stats?stats.detection_rate+"%":"—", color:"#ffd700"},
                {label:"ML ACCURACY",   val:"82%",                         color:"#a259ff"},
              ].map(({label,val,color})=>(
                <div key={label} style={card}>
                  <div style={{...cardT,marginBottom:"0.3rem"}}>{label}</div>
                  <div style={{fontSize:"1.55rem",fontWeight:"800",color,lineHeight:1}}>{val}</div>
                </div>
              ))}
            </div>

            {/* Timeline | Gauge | Alerts */}
            <div style={{display:"grid",gridTemplateColumns:"1.6fr 0.85fr 1fr",gap:"0.7rem"}}>
              <div style={card}>
                <div style={{...cardT,display:"flex",justifyContent:"space-between"}}><span>🕐 Forensic Timeline</span><span style={{color:"#334155"}}>{total} total</span></div>
                <div style={{overflowY:"auto",maxHeight:"250px"}}>
                  {logs.length===0 && <div style={{color:"#334155",textAlign:"center",padding:"2rem",fontSize:"0.78rem"}}>No logs — upload a CSV file to start</div>}
                  {logs.map((log,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"flex-start",gap:"0.45rem",padding:"0.35rem 0",borderBottom:"1px solid #0d1420"}}>
                      <div style={{fontSize:"0.58rem",color:"#475569",minWidth:"34px",paddingTop:"2px",flexShrink:0,fontFamily:"monospace"}}>{String(log.timestamp).slice(11,16)}</div>
                      <div style={{width:"16px",height:"16px",borderRadius:"50%",background:log.is_anomaly?"rgba(255,68,102,0.2)":"rgba(0,212,255,0.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.55rem",flexShrink:0}}>{ACT_ICON[log.action]||"●"}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:"0.68rem",color:log.is_anomaly?"#ff9999":"#cbd5e1",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                          <strong>{log.user_id}</strong> {log.action?.replace(/_/g," ")} <span style={{color:"#475569"}}>{log.file_id}</span>
                        </div>
                        <div style={{fontSize:"0.58rem",color:"#334155"}}>{log.ip_address} · {log.location_full||fullCountry(log.location)} · {log.device?.split("/")[0]}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{display:"flex",gap:"0.4rem",marginTop:"0.5rem",justifyContent:"center"}}>
                  <button style={{...btnB,padding:"0.2rem 0.6rem",fontSize:"0.65rem"}} onClick={()=>{const p=Math.max(1,page-1);setPage(p);fetchLogs(p,search,filterAnomaly)}} disabled={page===1}>◀</button>
                  <span style={{fontSize:"0.65rem",color:"#475569",lineHeight:"1.8"}}>Page {page}</span>
                  <button style={{...btnB,padding:"0.2rem 0.6rem",fontSize:"0.65rem"}} onClick={()=>{const p=page+1;setPage(p);fetchLogs(p,search,filterAnomaly)}}>▶</button>
                </div>
              </div>

              <div style={card}>
                <div style={cardT}>⚡ Risk Score</div>
                <Gauge score={riskScore}/>
                <div style={{marginTop:"0.8rem",display:"flex",flexDirection:"column",gap:"0.35rem"}}>
                  <button onClick={handlePredict} disabled={loading.predict} style={{...btnG,width:"100%",padding:"0.48rem"}}>{loading.predict?"⏳ Analyzing...":"▷ Run Analysis"}</button>
                  <button onClick={handleDownload} disabled={loading.download} style={{...btnDl,width:"100%",padding:"0.48rem"}}>{loading.download?"⏳...":"⬇ Generate Report"}</button>
                  <button onClick={()=>setShowUpload(true)} style={{...btnB,width:"100%",padding:"0.48rem"}}>⬆ Upload Logs</button>
                </div>
                {pred && (
                  <div style={{marginTop:"0.65rem",padding:"0.65rem",background:"#080d18",borderRadius:"6px",border:`1px solid ${pred.risk_score>0.5?"#ff4466":"#00ff88"}`,textAlign:"center"}}>
                    <div style={{fontSize:"1.3rem",fontWeight:"800",color:pred.risk_score>0.5?"#ff4466":"#00ff88"}}>{pred.risk_score}</div>
                    <div style={{background:pred.risk_score>0.5?"rgba(255,68,102,0.2)":"rgba(0,255,136,0.15)",color:pred.risk_score>0.5?"#ff4466":"#00ff88",padding:"0.15rem 0.8rem",borderRadius:"3px",fontSize:"0.65rem",fontWeight:"800",display:"inline-block",letterSpacing:"1px",margin:"0.3rem 0"}}>{pred.risk_level}</div>
                    <div style={{color:"#475569",fontSize:"0.62rem"}}>{pred.recommendation}</div>
                  </div>
                )}
              </div>

              <div style={card}>
                <div style={{...cardT,display:"flex",justifyContent:"space-between"}}><span>🚨 Incident Alerts</span><span style={{color:anomalyLogs.length>0?"#ff4466":"#334155"}}>{anomalyLogs.length} active</span></div>
                <div style={{overflowY:"auto",maxHeight:"300px"}}>
                  {anomalyLogs.length===0 && <div style={{color:"#334155",textAlign:"center",padding:"1.5rem",fontSize:"0.75rem"}}>✓ No anomalies detected</div>}
                  {anomalyLogs.slice(0,8).map((log,i)=><AlertCard key={i} log={log}/>)}
                </div>
              </div>
            </div>

            {/* Predictor | Summary */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.7rem"}}>
              <div style={card}>
                <div style={cardT}>◈ Live Risk Predictor</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.45rem",marginBottom:"0.55rem"}}>
                  {[
                    {k:"action",      label:"Action",        hint:"bulk_download, login, upload..."},
                    {k:"location",    label:"Location Code", hint:"BR, IN, US, CN, FR, RU"},
                    {k:"device",      label:"Device",        hint:"Chrome/Windows"},
                    {k:"file_size_mb",label:"File Size (MB)",hint:"0.1 – 500"},
                  ].map(({k,label,hint})=>(
                    <div key={k}>
                      <div style={{color:"#475569",fontSize:"0.58rem",marginBottom:"0.15rem"}}>{label.toUpperCase()}</div>
                      <input style={inp} placeholder={hint} value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}/>
                    </div>
                  ))}
                </div>
                {form.location && <div style={{color:"#64748b",fontSize:"0.65rem",marginBottom:"0.4rem"}}>📍 {fullCountry(form.location.toUpperCase())}</div>}
                <button onClick={handlePredict} disabled={loading.predict} style={{...btnG,width:"100%",padding:"0.52rem"}}>
                  {loading.predict?"⏳ Analyzing...":"▷ Run Forensic Analysis"}
                </button>
                {pred && (
                  <div style={{marginTop:"0.6rem",padding:"0.7rem",background:"#080d18",borderRadius:"6px",border:`1px solid ${pred.risk_score>0.5?"#ff4466":"#00ff88"}`,display:"flex",gap:"1rem",alignItems:"center"}}>
                    <div style={{textAlign:"center",minWidth:"60px"}}>
                      <div style={{fontSize:"1.4rem",fontWeight:"800",color:pred.risk_score>0.5?"#ff4466":"#00ff88"}}>{pred.risk_score}</div>
                      <div style={{fontSize:"0.58rem",color:"#475569"}}>SCORE</div>
                    </div>
                    <div style={{flex:1}}>
                      <div style={{background:pred.risk_score>0.5?"rgba(255,68,102,0.2)":"rgba(0,255,136,0.15)",color:pred.risk_score>0.5?"#ff4466":"#00ff88",padding:"0.2rem 0.7rem",borderRadius:"4px",fontSize:"0.7rem",fontWeight:"800",display:"inline-block",marginBottom:"0.25rem"}}>{pred.risk_level} — {pred.label?.toUpperCase()}</div>
                      <div style={{color:"#64748b",fontSize:"0.62rem",marginBottom:"0.15rem"}}>📍 {pred.location_full||fullCountry(pred.location)}</div>
                      <div style={{color:"#64748b",fontSize:"0.62rem"}}>{pred.recommendation}</div>
                    </div>
                  </div>
                )}
              </div>

              <div style={card}>
                <div style={cardT}>📊 Summary</div>
                {stats?.top_actions ? <BarChart data={stats.top_actions}/> : <div style={{color:"#334155",fontSize:"0.72rem"}}>Loading...</div>}
                <div style={{...cardT,marginTop:"0.8rem"}}>🌍 Risk by Country</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:"0.3rem"}}>
                  {stats?.risk_by_location && Object.entries(stats.risk_by_location).sort((a,b)=>b[1]-a[1]).map(([loc,risk])=>(
                    <div key={loc} style={{background:"#080d18",borderRadius:"5px",padding:"0.35rem 0.6rem",border:`1px solid ${risk>0.4?"rgba(255,68,102,0.25)":"rgba(0,255,136,0.12)"}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div style={{fontSize:"0.62rem",color:"#94a3b8",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"100px"}}>{loc}</div>
                      <div style={{fontSize:"0.78rem",fontWeight:"800",color:risk>0.4?"#ff4466":"#00ff88",flexShrink:0}}>{(risk*100).toFixed(0)}%</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Simulate Results */}
            {simData.length>0 && (
              <div style={card}>
                <div style={{...cardT,display:"flex",justifyContent:"space-between"}}>
                  <span>⟳ Simulation Results — {simData.length} events</span>
                  <button style={{...btnB,fontSize:"0.6rem",padding:"0.15rem 0.5rem"}} onClick={()=>setSimData([])}>✕ Close</button>
                </div>
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse"}}>
                    <thead><tr>{["USER","ACTION","COUNTRY","DEVICE","SIZE MB","IP","RISK","STATUS"].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {simData.map((r,i)=>(
                        <tr key={i} style={{background:r.label==="anomaly"?"rgba(255,68,102,0.04)":"transparent"}}>
                          <td style={td}>{r.user_id}</td>
                          <td style={td}><span style={{...tag,...(ACT_COLOR[r.action]||{bg:"rgba(0,212,255,0.1)",color:"#00d4ff"})}}>{r.action}</span></td>
                          <td style={td}>{r.location_full||fullCountry(r.location)}</td>
                          <td style={td}>{r.device?.split("/")[0]}</td>
                          <td style={{...td,fontFamily:"monospace"}}>{r.file_size_mb}</td>
                          <td style={{...td,fontFamily:"monospace",fontSize:"0.65rem",color:"#64748b"}}>{r.ip_address}</td>
                          <td style={{...td,fontFamily:"monospace",fontWeight:"700",color:r.risk_score>0.5?"#ff4466":"#00ff88"}}>{r.risk_score}</td>
                          <td style={td}><span style={{...tag,background:r.label==="anomaly"?"rgba(255,68,102,0.2)":"rgba(0,255,136,0.12)",color:r.label==="anomaly"?"#ff4466":"#00ff88"}}>{r.label==="anomaly"?"⚠ ANOMALY":"✓ NORMAL"}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Log Table */}
            <div style={card}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.6rem"}}>
                <div style={cardT}>📋 Query Logs — {total} results</div>
                <div style={{display:"flex",gap:"0.4rem"}}>
                  <button style={btnB} onClick={()=>setShowUpload(true)}>⬆ Upload CSV</button>
                  <button style={btnDl} onClick={handleDownload} disabled={loading.download}>{loading.download?"⏳...":"⬇ Download Report"}</button>
                </div>
              </div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead><tr>{["TIMESTAMP","USER","ACTION","FILE","IP ADDRESS","COUNTRY","DEVICE","SIZE MB","STATUS"].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {logs.map((log,i)=>(
                      <tr key={i} style={{background:log.is_anomaly?"rgba(255,68,102,0.04)":"transparent"}}
                        onMouseEnter={e=>e.currentTarget.style.background=log.is_anomaly?"rgba(255,68,102,0.08)":"rgba(255,255,255,0.02)"}
                        onMouseLeave={e=>e.currentTarget.style.background=log.is_anomaly?"rgba(255,68,102,0.04)":"transparent"}>
                        <td style={{...td,fontFamily:"monospace",fontSize:"0.65rem",color:"#64748b"}}>{String(log.timestamp).slice(0,16)}</td>
                        <td style={{...td,fontWeight:"600"}}>{log.user_id}</td>
                        <td style={td}><span style={{...tag,...(ACT_COLOR[log.action]||{bg:"rgba(0,212,255,0.1)",color:"#00d4ff"})}}>{log.action}</span></td>
                        <td style={{...td,color:"#475569",fontFamily:"monospace",fontSize:"0.65rem"}}>{log.file_id}</td>
                        <td style={{...td,fontFamily:"monospace",fontSize:"0.65rem",color:"#64748b"}}>{log.ip_address}</td>
                        <td style={td}>{log.location_full||fullCountry(log.location)}</td>
                        <td style={{...td,color:"#64748b",fontSize:"0.65rem"}}>{log.device?.split("/")[0]}</td>
                        <td style={{...td,fontFamily:"monospace",textAlign:"right"}}>{log.file_size_mb}</td>
                        <td style={td}><span style={{...tag,background:log.is_anomaly?"rgba(255,68,102,0.2)":"rgba(0,255,136,0.1)",color:log.is_anomaly?"#ff4466":"#00ff88"}}>{log.is_anomaly?"⚠ ANOMALY":"✓ NORMAL"}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {logs.length===0 && <div style={{textAlign:"center",padding:"2rem",color:"#334155"}}>Upload a CSV file to see logs here</div>}
              </div>
            </div>
          </>}

          {/* ALERTS */}
          {active==="alerts" && (
            <div style={card}>
              <div style={cardT}>🚨 All Incident Alerts — {anomalyLogs.length} anomalies</div>
              {anomalyLogs.length===0 && <div style={{color:"#334155",textAlign:"center",padding:"3rem"}}>✓ No anomalies detected</div>}
              {anomalyLogs.map((log,i)=><AlertCard key={i} log={log}/>)}
            </div>
          )}

          {/* PREDICT */}
          {active==="predict" && (
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.7rem"}}>
              <div style={card}>
                <div style={cardT}>◈ Forensic Risk Analyzer</div>
                <p style={{color:"#475569",fontSize:"0.72rem",marginBottom:"0.8rem",lineHeight:"1.5"}}>Enter event details to analyze risk using the trained Random Forest ML model.</p>
                {[
                  {k:"action",      label:"Action Type",    hint:"bulk_download, login, upload, download, share, permission_change"},
                  {k:"location",    label:"Country Code",   hint:"IN=India  US=United States  BR=Brazil  CN=China  FR=France  RU=Russia"},
                  {k:"device",      label:"Device/Browser", hint:"Chrome/Windows, Firefox/Linux, Safari/Mac, Edge/Windows"},
                  {k:"file_size_mb",label:"File Size (MB)", hint:"e.g. 450"},
                ].map(({k,label,hint})=>(
                  <div key={k} style={{marginBottom:"0.6rem"}}>
                    <div style={{color:"#475569",fontSize:"0.6rem",marginBottom:"0.18rem"}}>{label.toUpperCase()}</div>
                    <input style={inp} placeholder={hint} value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}/>
                    {k==="location"&&form.location&&<div style={{color:"#64748b",fontSize:"0.62rem",marginTop:"0.15rem"}}>📍 {fullCountry(form.location.toUpperCase())}</div>}
                  </div>
                ))}
                <button onClick={handlePredict} disabled={loading.predict} style={{...btnG,width:"100%",padding:"0.6rem",fontSize:"0.8rem"}}>
                  {loading.predict?"⏳ Analyzing...":"▷ Run Forensic Analysis"}
                </button>
              </div>
              <div style={card}>
                <div style={cardT}>📊 Analysis Result</div>
                {!pred&&<div style={{color:"#334155",textAlign:"center",padding:"3rem"}}>Run an analysis to see results</div>}
                {pred&&!pred.error&&(
                  <>
                    <Gauge score={pred.risk_score}/>
                    <div style={{marginTop:"1rem",display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.5rem"}}>
                      {[
                        {label:"Risk Score", val:pred.risk_score, color:pred.risk_score>0.5?"#ff4466":"#00ff88"},
                        {label:"Risk Level", val:pred.risk_level, color:pred.risk_score>0.7?"#ff4466":pred.risk_score>0.4?"#ffd700":"#00ff88"},
                        {label:"Verdict",    val:pred.label?.toUpperCase(), color:pred.label==="anomaly"?"#ff4466":"#00ff88"},
                        {label:"Country",    val:pred.location_full||fullCountry(pred.location), color:"#94a3b8"},
                      ].map(({label,val,color})=>(
                        <div key={label} style={{background:"#080d18",borderRadius:"5px",padding:"0.5rem 0.7rem"}}>
                          <div style={{color:"#475569",fontSize:"0.58rem",marginBottom:"0.2rem"}}>{label}</div>
                          <div style={{color,fontWeight:"700",fontSize:"0.82rem"}}>{val}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{marginTop:"0.6rem",background:"#080d18",borderRadius:"5px",padding:"0.6rem",border:`1px solid ${pred.risk_score>0.5?"rgba(255,68,102,0.3)":"rgba(0,255,136,0.2)"}`}}>
                      <div style={{color:"#475569",fontSize:"0.58rem",marginBottom:"0.2rem"}}>RECOMMENDATION</div>
                      <div style={{color:"#e2e8f0",fontSize:"0.75rem",lineHeight:"1.5"}}>{pred.recommendation}</div>
                    </div>
                    <button onClick={handleDownload} style={{...btnDl,width:"100%",padding:"0.5rem",marginTop:"0.6rem"}}>⬇ Download Full Report</button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* REPORTS */}
          {active==="reports" && (
            <div style={card}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.7rem"}}>
                <div style={cardT}>☰ Saved Reports — {reports.length} records</div>
                <div style={{display:"flex",gap:"0.4rem"}}>
                  <button style={btnDl} onClick={handleDownload} disabled={loading.download}>{loading.download?"⏳...":"⬇ Download Report"}</button>
                  <button style={btnB} onClick={fetchReports}>⟳ Refresh</button>
                  <button style={btnR} onClick={handleClearReports}>✕ Clear All</button>
                </div>
              </div>
              {reports.length===0&&<div style={{color:"#334155",textAlign:"center",padding:"3rem"}}>No reports yet — run a forensic analysis first</div>}
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:"0.6rem"}}>
                {reports.map((r,i)=>(
                  <div key={i} style={{background:"#080d18",border:`1px solid ${r.risk_score>0.5?"rgba(255,68,102,0.25)":"rgba(0,255,136,0.15)"}`,borderRadius:"7px",padding:"0.8rem"}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:"0.4rem"}}>
                      <span style={{...tag,background:r.risk_score>0.5?"rgba(255,68,102,0.2)":"rgba(0,255,136,0.12)",color:r.risk_score>0.5?"#ff4466":"#00ff88"}}>{r.risk_level} — {r.label?.toUpperCase()}</span>
                      <span style={{fontSize:"0.6rem",color:"#334155"}}>{String(r.timestamp).slice(0,16)}</span>
                    </div>
                    <div style={{fontSize:"1.2rem",fontWeight:"800",color:r.risk_score>0.5?"#ff4466":"#00ff88",marginBottom:"0.3rem"}}>{r.risk_score}</div>
                    <div style={{fontSize:"0.68rem",color:"#64748b",marginBottom:"0.2rem"}}>Action: <span style={{color:"#94a3b8"}}>{r.action}</span></div>
                    <div style={{fontSize:"0.68rem",color:"#64748b",marginBottom:"0.2rem"}}>Country: <span style={{color:"#94a3b8"}}>{r.location_full||fullCountry(r.location)}</span></div>
                    <div style={{fontSize:"0.68rem",color:"#64748b",marginBottom:"0.2rem"}}>Device: <span style={{color:"#94a3b8"}}>{r.device}</span></div>
                    <div style={{fontSize:"0.65rem",color:"#475569",lineHeight:"1.4",marginTop:"0.3rem",borderTop:"1px solid #1a2535",paddingTop:"0.3rem"}}>{r.recommendation}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TIMELINE */}
          {active==="timeline" && (
            <div style={card}>
              <div style={cardT}>◷ Complete Forensic Timeline — {total} events</div>
              <div style={{overflowY:"auto",maxHeight:"calc(100vh - 200px)"}}>
                {logs.map((log,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"flex-start",gap:"0.7rem",padding:"0.5rem 0",borderBottom:"1px solid #0d1420",background:log.is_anomaly?"rgba(255,68,102,0.03)":"transparent"}}>
                    <div style={{fontSize:"0.65rem",color:"#475569",minWidth:"100px",fontFamily:"monospace",flexShrink:0}}>{String(log.timestamp).slice(0,16)}</div>
                    <div style={{width:"20px",height:"20px",borderRadius:"50%",background:log.is_anomaly?"rgba(255,68,102,0.2)":"rgba(0,212,255,0.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.7rem",flexShrink:0}}>{ACT_ICON[log.action]||"●"}</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:"0.75rem",color:log.is_anomaly?"#ff9999":"#e2e8f0"}}><strong>{log.user_id}</strong> {log.action?.replace(/_/g," ")} <span style={{color:"#475569"}}>{log.file_id}</span></div>
                      <div style={{fontSize:"0.62rem",color:"#334155"}}>{log.ip_address} · {log.location_full||fullCountry(log.location)} · {log.device} · {log.file_size_mb} MB</div>
                    </div>
                    <span style={{...tag,background:log.is_anomaly?"rgba(255,68,102,0.2)":"rgba(0,255,136,0.1)",color:log.is_anomaly?"#ff4466":"#00ff88",flexShrink:0}}>{log.is_anomaly?"⚠ ANOMALY":"✓ NORMAL"}</span>
                  </div>
                ))}
              </div>
              <div style={{display:"flex",gap:"0.5rem",marginTop:"0.6rem",justifyContent:"center"}}>
                <button style={btnB} onClick={()=>{const p=Math.max(1,page-1);setPage(p);fetchLogs(p,search,filterAnomaly)}} disabled={page===1}>◀ Prev</button>
                <span style={{fontSize:"0.7rem",color:"#475569",lineHeight:"1.8"}}>Page {page}</span>
                <button style={btnB} onClick={()=>{const p=page+1;setPage(p);fetchLogs(p,search,filterAnomaly)}}>Next ▶</button>
              </div>
            </div>
          )}

          {/* SETTINGS */}
          {active==="settings" && (
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.7rem"}}>
              <div style={card}>
                <div style={cardT}>⚙ System Information</div>
                {[
                  {label:"API Endpoint",  val:API},
                  {label:"ML Model",      val:"Random Forest (n=100)"},
                  {label:"Database",      val:"SQLite — forensics.db"},
                  {label:"Dataset Size",  val:`${stats?.total_events||0} records`},
                  {label:"Anomaly Rate",  val:`${stats?.detection_rate||0}%`},
                  {label:"API Status",    val:apiStatus.toUpperCase()},
                ].map(({label,val})=>(
                  <div key={label} style={{display:"flex",justifyContent:"space-between",padding:"0.5rem 0",borderBottom:"1px solid #1a2535",fontSize:"0.75rem"}}>
                    <span style={{color:"#475569"}}>{label}</span>
                    <span style={{color:"#e2e8f0",fontFamily:"monospace"}}>{val}</span>
                  </div>
                ))}
              </div>
              <div style={card}>
                <div style={cardT}>📁 Quick Actions</div>
                <div style={{display:"flex",flexDirection:"column",gap:"0.5rem"}}>
                  <button style={{...btnB,padding:"0.6rem"}} onClick={()=>setShowUpload(true)}>⬆ Upload CSV Logs</button>
                  <button style={{...btnG,padding:"0.6rem"}} onClick={handleRefresh}>⟳ Refresh All Data</button>
                  <button style={{...btnB,padding:"0.6rem"}} onClick={handleSimulate}>◎ Run Simulation (10 events)</button>
                  <button style={{...btnDl,padding:"0.6rem"}} onClick={handleDownload}>⬇ Download Full Report</button>
                  <button style={{...btnR,padding:"0.6rem"}} onClick={handleClearReports}>✕ Clear All Reports</button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
