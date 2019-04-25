module.exports = (yargs) => {
  yargs.command(['bootstrap'], 'Bootstraps @endeavorb2b environment', () => {}, () => require('./bootstrap')());
};
