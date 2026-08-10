'use client'
import { useEffect, useState, useCallback } from 'react'
import { GRADES } from '@/lib/grades'
import type { Result } from '@/lib/types'

type Row = { code: string; name: string; grade: string }

const EMPTY = {
  roll_number: '', registration_no: '', board: 'dhaka', exam: 'ssc',
  exam_year: String(new Date().getFullYear()),
  student_name: '', father_name: '', mother_name: '', group_name: 'SCIENCE',
  student_type: 'REGULAR', gender: 'Male', date_of_birth: '', session: '',
  institute_name: '', gpa: '', result_status: 'Passed', remarks: '',
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

type ListRow = Pick<Result, 'id' | 'roll_number' | 'student_name' | 'board' | 'exam' | 'exam_year'>

export default function AdminDashboard() {
  const [form, setForm] = useState<Record<string, string>>({ ...EMPTY })
  const [subs, setSubs] = useState<Row[]>([{ code: '', name: '', grade: 'A+' }])
  const [caSubs, setCaSubs] = useState<Row[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [list, setList] = useState<ListRow[]>([])
  const [filter, setFilter] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

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
      subjects: pack(subs),
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
      setMsg(editingId ? 'Updated.' : 'Saved.')
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
    setSubs([{ code: '', name: '', grade: 'A+' }])
    setCaSubs([])
    setEditingId(null)
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
        gpa: res.gpa == null ? '' : String(res.gpa),
        result_status: res.result_status || 'Passed', remarks: res.remarks || '',
      })
      setSubs(rowsFrom(res.subjects))
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
        {msg && <div className="msg-ok">{msg}</div>}
        {err && <div className="error-box">{err}</div>}
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

          <div className="subject-block">
            <h3>Subjects (Grade)</h3>
            {subs.map((r, i) => (
              <div className="subject-row" key={i}>
                <input className="form-control code-input" placeholder="Code" value={r.code}
                  onChange={(e) => upRow(setSubs, i, { code: e.target.value })} />
                <input className="form-control" placeholder="Subject name" value={r.name}
                  onChange={(e) => upRow(setSubs, i, { name: e.target.value })} />
                <select className="form-control grade-input" value={r.grade}
                  onChange={(e) => upRow(setSubs, i, { grade: e.target.value })}>
                  {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
                <button type="button" className="btn btn-danger"
                  onClick={() => removeRow(setSubs, i)} disabled={subs.length === 1}>✕</button>
              </div>
            ))}
            <button type="button" className="btn btn-light"
              onClick={() => setSubs((s) => [...s, { code: '', name: '', grade: 'A+' }])}>
              + Add Subject
            </button>
          </div>

          <div className="subject-block">
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
            <button type="button" className="btn btn-light"
              onClick={() => setCaSubs((s) => [...s, { code: '', name: '', grade: 'A+' }])}>
              + Add CA Subject
            </button>
          </div>

          <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
            <button className="btn btn-success" type="submit" disabled={busy}>
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
