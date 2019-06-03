const bootstrap = require('./bootstrap');
const bootstrapv2 = require('./bootstrapv2');
const identityX = require('./identity-x');
const deploy = require('./deploy');

module.exports = (yargs) => {
  bootstrap(yargs);
  bootstrapv2(yargs);
  identityX(yargs);
  deploy(yargs);
};
