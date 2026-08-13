const { Client } = require('pg')

const client = new Client({
  user: 'postgres.evpepimbliuuyuugdxwq',
  password: '9hc00ZZ633!',
  host: 'aws-0-ap-southeast-2.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
})

async function run() {
  await client.connect()
  console.log('Connected to Supabase DB.')

  const sql = `
    INSERT INTO results (
      roll_number, registration_no, board, exam, exam_year, student_name,
      father_name, mother_name, group_name, student_type, gender, date_of_birth,
      session, institute_name, gpa, result_status, remarks, subjects, ca_subjects
    ) VALUES (
      536471, 0, 'dhaka', 'ssc', 2026, 'SIYAM',
      'ABDUL LATIF', 'SUMI BEGUM', 'BUSINESS STUDIES', 'REGULAR', 'Male', '28-06-2008',
      '2024-25', 'GARAMARA GOHAILBARI SABUJ SENA HIGH SCHOOL', 3.11, 'Passed', '',
      '${JSON.stringify({
        "101": { "name": "BANGLA", "grade": "C", "marks": "098" },
        "107": { "name": "ENGLISH", "grade": "A+", "marks": "89" },
        "109": { "name": "MATHEMATICS", "grade": "D", "marks": "038" },
        "127": { "name": "SCIENCE", "grade": "B", "marks": "057" },
        "134": { "name": "AGRICULTURE STUDIES", "grade": "A", "marks": "073" },
        "111": { "name": "ISLAM AND MORAL EDUCATION", "grade": "C", "marks": "044" },
        "152": { "name": "FINANCE AND BANKING", "grade": "D", "marks": "038" },
        "146": { "name": "ACCOUNTING", "grade": "A+", "marks": "87" },
        "143": { "name": "BUSINESS ENTREPRENEURSHIP", "grade": "B", "marks": "053" },
        "154": { "name": "INFORMATION AND COMMUNICATION TECHNOLOGY", "grade": "A", "marks": "035" }
      })}'::jsonb,
      '${JSON.stringify({
        "147": { "name": "PHYSICAL EDUCATION, HEALTH AND SPORTS", "grade": "A+", "marks": "050" },
        "156": { "name": "CAREER EDUCATION", "grade": "A+", "marks": "050" }
      })}'::jsonb
    )
    ON CONFLICT (board, roll_number, registration_no) DO UPDATE SET
      student_name = EXCLUDED.student_name,
      father_name = EXCLUDED.father_name,
      mother_name = EXCLUDED.mother_name,
      group_name = EXCLUDED.group_name,
      student_type = EXCLUDED.student_type,
      gender = EXCLUDED.gender,
      date_of_birth = EXCLUDED.date_of_birth,
      session = EXCLUDED.session,
      institute_name = EXCLUDED.institute_name,
      gpa = EXCLUDED.gpa,
      result_status = EXCLUDED.result_status,
      remarks = EXCLUDED.remarks,
      subjects = EXCLUDED.subjects,
      ca_subjects = EXCLUDED.ca_subjects,
      updated_at = NOW();
  `

  await client.query(sql)
  console.log('Result for SIYAM updated: ENGLISH A+ (89 marks), ACCOUNTING A+ (87 marks), GPA 3.11, Passed!')
  await client.end()
}

run().catch(console.error)
