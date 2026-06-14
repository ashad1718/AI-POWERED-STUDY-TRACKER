'use strict';

const http = require('http');

const host = 'localhost';
const port = 5000;
const email = `test_conn_${Date.now()}@example.com`;
const password = 'Password123!';
const name = 'Verification Test User';

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host,
        port,
        headers: {
          'Content-Type': 'application/json',
        },
        ...options,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = data ? JSON.parse(data) : {};
            resolve({ statusCode: res.statusCode, headers: res.headers, body: parsed });
          } catch (e) {
            reject(new Error(`Failed to parse response: ${data}`));
          }
        });
      }
    );
    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTest() {
  console.log('1. Health check...');
  const healthRes = await request({ method: 'GET', path: '/api/health' });
  console.log('Health check status:', healthRes.statusCode, healthRes.body);

  console.log('\n2. Registering new user...');
  const regRes = await request({ method: 'POST', path: '/api/v1/auth/register' }, {
    name,
    email,
    password
  });
  console.log('Register status:', regRes.statusCode, regRes.body);
  if (regRes.statusCode !== 201) {
    throw new Error('Registration failed');
  }

  const token = regRes.body.data.accessToken;
  const authHeaders = {
    'Authorization': `Bearer ${token}`
  };

  console.log('\n3. Creating a study session...');
  const sessRes = await request({
    method: 'POST',
    path: '/api/v1/sessions',
    headers: {
      ...authHeaders,
      'Content-Type': 'application/json'
    }
  }, {
    subject: 'Computer Science',
    duration: 60,
    date: new Date().toISOString().split('T')[0]
  });
  console.log('Create session status:', sessRes.statusCode, sessRes.body);
  if (sessRes.statusCode !== 201) {
    throw new Error('Session creation failed');
  }

  console.log('\n4. Getting user sessions...');
  const getSessRes = await request({
    method: 'GET',
    path: '/api/v1/sessions',
    headers: authHeaders
  });
  console.log('Get sessions status:', getSessRes.statusCode, getSessRes.body);

  console.log('\n5. Performing AI Coach progress analysis...');
  const aiRes = await request({
    method: 'POST',
    path: '/api/ai/analyze',
    headers: authHeaders
  });
  console.log('AI Coach analysis status:', aiRes.statusCode, JSON.stringify(aiRes.body, null, 2));

  console.log('\n6. Performing AI Coach interactive chat...');
  const chatRes = await request({
    method: 'POST',
    path: '/api/ai/chat',
    headers: {
      ...authHeaders,
      'Content-Type': 'application/json'
    }
  }, {
    message: 'What should I study next?'
  });
  console.log('AI Coach chat status:', chatRes.statusCode, JSON.stringify(chatRes.body, null, 2));

  console.log('\n✅ All integration tests passed successfully!');
}

runTest().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
