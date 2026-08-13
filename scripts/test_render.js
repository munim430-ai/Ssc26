import { searchStudent } from '../src/lib/data.ts';

async function test() {
  const board = 'dhaka';
  const exam = 'ssc';
  const year = '2026';
  const roll = '536471';
  const reg = ''; // empty string as sent by form when not provided

  const cleanRoll = parseInt(String(roll).replace(/[^0-9]/g, ''), 10);
  const cleanReg = reg ? parseInt(String(reg).replace(/[^0-9]/g, ''), 10) : undefined;
  const cleanYear = year ? parseInt(String(year).replace(/[^0-9]/g, ''), 10) : undefined;

  console.log('Parameters parsed:', { cleanRoll, board, exam, cleanYear, cleanReg });

  const result = await searchStudent(
    cleanRoll,
    board.trim(),
    exam ? exam.trim() : undefined,
    !isNaN(cleanYear || NaN) ? cleanYear : undefined,
    !isNaN(cleanReg || NaN) ? cleanReg : undefined,
  );

  console.log('Result found:', result ? { id: result.id, name: result.student_name, board: result.board } : 'null');
}

test().catch(console.error);
