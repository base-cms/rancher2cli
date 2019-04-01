const labels = require('./labels');

module.exports = (yargs) => {
  yargs.command(['deploy-by-labels <key> <value> <image>', 'deploy', 'dl'], 'Update workload images by a key-value pair', y => y
    .positional('key', { type: 'string' })
    .positional('value', { type: 'string' })
    .positional('image', { type: 'string', describe: 'The image to deploy, e.g "busybox:latest"' })
    .option('namespace', { type: 'string', describe: 'Namespace to include' }),
  labels);
};
