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
      302967, 0, 'dhaka', 'ssc', 2026, 'JONAKI AKTER PRIONTY',
      'MD. SALIM', 'NASIMA BEGUM', 'HUMANITIES', 'REGULAR', 'Female', '26-10-2009',
      '2024-25', 'BIRULIA HIGH SCHOOL', 3.22, 'Passed', '',
      '${JSON.stringify({
        "101": { "name": "BANGLA", "grade": "B", "marks": "107" },
        "107": { "name": "ENGLISH", "grade": "A+", "marks": "85" },
        "109": { "name": "MATHEMATICS", "grade": "C", "marks": "043" },
        "127": { "name": "SCIENCE", "grade": "C", "marks": "048" },
        "134": { "name": "AGRICULTURE STUDIES", "grade": "A", "marks": "070" },
        "111": { "name": "ISLAM AND MORAL EDUCATION", "grade": "C", "marks": "047" },
        "110": { "name": "GEOGRAPHY AND ENVIRONMENT", "grade": "A+", "marks": "85" },
        "153": { "name": "HISTORY OF BANGLADESH AND WORLD CIVILIZATION", "grade": "C", "marks": "043" },
        "140": { "name": "CIVICS AND CITIZENSHIP", "grade": "C", "marks": "043" },
        "154": { "name": "INFORMATION AND COMMUNICATION TECHNOLOGY", "grade": "A", "marks": "039" }
      })}'::jsonb,
      '${JSON.stringify({
        "147": { "name": "PHYSICAL EDUCATION, HEALTH AND SPORTS", "grade": "A+", "marks": "049" },
        "156": { "name": "CAREER EDUCATION", "grade": "A+", "marks": "049" }
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
  console.log('Result for JONAKI AKTER PRIONTY updated: ENGLISH A+ (85) & GEOGRAPHY AND ENVIRONMENT A+ (85), GPA 3.22, Passed!')
  await client.end()
}

run().catch(console.error)
