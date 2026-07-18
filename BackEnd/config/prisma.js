'use strict';

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Configure connection pool and driver adapter for Prisma v7 compatibility
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // neon ssl mode setup
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * toPublicJSON
 * Returns a safe public representation of the User record.
 */
const toPublicJSON = (user) => {
  if (!user) return null;
  return {
    id:               user.id,
    name:             user.name,
    email:            user.email,
    location:         user.location || '',
    avatarUrl:        user.avatarUrl || '',
    twoFactorEnabled: user.twoFactorEnabled || false,
    createdAt:        user.createdAt,
  };
};

/**
 * comparePassword
 * Compares a candidate password against the hashed password.
 */
const comparePassword = async (candidatePassword, hashedPassword) => {
  if (!candidatePassword || !hashedPassword) return false;
  return bcrypt.compare(candidatePassword, hashedPassword);
};

/**
 * hashPassword
 * Hashes a plain text password.
 */
const hashPassword = async (password) => {
  return bcrypt.hash(password, 12);
};

module.exports = {
  prisma,
  toPublicJSON,
  comparePassword,
  hashPassword,
};
