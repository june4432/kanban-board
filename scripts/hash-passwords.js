const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const usersFilePath = path.join(__dirname, '../data/users.json');

async function hashPasswords() {
  try {
    const fileContent = fs.readFileSync(usersFilePath, 'utf-8');
    const data = JSON.parse(fileContent);
    const users = data.users || [];

    console.log('Hashing passwords for users...');

    for (const user of users) {
      // 이미 해시된 비밀번호인지 확인 (bcrypt 해시는 $2a$, $2b$, $2y$로 시작)
      if (user.password && !user.password.startsWith('$2')) {
        const plainPassword = user.password;
        const hashedPassword = await bcrypt.hash(plainPassword, 12);
        user.password = hashedPassword;
        console.log(`✓ Hashed password for ${user.email} (was: "${plainPassword}")`);
      } else {
        console.log(`- Skipped ${user.email} (already hashed)`);
      }
    }

    fs.writeFileSync(usersFilePath, JSON.stringify(data, null, 2));
    console.log('\n✅ All passwords hashed successfully!');
  } catch (error) {
    console.error('Error:', error);
  }
}

hashPasswords();
