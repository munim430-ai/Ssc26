'use client'

import { useEffect, useState, useCallback } from 'react'
import { GRADES } from '@/lib/grades'
import type { Result } from '@/lib/types'

type Row = { code: string; name: string; grade: string; isCommon?: boolean }

const DEFAULT_COMMON_SUBJECTS: Row[] = [
  { code: '101', name: 'BANGLA', grade: 'A+', isCommon: true },
  { code: '107', name: 'ENGLISH', grade: 'A+', isCommon: true },
  { code: '109', name: 'MATHEMATICS', grade: 'A+', isCommon: true },
  { code: '154', name: 'INFORMATION AND COMMUNICATION TECHNOLOGY', grade: 'A+', isCommon: true },
  { code: '111', name: 'ISLAM AND MORAL EDUCATION', grade: 'A+', isCommon: true },
  { code: '150', name: 'BANGLADESH AND GLOBAL STUDIES', grade: 'A+', isCommon: true },
  { code: '147', name: 'PHYSICAL EDUCATION, HEALTH AND SPORTS', grade: 'A+', isCommon: true },
]

const EMPTY = {
  roll_number: '', registration_no: '', board: 'dhaka', exam: 'ssc',
  exam_year: String(new Date().getFullYear()),
  student_name: '', father_name: '', mother_name: '', group_name: 'SCIENCE',
  student_type: 'REGULAR', gender: 'Male', date_of_birth: '', session: '',
  institute_name: '', gpa: '5.00', result_status: 'Passed', remarks: '',
}

const BOARDS = [
  ['barisal', 'Barisal'], ['chittagong', 'Chittagong'], ['comilla', 'Comilla'], ['dhaka', 'Dhaka'],
  ['dinajpur', 'Dinajpur'], ['jessore', 'Jessore'], ['madrasah', 'Madrasah'], ['mymensingh', 'Mymensingh'],
  ['rajshahi', 'Rajshahi'], ['sylhet', 'Sylhet'], ['tec', 'Technical'],
] as const
const EXAMS = [
  ['jsc', 'JSC/JDC'], ['ssc', 'SSC/Dakhil/Equivalent'],
  ['hsc', 'HSC/Alim/Equivalent'], ['dibs', 'DIBS (Diploma in Business Studies)'],
] as const
const YEARS = Array.from(
  { length: new Date().getFullYear() - 1995 },
  (_, i) => String(new Date().getFullYear() - i),
)

const GRADE_POINTS: Record<string, number> = {
  'A+': 5.0, 'A': 4.0, 'A-': 3.5, 'B+': 3.0, 'B': 2.5, 'B-': 2.0,
  'C': 1.5, 'D': 1.0, 'F': 0.0,
}

type ListRow = Pick<Result, 'id' | 'roll_number' | 'student_name' | 'board' | 'exam' | 'exam_year'>

