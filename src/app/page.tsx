import BoardHeader from '@/components/BoardHeader'
import StudentSearchForm from '@/components/StudentSearchForm'
import {
  getEducationBoards,
  getExaminations,
  getExaminationYears,
} from '@/lib/data'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [boards, exams, years] = await Promise.all([
    getEducationBoards(),
    getExaminations(),
    getExaminationYears(),
  ])

  return (
    <div className="container-fluid">
      <BoardHeader />
      <div id="page-wrapper">
        <div className="row">
          <div className="col-md-12">
            <div className="page-header text-center" id="page-header"></div>
          </div>
        </div>

        <div className="row">
          <div className="row buttons" id="buttons_up" style={{ display: 'none' }}></div>
          <br />
          <div className="col-md-12">
            <div id="result_display"></div>
            <StudentSearchForm boards={boards} exams={exams} years={years} />
          </div>
          <div className="row buttons" id="buttons_down" style={{ display: 'none' }}>
            <br />
          </div>
          <br />
        </div>
      </div>
      <div id="dev_info">
        <p>
          Powered by <i>Inter-Education Board Coordination Committee</i>
        </p>
        <p>
          Result Information Maintenance and Update: <i>Respective Board</i>
        </p>
        <p>© All rights reserved</p>
      </div>
    </div>
  )
}
