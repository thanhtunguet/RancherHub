#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const readline = require('readline');
const { Client } = require('pg');

// Function to parse .env file
function parseEnvFile(envPath) {
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env file not found at:', envPath);
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};
  
  envContent.split('\n').forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...valueParts] = trimmedLine.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
  
  return env;
}

// Function to get database connection
async function getDatabaseConnection(env) {
  const dbType = env.DATABASE_TYPE || 'sqlite';
  
  if (dbType === 'sqlite') {
    const dbPath = path.join(__dirname, 'rancher-hub.db');
    if (!fs.existsSync(dbPath)) {
      console.error('❌ SQLite database not found at:', dbPath);
      console.log('💡 Make sure the backend has been started at least once to create the database.');
      process.exit(1);
    }
    return { type: 'sqlite', db: new sqlite3.Database(dbPath) };
  } else if (dbType === 'postgres') {
    const client = new Client({
      host: env.DATABASE_HOST || 'localhost',
      port: parseInt(env.DATABASE_PORT || '5432'),
      user: env.DATABASE_USERNAME || 'rancher_hub',
      password: env.DATABASE_PASSWORD || 'rancher_hub_password',
      database: env.DATABASE_NAME || 'rancher_hub',
      ssl: env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
    });

    try {
      await client.connect();
      console.log('✅ Connected to PostgreSQL database');
      return { type: 'postgres', db: client };
    } catch (error) {
      console.error('❌ Failed to connect to PostgreSQL:', error.message);
      console.log('💡 Please check your database configuration in .env file');
      process.exit(1);
    }
  } else {
    console.error('❌ Unsupported database type:', dbType);
    process.exit(1);
  }
}

// Function to prompt for new password
function promptPassword() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    // Hide password input
    rl.stdoutMuted = true;
    rl._writeToOutput = function _writeToOutput(stringToWrite) {
      if (rl.stdoutMuted) {
        rl.output.write("*");
      } else {
        rl.output.write(stringToWrite);
      }
    };

    rl.question('Enter new admin password: ', (password) => {
      rl.stdoutMuted = false;
      console.log(''); // New line after password input
      rl.close();
      resolve(password);
    });
  });
}

// Function to confirm password
function confirmPassword() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    // Hide password input
    rl.stdoutMuted = true;
    rl._writeToOutput = function _writeToOutput(stringToWrite) {
      if (rl.stdoutMuted) {
        rl.output.write("*");
      } else {
        rl.output.write(stringToWrite);
      }
    };

    rl.question('Confirm new admin password: ', (password) => {
      rl.stdoutMuted = false;
      console.log(''); // New line after password input
      rl.close();
      resolve(password);
    });
  });
}

// Function to hash password
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

// Function to close database connection
async function closeDatabase(dbConnection) {
  const { type, db } = dbConnection;
  
  if (type === 'sqlite') {
    db.close();
  } else if (type === 'postgres') {
    await db.end();
  }
}

// Function to reset admin password
async function resetAdminPassword(dbConnection, hashedPassword) {
  const { type, db } = dbConnection;
  
  if (type === 'sqlite') {
    return new Promise((resolve, reject) => {
      // First, check if admin user exists
      db.get("SELECT id, username FROM users WHERE username = 'admin'", (err, row) => {
        if (err) {
          reject(err);
          return;
        }

        if (!row) {
          console.error('❌ Admin user not found in database.');
          console.log('💡 Make sure the backend has been started at least once to create the default admin user.');
          db.close();
          process.exit(1);
        }

        console.log(`✅ Found admin user with ID: ${row.id}`);

        // Update the password and reset 2FA
        const updateQuery = `
          UPDATE users 
          SET password = ?, 
              twoFactorEnabled = 0, 
              twoFactorSecret = NULL,
              isFirstLogin = 1,
              updatedAt = datetime('now')
          WHERE username = 'admin'
        `;

        db.run(updateQuery, [hashedPassword], function(err) {
          if (err) {
            reject(err);
            return;
          }

          if (this.changes === 0) {
            reject(new Error('No rows were updated'));
            return;
          }

          resolve();
        });
      });
    });
  } else if (type === 'postgres') {
    try {
      // First, check if admin user exists
      const checkResult = await db.query("SELECT id, username FROM users WHERE username = 'admin'");
      
      if (checkResult.rows.length === 0) {
        console.error('❌ Admin user not found in database.');
        console.log('💡 Make sure the backend has been started at least once to create the default admin user.');
        await db.end();
        process.exit(1);
      }

      const adminUser = checkResult.rows[0];
      console.log(`✅ Found admin user with ID: ${adminUser.id}`);

      // Update the password and reset 2FA
      const updateQuery = `
        UPDATE users 
        SET password = $1, 
            "twoFactorEnabled" = false, 
            "twoFactorSecret" = null,
            "isFirstLogin" = true,
            "updatedAt" = NOW()
        WHERE username = 'admin'
      `;

      const updateResult = await db.query(updateQuery, [hashedPassword]);

      if (updateResult.rowCount === 0) {
        throw new Error('No rows were updated');
      }

      return Promise.resolve();
    } catch (error) {
      throw error;
    }
  }
}

// Main function
async function main() {
  console.log('🔧 Rancher Hub - Admin Password Reset Tool');
  console.log('==========================================\n');

  try {
    // Parse .env file
    const envPath = path.join(__dirname, '.env');
    console.log('📁 Reading configuration from .env file...');
    const env = parseEnvFile(envPath);
    
    // Get database connection
    console.log('🔗 Connecting to database...');
    const dbConnection = await getDatabaseConnection(env);

    // Get new password
    console.log('\n🔑 Please enter the new admin password:');
    const newPassword = await promptPassword();
    
    if (!newPassword || newPassword.length < 8) {
      console.error('❌ Password must be at least 8 characters long.');
      await closeDatabase(dbConnection);
      process.exit(1);
    }

    // Confirm password
    const confirmPass = await confirmPassword();
    
    if (newPassword !== confirmPass) {
      console.error('❌ Passwords do not match.');
      await closeDatabase(dbConnection);
      process.exit(1);
    }

    // Hash the password
    console.log('\n🔐 Hashing password...');
    const hashedPassword = await hashPassword(newPassword);

    // Reset the password
    console.log('💾 Updating admin password in database...');
    await resetAdminPassword(dbConnection, hashedPassword);

    // Close database connection
    await closeDatabase(dbConnection);

    console.log('\n✅ Admin password has been successfully reset!');
    console.log('📋 Summary of changes:');
    console.log('   - Password updated');
    console.log('   - 2FA disabled (can be re-enabled after login)');
    console.log('   - First login flag set (user will be prompted to change password)');
    console.log('\n💡 You can now login with:');
    console.log('   Username: admin');
    console.log('   Password: [the password you just set]');
    console.log('\n⚠️  Remember to enable 2FA after logging in for better security!');

  } catch (error) {
    console.error('\n❌ Error resetting admin password:', error.message);
    process.exit(1);
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Operation cancelled by user.');
  process.exit(0);
});

// Run the script
if (require.main === module) {
  main();
}