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
      180124, 0, 'dhaka', 'ssc', 2026, 'ASRUVA AROBE',
      'MD. AFAZ UDDIN', 'SHAHANAJ PARVIN', 'SCIENCE', 'IRREGULAR', 'Female', '27-12-2009',
      '2023-24', 'KISHORGONJ GIRLS'' HIGH SCHOOL', 3.89, 'Passed', '',
      '${JSON.stringify({
        "101": { "name": "BANGLA", "grade": "A-", "marks": "129" },
        "107": { "name": "ENGLISH", "grade": "B", "marks": "111" },
        "109": { "name": "MATHEMATICS", "grade": "A+", "marks": "86" },
        "150": { "name": "BANGLADESH AND GLOBAL STUDIES", "grade": "A", "marks": "075" },
        "126": { "name": "HIGHER MATHEMATICS", "grade": "B", "marks": "051" },
        "111": { "name": "ISLAM AND MORAL EDUCATION", "grade": "A", "marks": "078" },
        "136": { "name": "PHYSICS", "grade": "B", "marks": "053" },
        "137": { "name": "CHEMISTRY", "grade": "A", "marks": "076" },
        "138": { "name": "BIOLOGY", "grade": "A-", "marks": "068" },
        "154": { "name": "INFORMATION AND COMMUNICATION TECHNOLOGY", "grade": "A", "marks": "038" }
      })}'::jsonb,
      '${JSON.stringify({
        "147": { "name": "PHYSICAL EDUCATION, HEALTH AND SPORTS", "grade": "A+", "marks": "100" },
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
  console.log('Result for ASRUVA AROBE updated with exact original marks and Mathematics A+ (86 marks)!')
  await client.end()
}

run().catch(console.error)
