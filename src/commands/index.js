const bootstrap = require('./bootstrap');
const deploy = require('./deploy');

module.exports = (yargs) => {
  bootstrap(yargs);
  deploy(yargs);
};
