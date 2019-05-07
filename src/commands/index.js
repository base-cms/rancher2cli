const bootstrap = require('./bootstrap');
const bootstrapv2 = require('./bootstrapv2');
const deploy = require('./deploy');

module.exports = (yargs) => {
  bootstrap(yargs);
  bootstrapv2(yargs);
  deploy(yargs);
};
