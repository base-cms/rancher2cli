const bootstrap = require('./bootstrap');

module.exports = (yargs) => {
  yargs.command(['bootstrap'], 'Bootstraps environment', () => {}, bootstrap);
};
