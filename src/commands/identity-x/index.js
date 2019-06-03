module.exports = (yargs) => {
  yargs.command(['idx'], 'Bootstraps @base-cms/identity-x environment', () => {}, () => require('./bootstrap')());
};
