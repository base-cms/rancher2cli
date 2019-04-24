const async = require('async');
const r2 = require('@endeavorb2b/rancher2api');

const {
  RANCHER_URL: uri,
  RANCHER_TOKEN: token,
  RANCHER_CLUSTERID: clusterId,
} = process.env;

const { log } = console;

const getNamespaces = async (namespace) => {
  const namespaces = await r2.namespace.list({ uri, token, clusterId});
  return namespaces.filter(n => !namespace || namespace && n.id === namespace);
};

const getWorkloads = async ({ id, projectId }, key, value) => {
  const workloads = await r2.workload.list({ uri, token, projectId });
  return workloads
    .filter(({ namespaceId }) => namespaceId === id)
    .filter(w => w.labels[key] === value);
};

const upgradeService = ({ projectId, id, deploymentConfig, containers }, image) => {
  containers[0].image = image;
  return r2.workload.update({
    uri,
    token,
    projectId,
    deploymentConfig,
    workloadId: id,
    containers,
  });
};

module.exports = async ({ key, value, image, namespace }) => {
  log('Retrieving workloads...');
  const namespaces = await getNamespaces(namespace);
  async.mapLimit(namespaces, 2, async function(namespace) {
    const promised = await getWorkloads(namespace, key, value);
    const workloads = promised.reduce((arr, w) => arr.concat(w), []);
    await Promise.all(workloads.map(async w => await upgradeService(w, image)));
  });
  log('Done with upgrades.');
};
