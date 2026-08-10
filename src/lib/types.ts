export type SubjectEntry = { name: string; grade: string }
export type SubjectMap = Record<string, SubjectEntry> // keyed by subject code (string)

export type Result = {
  id: string
  roll_number: number
  registration_no: number
  board: string
  exam: string
  exam_year: number
  student_name: string
  father_name: string | null
  mother_name: string | null
  group_name: string | null
  student_type: string | null
  gender: string | null
  date_of_birth: string | null
  session: string | null
  institute_name: string | null
  gpa: number | null
  result_status: string | null
  remarks: string | null
  subjects: SubjectMap
  ca_subjects: SubjectMap
  created_at: string
  updated_at: string
}

// Payload the admin form sends (no id/timestamps)
export type ResultInput = Omit<Result, 'id' | 'created_at' | 'updated_at'>

// Reference tables
export type Board = { code: string; name: string }
export type Exam = { code: string; name: string }
export type ExaminationYear = { year: number }
