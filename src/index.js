#!/usr/bin/env node

require('dotenv').config();
const yargs = require('yargs');
const commands = require('./commands');

commands(yargs);
yargs.demandCommand().help().argv;

process.on('unhandledRejection', (e) => {
  console.log('> Unhandled promise rejection. Throwing error...');
  throw e;
});
