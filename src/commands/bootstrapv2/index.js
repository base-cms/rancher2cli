module.exports = (yargs) => {
  yargs.command(['v2'], 'Bootstraps @endeavorb2b environment', () => {}, () => require('./bootstrap')());
};
