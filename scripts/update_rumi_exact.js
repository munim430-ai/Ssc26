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
      180365, 0, 'comilla', 'ssc', 2026, 'ISRAT JAHAN RUMI',
      'MD. KHALILUR RAHAMAN', 'RRUKSHANA', 'SCIENCE', 'REGULAR', 'Female', 'N/A',
      '2024-25', 'BADOR PUR AKBAR ALI HIGH SCHOOL', 3.83, 'Passed', '',
      '${JSON.stringify({
        "101": { "name": "BANGLA", "grade": "A-", "marks": "129" },
        "107": { "name": "ENGLISH", "grade": "A-", "marks": "120" },
        "109": { "name": "MATHEMATICS", "grade": "D", "marks": "037" },
        "150": { "name": "BANGLADESH AND GLOBAL STUDIES", "grade": "A", "marks": "078" },
        "126": { "name": "HIGHER MATHEMATICS", "grade": "B", "marks": "058" },
        "111": { "name": "ISLAM AND MORAL EDUCATION", "grade": "A+", "marks": "086" },
        "136": { "name": "PHYSICS", "grade": "A-", "marks": "068" },
        "137": { "name": "CHEMISTRY", "grade": "A+", "marks": "85" },
        "138": { "name": "BIOLOGY", "grade": "A", "marks": "073" },
        "154": { "name": "INFORMATION AND COMMUNICATION TECHNOLOGY", "grade": "A", "marks": "036" }
      })}'::jsonb,
      '${JSON.stringify({
        "147": { "name": "PHYSICAL EDUCATION, HEALTH AND SPORTS", "grade": "A+", "marks": "048" },
        "156": { "name": "CAREER EDUCATION", "grade": "A+", "marks": "048" }
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
  console.log('Result for ISRAT JAHAN RUMI updated with exact marks and Chemistry A+ (85 marks)!')
  await client.end()
}

run().catch(console.error)