export default function AdminDashboard() {
  const [form, setForm] = useState<Record<string, string>>({ ...EMPTY })
  const [commonSubs, setCommonSubs] = useState<Row[]>([...DEFAULT_COMMON_SUBJECTS])
  const [optionalSubs, setOptionalSubs] = useState<Row[]>([
    { code: '136', name: 'PHYSICS', grade: 'A+' },
    { code: '137', name: 'CHEMISTRY', grade: 'A+' },
    { code: '138', name: 'BIOLOGY', grade: 'A+' },
    { code: '126', name: 'HIGHER MATHEMATICS', grade: 'A+' },
  ])
  const [caSubs, setCaSubs] = useState<Row[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [list, setList] = useState<ListRow[]>([])
  const [filter, setFilter] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [ocrText, setOcrText] = useState('')
  const [htmlCode, setHtmlCode] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const loadList = useCallback(async () => {
    try {
      const r = await fetch('/api/results', { cache: 'no-store' })
      if (r.ok) {
        const data = await r.json()
        setList((data.results as ListRow[]) ?? [])
      }
    } catch {
      /* ignore load errors */
    }
  }, [])

  useEffect(() => { loadList() }, [loadList])

  function setField(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })) }

  // Combine common and optional subjects
  const allSubs = [...commonSubs, ...optionalSubs]

  // Calculate current GPA from all subjects
  function getCurrentGPA(): number {
    if (allSubs.length === 0) return 5.0
    let total = 0, count = 0
    for (const s of allSubs) {
      if (!s.code.trim()) continue
      const pt = GRADE_POINTS[s.grade] ?? 5.0
      total += pt
      count++
    }
    if (count === 0) return 5.0
    return Math.round((total / count) * 100) / 100
  }

  const calculatedGpa = getCurrentGPA()
  const needsGpa5Upgrade = calculatedGpa < 5.0 || form.gpa !== '5.00'

  function applyGPA5Optimization() {
    setCommonSubs((prev) => prev.map((s) => ({ ...s, grade: 'A+' })))
    setOptionalSubs((prev) => prev.map((s) => ({ ...s, grade: 'A+' })))
    setForm((f) => ({ ...f, gpa: '5.00', result_status: 'Passed' }))
    setMsg('✨ GPA 5.00 Optimization Applied! All grades set to A+.')
  }

  // ONE-SHOT HTML FILE PARSER & AUTO-UPGRADER
  function parseHtmlContent(htmlContent: string) {
    try {
      const parser = new DOMParser()
      const doc = parser.parseFromString(htmlContent, 'text/html')
      const newForm: Record<string, string> = { ...form }

      const cells = Array.from(doc.querySelectorAll('td, span, div'))
      for (let i = 0; i < cells.length; i++) {
        const txt = cells[i].textContent?.trim() || ''
        const nextTxt = cells[i + 1]?.textContent?.trim() || ''

        if (/roll no/i.test(txt) && nextTxt) newForm.roll_number = nextTxt.replace(/[^0-9]/g, '')
        if (/registration no/i.test(txt) && nextTxt) newForm.registration_no = nextTxt.replace(/[^0-9]/g, '')
        if (/name of student/i.test(txt) && nextTxt) newForm.student_name = nextTxt
        if (/father/i.test(txt) && nextTxt) newForm.father_name = nextTxt
        if (/mother/i.test(txt) && nextTxt) newForm.mother_name = nextTxt
        if (/board/i.test(txt) && nextTxt) {
          const b = nextTxt.toLowerCase()
          const match = BOARDS.find(([c, n]) => b.includes(c) || b.includes(n.toLowerCase()))
          if (match) newForm.board = match[0]
        }
        if (/group/i.test(txt) && nextTxt) newForm.group_name = nextTxt.toUpperCase()
        if (/type/i.test(txt) && nextTxt) newForm.student_type = nextTxt.toUpperCase()
        if (/gender/i.test(txt) && nextTxt) newForm.gender = nextTxt
        if (/date of birth/i.test(txt) && nextTxt) newForm.date_of_birth = nextTxt
        if (/session/i.test(txt) && nextTxt) newForm.session = nextTxt
        if (/institute/i.test(txt) && nextTxt) newForm.institute_name = nextTxt
      }

      // One-shot GPA 5.00 assignment
      newForm.gpa = '5.00'
      newForm.result_status = 'Passed'
      setForm(newForm)

      // Extract subject table rows
      const extractedSubs: Row[] = []
      const rows = Array.from(doc.querySelectorAll('tr'))
      for (const r of rows) {
        const tds = Array.from(r.querySelectorAll('td'))
        if (tds.length >= 3) {
          const code = tds[0].textContent?.trim() || ''
          const name = tds[1].textContent?.trim() || ''
          if (/^[0-9]{3}$/.test(code) && name.length > 1) {
            // Instantly upgrade all subjects to A+ for GPA 5.00 in one shot
            extractedSubs.push({ code, name: name.toUpperCase(), grade: 'A+' })
          }
        }
      }

      if (extractedSubs.length > 0) {
        const commonMatch = DEFAULT_COMMON_SUBJECTS.map((def) => {
          const found = extractedSubs.find((s) => s.code === def.code)
          return found ? { ...def, grade: 'A+' } : { ...def, grade: 'A+' }
        })
        const optMatch = extractedSubs.filter((s) => !DEFAULT_COMMON_SUBJECTS.some((def) => def.code === s.code))
          .map((s) => ({ ...s, grade: 'A+' }))

        setCommonSubs(commonMatch)
        setOptionalSubs(optMatch.length ? optMatch : [{ code: '', name: '', grade: 'A+' }])
        setMsg(`✨ HTML parsed! Discovered ${extractedSubs.length} subjects and auto-upgraded result to GPA 5.00 in one shot!`)
      } else {
        setCommonSubs((prev) => prev.map((s) => ({ ...s, grade: 'A+' })))
        setOptionalSubs((prev) => prev.map((s) => ({ ...s, grade: 'A+' })))
        setMsg('✨ HTML parsed! Form fields updated & result auto-upgraded to GPA 5.00 in one shot!')
      }
    } catch {
      setErr('Error parsing HTML content.')
    }
  }

  function handleHtmlFileUpload(file: File) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      setHtmlCode(content)
      parseHtmlContent(content)
    }
    reader.readAsText(file)
  }

  function pack(rows: Row[]): Record<string, { name: string; grade: string }> {
    const out: Record<string, { name: string; grade: string }> = {}
    for (const r of rows) {
      const code = r.code.trim()
      if (!code) continue
      out[code] = { name: r.name.trim(), grade: r.grade }
    }
    return out
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(''); setMsg(''); setBusy(true)
    const payload = {
      ...form,
      roll_number: Number(form.roll_number),
      registration_no: Number(form.registration_no),
      exam_year: Number(form.exam_year),
      gpa: form.gpa === '' ? null : Number(form.gpa),
      subjects: pack(allSubs),
      ca_subjects: pack(caSubs),
    }
    const url = editingId ? `/api/results/${editingId}` : '/api/results'
    const method = editingId ? 'PATCH' : 'POST'
    try {
      const r = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) { setErr(data.error || 'Save failed'); return }
      setMsg(editingId ? 'Result updated successfully.' : 'Result saved successfully.')
      reset()
      await loadList()
    } catch {
      setErr('Network error.')
    } finally {
      setBusy(false)
    }
  }

  function reset() {
    setForm({ ...EMPTY })
    setCommonSubs([...DEFAULT_COMMON_SUBJECTS])
    setOptionalSubs([
      { code: '136', name: 'PHYSICS', grade: 'A+' },
      { code: '137', name: 'CHEMISTRY', grade: 'A+' },
      { code: '138', name: 'BIOLOGY', grade: 'A+' },
      { code: '126', name: 'HIGHER MATHEMATICS', grade: 'A+' },
    ])
    setCaSubs([])
    setEditingId(null)
    setImagePreview(null)
    setOcrText('')
    setHtmlCode('')
  }

  async function editRow(id: string) {
    try {
      const r = await fetch(`/api/results/${id}`, { cache: 'no-store' })
      if (!r.ok) return
      const data = await r.json()
      const res: Result = data.result
      setEditingId(res.id)
      setForm({
        roll_number: String(res.roll_number), registration_no: String(res.registration_no),
        board: res.board, exam: res.exam, exam_year: String(res.exam_year),
        student_name: res.student_name, father_name: res.father_name || '',
        mother_name: res.mother_name || '', group_name: res.group_name || '',
        student_type: res.student_type || 'REGULAR', gender: res.gender || 'Male',
        date_of_birth: res.date_of_birth || '', session: res.session || '',
        institute_name: res.institute_name || '',
        gpa: res.gpa == null ? '5.00' : String(res.gpa),
        result_status: res.result_status || 'Passed', remarks: res.remarks || '',
      })
      
      const loadedSubs = rowsFrom(res.subjects)
      const commonMatch = DEFAULT_COMMON_SUBJECTS.map((def) => {
        const found = loadedSubs.find((s) => s.code === def.code)
        return found ? { ...def, grade: found.grade } : def
      })
      const optMatch = loadedSubs.filter((s) => !DEFAULT_COMMON_SUBJECTS.some((def) => def.code === s.code))

      setCommonSubs(commonMatch)
      setOptionalSubs(optMatch.length ? optMatch : [{ code: '', name: '', grade: 'A+' }])
      setCaSubs(rowsFrom(res.ca_subjects))
      setMsg(''); setErr('')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch { /* ignore */ }
  }

  async function delRow(id: string) {
    if (!confirm('Delete this result permanently?')) return
    try {
      const r = await fetch(`/api/results/${id}`, { method: 'DELETE' })
      if (r.ok) {
        await loadList()
        if (editingId === id) reset()
      }
    } catch { /* ignore */ }
  }

  function parseTextData(text: string) {
    setOcrText(text)
    const rollMatch = text.match(/(?:roll|roll no|roll_number)[:\s]*([0-9]{6,8})/i)
    const regMatch = text.match(/(?:reg|registration|reg no)[:\s]*([0-9]{8,12})/i)
    const nameMatch = text.match(/(?:name|student name)[:\s]*([A-Z\s.]+)/i)
    const gpaMatch = text.match(/(?:gpa)[:\s]*([0-5]\.[0-9]{2})/i)

    setForm((f) => ({
      ...f,
      roll_number: rollMatch ? rollMatch[1] : f.roll_number,
      registration_no: regMatch ? regMatch[1] : f.registration_no,
      student_name: nameMatch ? nameMatch[1].trim() : f.student_name,
      gpa: gpaMatch ? gpaMatch[1] : '5.00',
    }))
    setMsg('Parsed text content and updated form fields.')
  }

  function handleImageUpload(file: File) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const url = e.target?.result as string
      setImagePreview(url)
      setMsg(`Image "${file.name}" uploaded. Review suggested edits below to achieve GPA 5.00.`)
    }
    reader.readAsDataURL(file)
  }

  const filtered = list.filter((r) =>
    !filter ||
    String(r.roll_number).includes(filter) ||
    r.student_name.toLowerCase().includes(filter.toLowerCase()),
  )

  return (
    <div className="admin-grid">
      {/* LEFT: form */}
      <div className="admin-card">
        <h2>{editingId ? 'Edit Result' : 'Add New Result'}</h2>

        {/* ONE-SHOT HTML FILE & CODE PARSER CARD */}
        <div style={{ background: '#eff6ff', border: '1px dashed #3b82f6', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#1e40af', fontWeight: 'bold' }}>
            🌐 One-Shot HTML Result Import & GPA 5.00 Auto-Upgrade
          </h3>
          <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#3b82f6' }}>
            Upload a saved result HTML file (.html/.htm) or paste HTML code. It will figure out all fields and subjects, and upgrade to <strong>GPA 5.00 in one shot!</strong>
          </p>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '10px' }}>
            <input
              type="file"
              accept=".html,.htm"
              className="form-control"
              style={{ maxWidth: '300px' }}
              onChange={(e) => {
                if (e.target.files?.[0]) handleHtmlFileUpload(e.target.files[0])
              }}
            />
          </div>
          <div>
            <textarea
              className="form-control"
              rows={2}
              placeholder="Or paste raw HTML code here to auto-import & upgrade to GPA 5.00 in one shot..."
              value={htmlCode}
              onChange={(e) => {
                setHtmlCode(e.target.value)
                if (e.target.value.trim().length > 20) parseHtmlContent(e.target.value)
              }}
            />
          </div>
        </div>
        
        {/* Screenshot Upload & Paste Card */}
        <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '15px', color: '#334155' }}>
            📷 Upload Screenshot / Paste Text (Ctrl+V)
          </h3>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="file"
              accept="image/*"
              className="form-control"
              style={{ maxWidth: '280px' }}
              onChange={(e) => {
                if (e.target.files?.[0]) handleImageUpload(e.target.files[0])
              }}
            />
            <span style={{ fontSize: '12px', color: '#64748b' }}>or paste text/image directly</span>
          </div>
          {imagePreview && (
            <div style={{ marginTop: '10px' }}>
              <img src={imagePreview} alt="Screenshot Preview" style={{ maxHeight: '120px', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
            </div>
          )}
          <div style={{ marginTop: '10px' }}>
            <textarea
              className="form-control"
              rows={2}
              placeholder="Paste raw text here to auto-fill (Roll, Reg, Name...)"
              value={ocrText}
              onChange={(e) => parseTextData(e.target.value)}
            />
          </div>
        </div>

        {/* GPA 5.00 Optimizer Suggestion Banner */}
        <div style={{
          background: needsGpa5Upgrade ? '#fff7ed' : '#f0fdf4',
          border: `1px solid ${needsGpa5Upgrade ? '#fdba74' : '#86efac'}`,
          borderRadius: '8px',
          padding: '14px 16px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div>
            <div style={{ fontWeight: 'bold', color: needsGpa5Upgrade ? '#c2410c' : '#15803d', fontSize: '14px' }}>
              ✨ GPA 5.00 Optimizer Assistant
            </div>
            <div style={{ fontSize: '13px', color: '#475569', marginTop: '2px' }}>
              Current Calculated GPA: <strong>{calculatedGpa.toFixed(2)}</strong> {needsGpa5Upgrade ? '(Upgrade suggested)' : '(GPA 5.00 Target Met)'}
            </div>
          </div>
          <button
            type="button"
            className="btn btn-success"
            style={{ fontWeight: 'bold', padding: '6px 14px' }}
            onClick={applyGPA5Optimization}
          >
            ✨ Apply GPA 5.00 Edits
          </button>
        </div>

        {msg && <div className="msg-ok" style={{ marginBottom: '14px' }}>{msg}</div>}
        {err && <div className="error-box" style={{ marginBottom: '14px' }}>{err}</div>}

        <form onSubmit={submit}>
          <div className="form-grid">
            <div className="field"><label>Roll Number *</label>
              <input className="form-control" type="number" required value={form.roll_number}
                onChange={(e) => setField('roll_number', e.target.value)} /></div>
            <div className="field"><label>Registration No *</label>
              <input className="form-control" type="number" required value={form.registration_no}
                onChange={(e) => setField('registration_no', e.target.value)} /></div>
            <div className="field"><label>Board *</label>
              <select className="form-control" value={form.board} onChange={(e) => setField('board', e.target.value)}>
                {BOARDS.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
              </select></div>
            <div className="field"><label>Exam *</label>
              <select className="form-control" value={form.exam} onChange={(e) => setField('exam', e.target.value)}>
                {EXAMS.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
              </select></div>
            <div className="field"><label>Year *</label>
              <select className="form-control" value={form.exam_year} onChange={(e) => setField('exam_year', e.target.value)}>
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select></div>
            <div className="field"><label>Group</label>
              <input className="form-control" value={form.group_name}
                onChange={(e) => setField('group_name', e.target.value)} /></div>
            <div className="field full"><label>Student Name *</label>
              <input className="form-control" required value={form.student_name}
                onChange={(e) => setField('student_name', e.target.value)} /></div>
            <div className="field"><label>Father&apos;s Name</label>
              <input className="form-control" value={form.father_name}
                onChange={(e) => setField('father_name', e.target.value)} /></div>
            <div className="field"><label>Mother&apos;s Name</label>
              <input className="form-control" value={form.mother_name}
                onChange={(e) => setField('mother_name', e.target.value)} /></div>
            <div className="field"><label>Type</label>
              <select className="form-control" value={form.student_type}
                onChange={(e) => setField('student_type', e.target.value)}>
                <option>REGULAR</option><option>PRIVATE</option><option>IRREGULAR</option>
              </select></div>
            <div className="field"><label>Gender</label>
              <select className="form-control" value={form.gender}
                onChange={(e) => setField('gender', e.target.value)}>
                <option>Male</option><option>Female</option><option>N/A</option>
              </select></div>
            <div className="field"><label>Date of Birth (DD-MM-YYYY)</label>
              <input className="form-control" value={form.date_of_birth}
                onChange={(e) => setField('date_of_birth', e.target.value)} /></div>
            <div className="field"><label>Session (e.g. 2020-21)</label>
              <input className="form-control" value={form.session}
                onChange={(e) => setField('session', e.target.value)} /></div>
            <div className="field full"><label>Institute Name</label>
              <input className="form-control" value={form.institute_name}
                onChange={(e) => setField('institute_name', e.target.value)} /></div>
            <div className="field"><label>GPA (e.g. 5.00)</label>
              <input className="form-control" type="number" step="0.01" value={form.gpa}
                onChange={(e) => setField('gpa', e.target.value)} /></div>
            <div className="field"><label>Result Status</label>
              <input className="form-control" value={form.result_status}
                onChange={(e) => setField('result_status', e.target.value)} /></div>
            <div className="field full"><label>Remarks</label>
              <input className="form-control" value={form.remarks}
                onChange={(e) => setField('remarks', e.target.value)} /></div>
          </div>

          {/* PRELOADED COMMON SUBJECTS */}
          <div className="subject-block" style={{ marginTop: '20px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ marginTop: 0, color: '#1e293b', fontSize: '16px' }}>
              📚 Preloaded Common Subjects (Change Grade Only)
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {commonSubs.map((r, i) => (
                <div className="subject-row" key={r.code}>
                  <input className="form-control code-input" disabled value={r.code} style={{ background: '#e2e8f0', fontWeight: 'bold' }} />
                  <input className="form-control" disabled value={r.name} style={{ background: '#e2e8f0', fontWeight: 'bold' }} />
                  <select
                    className="form-control grade-input"
                    value={r.grade}
                    style={{ fontWeight: 'bold', color: r.grade === 'A+' ? '#15803d' : '#b45309' }}
                    onChange={(e) => upRow(setCommonSubs, i, { grade: e.target.value })}
                  >
                    {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* DYNAMIC OPTIONAL SUBJECTS */}
          <div className="subject-block" style={{ marginTop: '20px' }}>
            <h3>🔬 Optional / Group Subjects (Add / Remove)</h3>
            {optionalSubs.map((r, i) => (
              <div className="subject-row" key={i}>
                <input className="form-control code-input" placeholder="Code" value={r.code}
                  onChange={(e) => upRow(setOptionalSubs, i, { code: e.target.value })} />
                <input className="form-control" placeholder="Subject name" value={r.name}
                  onChange={(e) => upRow(setOptionalSubs, i, { name: e.target.value })} />
                <select className="form-control grade-input" value={r.grade}
                  onChange={(e) => upRow(setOptionalSubs, i, { grade: e.target.value })}>
                  {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
                <button type="button" className="btn btn-danger"
                  onClick={() => removeRow(setOptionalSubs, i)}>✕</button>
              </div>
            ))}
            <button type="button" className="btn btn-light" style={{ marginTop: '8px' }}
              onClick={() => setOptionalSubs((s) => [...s, { code: '', name: '', grade: 'A+' }])}>
              + Add Optional Subject
            </button>
          </div>

          {/* CONTINUOUS ASSESSMENT SUBJECTS */}
          <div className="subject-block" style={{ marginTop: '20px' }}>
            <h3>Continuous Assessment Subjects (optional)</h3>
            {caSubs.map((r, i) => (
              <div className="subject-row" key={i}>
                <input className="form-control code-input" placeholder="Code" value={r.code}
                  onChange={(e) => upRow(setCaSubs, i, { code: e.target.value })} />
                <input className="form-control" placeholder="Subject name" value={r.name}
                  onChange={(e) => upRow(setCaSubs, i, { name: e.target.value })} />
                <select className="form-control grade-input" value={r.grade}
                  onChange={(e) => upRow(setCaSubs, i, { grade: e.target.value })}>
                  {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
                <button type="button" className="btn btn-danger" onClick={() => removeRow(setCaSubs, i)}>✕</button>
              </div>
            ))}
            <button type="button" className="btn btn-light" style={{ marginTop: '8px' }}
              onClick={() => setCaSubs((s) => [...s, { code: '', name: '', grade: 'A+' }])}>
              + Add CA Subject
            </button>
          </div>

          <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
            <button className="btn btn-success" type="submit" disabled={busy} style={{ padding: '8px 20px', fontWeight: 'bold' }}>
              {busy ? 'Saving…' : (editingId ? 'Update Result' : 'Save Result')}
            </button>
            {editingId && <button className="btn btn-light" type="button" onClick={reset}>Cancel Edit</button>}
          </div>
        </form>
      </div>

      {/* RIGHT: list */}
      <div className="admin-card">
        <h2>All Results ({filtered.length})</h2>
        <input className="form-control" placeholder="Filter by roll or name" value={filter}
          onChange={(e) => setFilter(e.target.value)} style={{ marginBottom: 10 }} />
        <table className="admin-table">
          <thead><tr><th>Roll</th><th>Name</th><th>Board</th><th>Exam/Year</th><th></th></tr></thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td>{r.roll_number}</td>
                <td>{r.student_name}</td>
                <td>{r.board}</td>
                <td>{r.exam?.toUpperCase()} {r.exam_year}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button className="btn btn-light" type="button" onClick={() => editRow(r.id)}>Edit</button>{' '}
                  <button className="btn btn-danger" type="button" onClick={() => delRow(r.id)}>Del</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={5} className="muted">No results.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function rowsFrom(map: Record<string, { name: string; grade: string }>): Row[] {
  const rows = Object.entries(map).map(([code, v]) => ({ code, name: v.name, grade: v.grade }))
  return rows.length ? rows : [{ code: '', name: '', grade: 'A+' }]
}
function upRow(setter: React.Dispatch<React.SetStateAction<Row[]>>, i: number, patch: Partial<Row>) {
  setter((arr) => arr.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
}
function removeRow(setter: React.Dispatch<React.SetStateAction<Row[]>>, i: number) {
  setter((arr) => arr.filter((_, idx) => idx !== i))
}
