const { makeValidator, cleanEnv } = require('envalid');
const nonemptystr = makeValidator((v) => {
  const err = new Error('Expected a non-empty string');
  if (v === undefined || v === null || v === '') {
    throw err;
  }
  const trimmed = String(v).trim();
  if (!trimmed) throw err;
  return trimmed;
});

module.exports = cleanEnv(process.env, {
  RANCHER_URL: nonemptystr({ desc: 'The Rancher2 API URL' }),
  RANCHER_TOKEN: nonemptystr({ desc: 'The Rancher2 API token' }),
  RANCHER_CLUSTERID: nonemptystr({ desc: 'The Rancher2 API cluster identifier' }),
  NEW_RELIC_LICENSE_KEY: nonemptystr({ desc: 'The NewRelic APM License Key' }),
  RS_CAPRICA: nonemptystr({ desc: 'The MongoDB DSN for the Caprica replicaset.' }),
  RS_PICON: nonemptystr({ desc: 'The MongoDB DSN for the Picon replicaset.' }),
  RS_AERILON: nonemptystr({ desc: 'The MongoDB DSN for the Aerilon replicaset.' }),
  WEBSITE_VERSION: nonemptystr({ desc: 'The website workload version to deploy', default: '0.5.2' }),
  GRAPHQL_VERSION: nonemptystr({ desc: 'The graphql workload version to deploy', default: '0.8.2' }),
  SITEMAP_VERSION: nonemptystr({ desc: 'The sitemap workload version to deploy', default: '0.8.0' }),
  RSS_VERSION: nonemptystr({ desc: 'The rss workload version to deploy', default: '0.8.0' }),
});
