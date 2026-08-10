import Link from 'next/link'
import BoardHeader from '@/components/BoardHeader'
import PrintButton from '@/components/PrintButton'
import { searchStudent, getEducationBoards } from '@/lib/data'
import type { Result, SubjectEntry } from '@/lib/types'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: {
    board?: string
    exam?: string
    year?: string
    roll?: string
    reg?: string
  }
}

const EXAM_NAMES: Record<string, string> = {
  jsc: 'JSC or Equivalent',
  ssc: 'SSC or Equivalent',
  hsc: 'HSC or Equivalent',
  dibs: 'DIBS',
}

export default async function ResultPage({ searchParams }: Props) {
  const { board, exam, year, roll, reg } = searchParams

  let result: Result | null = null
  let notFound = false

  if (board && roll) {
    result = await searchStudent(
      parseInt(roll),
      board,
      exam ?? '',
      year ? parseInt(year) : undefined,
      reg ? parseInt(reg) : undefined,
    )
    if (!result) notFound = true
  } else {
    notFound = true
  }

  // Resolve board code -> display name for the summary table.
  let boardName = result?.board?.toUpperCase() ?? ''
  if (result) {
    try {
      const boards = await getEducationBoards()
      const hit = boards.find((b) => b.code === result!.board)
      if (hit) boardName = hit.name.toUpperCase()
    } catch { /* keep uppercased code */ }
  }

  const examLabel = `${EXAM_NAMES[exam ?? ''] ?? (exam?.toUpperCase() ?? '')} Examination - ${year ?? ''}`
  const regularGrades: Array<[string, SubjectEntry]> = result ? Object.entries(result.subjects) : []
  const caGrades: Array<[string, SubjectEntry]> = result ? Object.entries(result.ca_subjects) : []
  const resultText = result?.result_status
    || (result?.gpa != null ? `GPA=${result.gpa.toFixed(2)}` : 'Passed')

  return (
    <div className="container-fluid">
      <BoardHeader />
      <div id="page-wrapper">
        <div className="row">
          <div className="col-md-12">
            <div className="page-header text-center" id="page-header">
              <h3>Result of {examLabel}</h3>
            </div>
          </div>
        </div>

        <div className="row">
          <div className="row buttons" id="buttons_up">
            <div className="text-center">
              <div className="btn-group">
                <Link href="/" className="btn btn-success search-button" id="search"
                  title="Click here to search another result">
                  Search Again
                </Link>
                <PrintButton />
              </div>
            </div>
          </div>
          <br />
          <div className="col-md-12">
            <div id="result_display">
              {notFound ? (
                <div className="alert alert-danger text-center" role="alert" style={{ fontSize: '20px', fontWeight: 'bold', padding: '24px', margin: '20px 0' }}>
                  ( NO REVIEW FOUND)
                </div>
              ) : result && (
                <div className="table-container">
                  {/* Student Information Summary */}
                  <table className="table-striped">
                    <thead>
                      <tr><th colSpan={4}>Student Information Summary</th></tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Roll No</td><td>{result.roll_number}</td>
                        <td>Registration No</td>
                        <td>{result.registration_no || '[NOT SHOWN]'}</td>
                      </tr>
                      <tr><td>Name of Student</td><td colSpan={3}>{result.student_name}</td></tr>
                      {result.father_name && (
                        <tr><td>Father&apos;s Name</td><td colSpan={3}>{result.father_name}</td></tr>
                      )}
                      {result.mother_name && (
                        <tr><td>Mother&apos;s Name</td><td colSpan={3}>{result.mother_name}</td></tr>
                      )}
                      <tr>
                        <td>Board</td><td>{boardName}</td>
                        <td>Session</td><td>{result.session || 'N/A'}</td>
                      </tr>
                      <tr>
                        <td>{result.board === 'tec' ? 'Trade' : 'Group'}</td>
                        <td>{result.group_name?.toUpperCase() || 'N/A'}</td>
                        <td>Type: {result.student_type?.toUpperCase() || 'REGULAR'}</td>
                        <td>Gender: {result.gender || 'N/A'}</td>
                      </tr>
                      <tr>
                        <td>Result</td><td>{resultText}</td>
                        <td>Date of Birth</td><td>{result.date_of_birth || 'N/A'}</td>
                      </tr>
                      <tr>
                        <td>Name of Institute</td>
                        <td colSpan={3}><span id="i_name">{result.institute_name || ''}</span></td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="alert alert-info text-center" id="err_msg" style={{ display: 'none' }}></div>

                  {/* Subject-wise Grade/Marks */}
                  {regularGrades.length > 0 && (
                    <>
                      <div className="text-center"><h4>Subject-wise Grade/Marks</h4></div>
                      <table className="table-striped">
                        <thead>
                          <tr><th>Subject Code</th><th>Subject Name</th><th>Grade</th></tr>
                        </thead>
                        <tbody>
                          {regularGrades.map(([code, v]) => (
                            <tr key={code}>
                              <td className="cent-align">{code}</td>
                              <td><span className={`code_${code}`}>{v.name.toUpperCase()}</span></td>
                              <td className="cent-align">{v.grade}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="divpadding"></div>
                    </>
                  )}

                  {/* Continuous Assessment */}
                  {caGrades.length > 0 && (
                    <>
                      <div className="text-center">
                        <h4>Subject-wise Grade/Marks for Continuous Assessment</h4>
                      </div>
                      <table className="table-striped">
                        <thead>
                          <tr><th>Subject Code</th><th>Subject Name</th><th>Grade</th></tr>
                        </thead>
                        <tbody>
                          {caGrades.map(([code, v]) => (
                            <tr key={code}>
                              <td className="cent-align">{code}</td>
                              <td><span className={`code_${code}`}>{v.name.toUpperCase()}</span></td>
                              <td className="cent-align">{v.grade}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="divpadding"></div>
                    </>
                  )}

                  {/* Remarks */}
                  {result.remarks && (
                    <div className="alert alert-info text-center" role="alert">
                      {result.remarks}
                    </div>
                  )}

                  {/* Under Review Notice */}
                  <div style={{ color: 'red', fontWeight: 'bold', fontSize: '22px', textAlign: 'center', marginTop: '30px', marginBottom: '20px', letterSpacing: '1px' }}>
                    ( UNDER REVIEW)
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="row buttons" id="buttons_down"><br /></div>
          <br />
        </div>
      </div>
      <div id="dev_info">
        <p>Powered by <i>Inter-Education Board Coordination Committee</i></p>
        <p>Result Information Maintenance and Update: <i>Respective Board</i></p>
        <p>© All rights reserved</p>
      </div>
    </div>
  )
}
