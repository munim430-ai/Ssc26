'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Board, Exam, ExaminationYear } from '@/lib/types'

interface Props {
  boards: Board[]
  exams: Exam[]
  years: ExaminationYear[]
}

export default function StudentSearchForm({ boards, exams, years }: Props) {
  const router = useRouter()
  const [board, setBoard] = useState('')
  const [exam, setExam] = useState('')
  const [year, setYear] = useState('')
  const [resultType, setResultType] = useState('')
  const [roll, setRoll] = useState('')
  const [reg, setReg] = useState('')
  const [eiin, setEiin] = useState('')
  const [captchaInput, setCaptchaInput] = useState('')
  const [captchaTs, setCaptchaTs] = useState(Date.now())
  const [errorMsg, setErrorMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const showIndividual = resultType === '1' || resultType === ''
  const showInstitution = resultType === '2'
  const showActionFields = true

  const reloadCaptcha = () => {
    setCaptchaInput('')
    setCaptchaTs(Date.now())
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!board || !exam || !year || !resultType) {
      setErrorMsg('Please choose Board, Exam, Year, and Result Type first.')
      return
    }

    if (!captchaInput.trim()) {
      setErrorMsg('Please type the digits visible on the CAPTCHA image.')
      return
    }

    setLoading(true)

    try {
      // Validate CAPTCHA with server endpoint
      const capRes = await fetch('/api/captcha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer: captchaInput }),
      })
      const capData = await capRes.json()

      if (!capData.ok) {
        setLoading(false)
        setErrorMsg('Incorrect CAPTCHA value. Please try again.')
        reloadCaptcha()
        return
      }

      if (showIndividual) {
        if (!roll) {
          setLoading(false)
          setErrorMsg('Please enter Roll Number.')
          return
        }
        const params = new URLSearchParams({ board, exam, year, roll })
        if (reg) params.set('reg', reg)
        router.push(`/result?${params.toString()}`)
      } else if (showInstitution) {
        setLoading(false)
        if (!eiin) {
          setErrorMsg('Please enter EIIN Number of Institution.')
          return
        }
        setErrorMsg('Institution result search is not available in this system.')
        reloadCaptcha()
      }
    } catch {
      setLoading(false)
      setErrorMsg('Error verifying CAPTCHA. Please try again.')
      reloadCaptcha()
    }
  }

  return (
    <div className="panel panel-default">
      <div className="panel-heading">Please provide the following information to view result</div>
      <div className="panel-body">
        <div className="row">
          <div className="col-md-12">
            <form role="form" id="form" onSubmit={handleSubmit}>
              {/* Name of Board */}
              <div className="row" id="col_1">
                <div id="row_board">
                  <div className="form-group col-md-5"><label htmlFor="board">Name of Board</label></div>
                  <div className="form-group col-md-7">
                    <select id="board" name="board" className="form-control" required value={board}
                      onChange={(e) => setBoard(e.target.value)}>
                      <option value="">Select One</option>
                      {boards.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Name of Examination */}
              <div className="row" id="col_2">
                <div id="row_exam">
                  <div className="form-group col-md-5"><label htmlFor="exam">Name of Examination</label></div>
                  <div className="form-group col-md-7">
                    <select id="exam" name="exam" className="form-control" required value={exam}
                      onChange={(e) => setExam(e.target.value)}>
                      <option value="">Select One</option>
                      {exams.map((x) => <option key={x.code} value={x.code}>{x.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Year of Examination */}
              <div className="row" id="col_3">
                <div id="row_year">
                  <div className="form-group col-md-5"><label htmlFor="year">Year of Examination</label></div>
                  <div className="form-group col-md-7">
                    <select id="year" name="year" className="form-control" required value={year}
                      onChange={(e) => setYear(e.target.value)}>
                      <option value="">Select One</option>
                      {years.map((y) => <option key={y.year} value={y.year}>{y.year}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Type of Result */}
              <div className="row" id="col_4">
                <div id="row_result_type">
                  <div className="form-group col-md-5">
                    <label htmlFor="result_type"><span style={{ color: 'red' }}>Type of Result</span></label>
                  </div>
                  <div className="form-group col-md-7">
                    <select id="result_type" name="result_type" className="form-control" required value={resultType}
                      onChange={(e) => setResultType(e.target.value)}>
                      <option value="">Select One</option>
                      <option value="1">Individual/Detailed Result</option>
                      <option value="2">Institution Result</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Roll Number of Examinee */}
              <div className="row" id="col_5">
                <div id="row_roll" style={{ display: showIndividual ? '' : 'none' }}>
                  <div className="form-group col-md-5"><label htmlFor="roll">Roll Number of Examinee</label></div>
                  <div className="form-group col-md-7">
                    <input className="form-control" type="number" name="roll" id="roll"
                      required={showIndividual} value={roll}
                      onChange={(e) => setRoll(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Registration Number of Examinee */}
              <div className="row" id="col_6">
                <div id="row_reg" style={{ display: showIndividual ? '' : 'none' }}>
                  <div className="form-group col-md-5"><label htmlFor="reg">Registration Number of Examinee</label></div>
                  <div className="form-group col-md-7">
                    <input className="form-control" type="number" name="reg" id="reg"
                      value={reg} onChange={(e) => setReg(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* EIIN Number */}
              <div className="row" id="col_7">
                <div id="row_eiin" style={{ display: showInstitution ? '' : 'none' }}>
                  <div className="form-group col-md-5">
                    <label htmlFor="eiin">EIIN Number of Institution &nbsp;&nbsp;&nbsp;
                      <button type="button" className="btn btn-primary" disabled>Tree</button>&nbsp;
                      <button type="button" className="btn btn-primary" disabled>List</button>
                    </label>
                  </div>
                  <div className="form-group col-md-7">
                    <input className="form-control" type="number" name="eiin" id="eiin"
                      required={showInstitution} value={eiin}
                      onChange={(e) => setEiin(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* CAPTCHA Row */}
              <div className="row" id="col_10">
                <div id="row_captcha" style={{ display: showActionFields ? '' : 'none' }}>
                  <div className="form-group col-md-7 vcenter" style={{ marginBottom: '10px' }}>
                    <label htmlFor="captcha" style={{ display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <span>Robot Prevention Technique (CAPTCHA)</span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        id="captcha_img"
                        src={`/api/captcha?t=${captchaTs}`}
                        alt="Reload CAPTCHA"
                        style={{ height: '36px', verticalAlign: 'middle', borderRadius: '4px' }}
                      />
                      <button
                        id="captcha_reload"
                        type="button"
                        className="btn btn-md btn-danger"
                        onClick={reloadCaptcha}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <span className="glyphicon glyphicon-refresh"></span>
                        <span>Click to load another image</span>
                      </button>
                    </label>
                  </div>
                  <div className="form-group col-md-5 vcenter">
                    <input
                      className="form-control"
                      type="number"
                      name="captcha"
                      id="captcha"
                      value={captchaInput}
                      placeholder="Type the digits visible on the image"
                      required={showActionFields}
                      autoComplete="off"
                      onChange={(e) => setCaptchaInput(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div className="row" id="col_11">
                <div id="row_submit" style={{ display: showActionFields ? '' : 'none' }}>
                  <div className="form-group"><label htmlFor="submit"></label></div>
                  <div className="form-group">
                    <input className="btn btn-success center-block" type="submit" name="submit" id="submit"
                      value={loading ? 'Loading...' : 'See Results'} disabled={loading} />
                  </div>
                </div>
              </div>

              {errorMsg && (
                <div className="alert alert-danger text-center" role="alert" style={{ marginTop: '10px' }}>
                  {errorMsg}
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
