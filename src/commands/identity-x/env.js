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
  ENGINE_API_KEY: nonemptystr({ desc: 'The Apollo Engine API Key' }),
  GRAPHQL_VERSION: nonemptystr({ desc: 'The service workload version to deploy', default: '0.2.0' }),
  MANAGE_VERSION: nonemptystr({ desc: 'The service workload version to deploy', default: '0.2.0' }),
  MONGO_DSN: nonemptystr({ desc: 'The MongoDB DSN for the Fortnight replicaset.' }),
  NEW_RELIC_LICENSE_KEY: nonemptystr({ desc: 'The NewRelic APM License Key' }),
  RANCHER_CLUSTERID: nonemptystr({ desc: 'The Rancher2 API cluster identifier', default: 'c-rc5kp' }),
  RANCHER_TOKEN: nonemptystr({ desc: 'The Rancher2 API token' }),
  RANCHER_URL: nonemptystr({ desc: 'The Rancher2 API URL' }),
  SENDGRID_API_KEY: nonemptystr({ desc: 'The Sendgrid api key' }),
  SERVICE_VERSION: nonemptystr({ desc: 'The service workload version to deploy', default: '0.2.0' }),
  TOKEN_SECRET: nonemptystr({ desc: 'The token service\'s secret key' }),
});
