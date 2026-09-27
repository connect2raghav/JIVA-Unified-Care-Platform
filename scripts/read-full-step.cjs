const fs = require('fs');
const readline = require('readline');

const filePath = 'C:\\Users\\LENOVO\\.gemini\\antigravity-ide\\brain\\06e94bca-3632-477e-aed7-2dee6cd68e7a\\.system_generated\\logs\\transcript_full.jsonl';

async function run() {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (line.includes('"step_index":230')) {
      const obj = JSON.parse(line);
      const outPath = 'C:\\Users\\LENOVO\\.gemini\\antigravity-ide\\brain\\06e94bca-3632-477e-aed7-2dee6cd68e7a\\subagent_full_report.txt';
      fs.writeFileSync(outPath, obj.content, 'utf8');
      console.log('Successfully wrote full subagent output to subagent_full_report.txt');
      break;
    }
  }
}

run();
