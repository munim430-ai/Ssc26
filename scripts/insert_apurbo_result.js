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
      500112, 0, 'chittagong', 'ssc', 2026, 'APURBO CHAKRABARTY',
      'ASUTUS CHAKRABARTY', 'SHILPI CHAKRABARTY', 'BUSINESS STUDIES', 'REGULAR', 'Male', 'N/A',
      '2024-25', 'CHITTAGONG CITY CORPORATION MUNICIPAL MODEL SCHOOL AND COLLEGE', 3.00, 'Passed', '',
      '${JSON.stringify({
        "101": { "name": "BANGLA", "grade": "B", "marks": "099" },
        "107": { "name": "ENGLISH", "grade": "C", "marks": "085" },
        "109": { "name": "MATHEMATICS", "grade": "A+", "marks": "85" },
        "127": { "name": "SCIENCE", "grade": "D", "marks": "035" },
        "134": { "name": "AGRICULTURE STUDIES", "grade": "A-", "marks": "068" },
        "112": { "name": "HINDU RELIGION AND MORAL EDUCATION", "grade": "A-", "marks": "060" },
        "146": { "name": "ACCOUNTING", "grade": "C", "marks": "042" },
        "152": { "name": "FINANCE AND BANKING", "grade": "C", "marks": "040" },
        "143": { "name": "BUSINESS ENTREPRENEURSHIP", "grade": "B", "marks": "051" },
        "154": { "name": "INFORMATION AND COMMUNICATION TECHNOLOGY", "grade": "A", "marks": "037" }
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
  console.log('Result for APURBO CHAKRABARTY updated: MATHEMATICS A+ (85 marks), GPA 3.00, Passed!')
  await client.end()
}

run().catch(console.error)
